# Room Management System (Next.js + Supabase + Tailwind + Radix UI)

Multi-property dashboard to manage properties, room categories, rooms, and bookings. Uses Supabase for auth and data, Tailwind CSS, Radix UI primitives, and is Vercel-ready.

## Quick start

1) Install dependencies
```bash
npm install
```

2) Environment variables  
Copy `env.example` to `.env.local` and fill in your Supabase values:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3) Supabase schema  
Run `supabase/schema.sql` in your Supabase SQL editor to create tables and RLS policies.

4) Local dev
```bash
npm run dev
# visit http://localhost:3000
```

5) Auth  
Use Supabase email/password auth. Create an account from the UI (sign-up) or via Supabase Auth.

## Deploying to Vercel

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.  
- Build command: `npm run build` (default).  
- Vercel will automatically use the App Router output for deployment.

## Features

- Supabase-authenticated dashboard
- Multi-property support (add/remove and set active)
- Room categories (add/edit/delete, base rate, capacity)
- Rooms (add/edit/delete, category assignment, status)
- Bookings (create/edit/delete, status changes, room assignment)
- Tailwind CSS + Radix UI dialogs/selects
