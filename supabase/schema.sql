create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- User profiles (role + approval gating)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- Properties (one owner to many properties)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text unique,
  address text,
  timezone text default 'UTC',
  created_at timestamptz default now()
);

-- Room categories (rate plans)
create table if not exists public.room_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null,
  description text,
  base_rate numeric(10, 2),
  capacity int default 1,
  created_at timestamptz default now()
);

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid references public.room_categories(id) on delete set null,
  number text not null,
  floor text,
  status text not null default 'available' check (status in ('available', 'occupied', 'dirty', 'out_of_service')),
  notes text,
  created_at timestamptz default now(),
  unique (property_id, number)
);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  guest_name text not null,
  guest_email text,
  guest_passport text,
  second_guest_name text,
  second_guest_email text,
  second_guest_passport text,
  check_in date not null,
  check_out date not null,
  status text not null default 'reserved' check (status in ('tentative', 'reserved', 'checked_in', 'checked_out', 'cancelled')),
  auto_release_at timestamptz,
  adults int default 1,
  children int default 0,
  total numeric(10, 2),
  reference_code text default upper(substr(md5((random())::text), 1, 6)),
  notes text,
  created_at timestamptz default now(),
  constraint check_dates check (check_out > check_in)
);

-- Ensure new guest detail columns exist when reapplying this script
alter table if exists public.bookings
  add column if not exists guest_passport text,
  add column if not exists second_guest_name text,
  add column if not exists second_guest_email text,
  add column if not exists second_guest_passport text;

-- Add created_by column to track who created the booking
alter table if exists public.bookings
  add column if not exists created_by uuid references public.user_profiles(id) on delete set null;

-- Add index for performance
create index if not exists idx_bookings_created_by on public.bookings(created_by);

-- Function to release expired tentative bookings
create or replace function public.release_expired_holds()
returns void
language plpgsql
security definer
as $$
begin
  update public.bookings
  set status = 'cancelled'
  where status = 'tentative'
    and auto_release_at < now();
end;
$$;

-- Indexes for frequent booking queries
create index if not exists idx_bookings_property_dates
  on public.bookings (property_id, check_in, check_out);

create index if not exists idx_bookings_property_status_checkin
  on public.bookings (property_id, status, check_in);

create index if not exists idx_bookings_room_dates
  on public.bookings (room_id, check_in, check_out);

-- Text search helpers for booking lookups
create index if not exists idx_bookings_guest_name on public.bookings(guest_name);
create index if not exists idx_bookings_guest_email on public.bookings(guest_email);
create index if not exists idx_bookings_guest_passport on public.bookings(guest_passport);
create index if not exists idx_bookings_second_guest_name on public.bookings(second_guest_name);
create index if not exists idx_bookings_second_guest_email on public.bookings(second_guest_email);
create index if not exists idx_bookings_second_guest_passport on public.bookings(second_guest_passport);
create index if not exists idx_bookings_reference_code on public.bookings(reference_code);

-- RLS policies (shared across approved users)
alter table public.user_profiles enable row level security;
alter table public.properties enable row level security;
alter table public.room_categories enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;

-- Drop existing policies to avoid conflicts when re-running this script
drop policy if exists "Owners can read properties" on public.properties;
drop policy if exists "Owners can insert properties" on public.properties;
drop policy if exists "Owners can update properties" on public.properties;
drop policy if exists "Owners can delete properties" on public.properties;
drop policy if exists "Owners manage categories" on public.room_categories;
drop policy if exists "Owners manage rooms" on public.rooms;
drop policy if exists "Owners manage bookings" on public.bookings;
drop policy if exists "Users read own profile" on public.user_profiles;
drop policy if exists "Users insert own profile" on public.user_profiles;
drop policy if exists "Users update own profile while pending" on public.user_profiles;
drop policy if exists "Bootstrap self-approve when no admins" on public.user_profiles;
drop policy if exists "Admins manage profiles" on public.user_profiles;

-- Helper functions for role/approval checks
create or replace function public.is_user_approved(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Approval is no longer required; any authenticated user is treated as approved.
  select true;
$$;

create or replace function public.is_user_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    where up.id = uid
      and up.role = 'admin'
  );
$$;

create or replace function public.property_is_owned(target_property uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = target_property
  );
$$;

-- First user becomes admin + approved automatically
create or replace function public.set_initial_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_profiles where role = 'admin') then
    new.role := 'admin';
    new.status := 'approved';
  end if;
  return new;
end;
$$;

drop trigger if exists set_initial_admin on public.user_profiles;
create trigger set_initial_admin
before insert on public.user_profiles
for each row
execute function public.set_initial_admin();

-- Auto-create user profile whenever an auth user is created
drop trigger if exists handle_new_auth_user on auth.users;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim((new.raw_user_meta_data->>'display_name')), ''),
      nullif(trim((new.raw_user_meta_data->>'full_name')), ''),
      split_part(new.email, '@', 1),
      'User'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger handle_new_auth_user
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- User profile policies
create policy "Users read own profile"
  on public.user_profiles for select
  using (id = auth.uid());

-- Allow reading display_name for all authenticated users (needed for booking creator display)
create policy "Authenticated users can read display names"
  on public.user_profiles for select
  using (auth.uid() is not null);

create policy "Users insert own profile"
  on public.user_profiles for insert
  with check (id = auth.uid());

create policy "Users update own profile while pending"
  on public.user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Bootstrap: if there are no approved admins yet, allow a user to self-approve
create policy "Bootstrap self-approve when no admins"
  on public.user_profiles for update
  using (
    id = auth.uid()
    and not exists (
      select 1 from public.user_profiles up
      where up.role = 'admin' and up.status = 'approved'
    )
  )
  with check (
    id = auth.uid()
    and not exists (
      select 1 from public.user_profiles up
      where up.role = 'admin' and up.status = 'approved'
    )
  );

create policy "Admins manage profiles"
  on public.user_profiles for all
  using (public.is_user_admin(auth.uid()))
  with check (public.is_user_admin(auth.uid()));

-- Properties
create policy "Approved users can read properties"
  on public.properties for select
  using (auth.uid() is not null);

create policy "Approved users can insert properties"
  on public.properties for insert
  with check (auth.uid() is not null);

create policy "Approved users can update properties"
  on public.properties for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "Approved users can delete properties"
  on public.properties for delete
  using (auth.uid() is not null);

-- Room categories
create policy "Approved users manage categories"
  on public.room_categories
  for all
  using (property_is_owned(property_id))
  with check (property_is_owned(property_id));

-- Rooms
create policy "Approved users manage rooms"
  on public.rooms
  for all
  using (property_is_owned(property_id))
  with check (property_is_owned(property_id));

-- Bookings
create policy "Approved users manage bookings"
  on public.bookings
  for all
  using (property_is_owned(property_id))
  with check (property_is_owned(property_id));

-- Helpful indexes
create index if not exists idx_user_profiles_status on public.user_profiles(status);
create index if not exists idx_user_profiles_role on public.user_profiles(role);
create index if not exists idx_room_categories_property on public.room_categories(property_id);
create index if not exists idx_rooms_property on public.rooms(property_id);
create index if not exists idx_bookings_property_dates on public.bookings(property_id, check_in, check_out);

