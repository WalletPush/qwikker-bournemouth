-- Partner Claims & Waitlist System
-- Purpose: Track city partner claims from the /partners landing page
-- Tables: partner_claims (city claims with hold periods), partner_waitlist (interest for claimed cities)

-- partner_claims: tracks when someone claims a city to operate
create table if not exists public.partner_claims (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,

  -- city info (from Google Places autocomplete)
  city_name text not null,
  city_slug text not null,
  country text,
  place_id text,

  -- claimant
  full_name text not null,
  email text not null,

  -- claim lifecycle
  status text not null default 'claimed'
    check (status in ('claimed', 'converted', 'expired', 'released')),
  claimed_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone not null,
  converted_at timestamp with time zone,

  -- hq management
  notes text,
  franchise_id uuid references public.franchise_crm_configs(id) on delete set null
);

-- index for fast city lookups and dedup checks
create index if not exists idx_partner_claims_city_slug
  on public.partner_claims using btree (city_slug);

create index if not exists idx_partner_claims_status
  on public.partner_claims using btree (status);

create index if not exists idx_partner_claims_expires_at
  on public.partner_claims using btree (expires_at);

-- enable rls
alter table public.partner_claims enable row level security;

-- anon can insert (public form submission)
create policy "Anyone can submit a partner claim"
  on public.partner_claims
  for insert
  to anon
  with check (true);

-- anon can read non-sensitive fields (city status display)
-- the actual select is done via service role in the API, but allow basic reads
create policy "Anyone can view partner claim status"
  on public.partner_claims
  for select
  to anon
  using (true);

-- authenticated users can also read and insert
create policy "Authenticated users can view partner claims"
  on public.partner_claims
  for select
  to authenticated
  using (true);

create policy "Authenticated users can submit partner claims"
  on public.partner_claims
  for insert
  to authenticated
  with check (true);

-- only service role (HQ admin APIs) can update or delete
-- no explicit policies needed as service role bypasses RLS


-- partner_waitlist: tracks interest for cities that are already claimed
create table if not exists public.partner_waitlist (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,

  -- city reference
  city_slug text not null,
  city_name text not null,

  -- waitlister
  full_name text not null,
  email text not null,

  -- management
  notified_at timestamp with time zone
);

create index if not exists idx_partner_waitlist_city_slug
  on public.partner_waitlist using btree (city_slug);

-- enable rls
alter table public.partner_waitlist enable row level security;

-- anon can insert (public form)
create policy "Anyone can join partner waitlist"
  on public.partner_waitlist
  for insert
  to anon
  with check (true);

-- anon can read (for count display)
create policy "Anyone can view waitlist entries"
  on public.partner_waitlist
  for select
  to anon
  using (true);

create policy "Authenticated users can view waitlist"
  on public.partner_waitlist
  for select
  to authenticated
  using (true);

create policy "Authenticated users can join waitlist"
  on public.partner_waitlist
  for insert
  to authenticated
  with check (true);
