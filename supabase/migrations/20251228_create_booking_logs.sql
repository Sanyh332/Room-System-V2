-- Create booking_logs table
create table if not exists public.booking_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid, -- Can be null if booking is deleted, or we can keep the ID for reference
  property_id uuid references public.properties(id) on delete cascade,
  action text not null check (action in ('create', 'delete', 'update')),
  performed_by uuid references public.user_profiles(id) on delete set null,
  performed_at timestamptz default now(),
  details jsonb, -- Stores snapshot of booking data (guest name, dates, room, etc.)
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.booking_logs enable row level security;

-- Policies
drop policy if exists "Approved users can read booking logs" on public.booking_logs;
create policy "Approved users can read booking logs"
  on public.booking_logs for select
  using (auth.uid() is not null);

drop policy if exists "Approved users can insert booking logs" on public.booking_logs;
create policy "Approved users can insert booking logs"
  on public.booking_logs for insert
  with check (auth.uid() is not null);

-- Index for performance
create index if not exists idx_booking_logs_property on public.booking_logs(property_id);
create index if not exists idx_booking_logs_performed_at on public.booking_logs(performed_at);
