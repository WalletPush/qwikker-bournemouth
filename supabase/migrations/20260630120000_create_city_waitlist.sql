-- City "Coming Soon" waitlist capture.
--
-- Visitors to a city that is in coming-soon mode can leave their email so the
-- franchise can notify them at launch. Multi-tenant: every row is stamped with
-- the city, so franchises only ever see their own list. Writes go through the
-- service-role server action (`joinWaitlist`); RLS stays locked for anon.

create table if not exists public.city_waitlist (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  email text not null,
  source text not null default 'coming_soon',
  created_at timestamptz not null default now(),
  -- Stamped when the launch email is sent so each person is notified only once.
  notified_at timestamptz,
  unique (city, email)
);

create index if not exists city_waitlist_city_idx on public.city_waitlist (city);
create index if not exists city_waitlist_created_at_idx on public.city_waitlist (created_at desc);

alter table public.city_waitlist enable row level security;

-- No anon/public policies: inserts and reads are performed by the service role
-- (server actions / admin tooling), which bypasses RLS. This keeps each city's
-- list private by default.
