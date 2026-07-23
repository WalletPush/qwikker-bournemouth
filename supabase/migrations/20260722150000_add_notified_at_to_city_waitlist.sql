-- Fix: add missing notified_at column to public.city_waitlist.
--
-- Purpose: The original create migration (20260630120000_create_city_waitlist.sql)
-- used `create table if not exists`. On environments where an earlier version of
-- the table already existed, that guard made the migration a no-op and the
-- `notified_at` column was never added. Admin/HQ tooling that reads or stamps
-- notifications (app/api/admin/waitlist/route.ts, app/api/hq/city-requests/notify)
-- then fails with: column city_waitlist.notified_at does not exist.
--
-- This migration is additive and idempotent — safe to run on any environment,
-- including ones where the column already exists.
--
-- Affected table: public.city_waitlist
-- Affected column: notified_at (timestamptz, nullable) — stamped once when the
--                  launch email is sent so each subscriber is notified only once.

-- Defensively ensure every column the app relies on exists. `if not exists`
-- makes each statement a safe no-op where the column is already present.
alter table public.city_waitlist
  add column if not exists notified_at timestamptz;

alter table public.city_waitlist
  add column if not exists source text not null default 'coming_soon';

alter table public.city_waitlist
  add column if not exists created_at timestamptz not null default now();

-- Recreate supporting indexes only if they are missing.
create index if not exists city_waitlist_city_idx
  on public.city_waitlist (city);

create index if not exists city_waitlist_created_at_idx
  on public.city_waitlist (created_at desc);
