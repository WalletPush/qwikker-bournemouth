-- Migration: First-party claim-invite link tracking (Acquisition outreach)
-- Description:
--   Tracked redirect links for Claim + Present Mode CTAs in claim invite emails,
--   plus click events and denormalised rollups on business_enrichments for the
--   Acquisition Sent list (who we emailed, when, click counts).
-- Affected tables:
--   - creates public.outreach_tracked_links
--   - creates public.outreach_link_clicks
--   - alters public.business_enrichments (additive columns)
-- Date: 2026-08-04 22:00:00 UTC

-- ---------------------------------------------------------------------------
-- Tracked links (one row per Claim / Demo URL issued at send time)
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_tracked_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  city text not null,
  link_type text not null check (link_type in ('claim', 'demo')),
  target_url text not null,
  created_at timestamptz not null default now(),
  created_by text,
  click_count integer not null default 0,
  last_clicked_at timestamptz,
  resend_message_id text
);

comment on table public.outreach_tracked_links is
  'Short tracked URLs for claim-invite CTAs (/r/{code}). Service-role write; public redirect reads by code.';

create index if not exists idx_outreach_tracked_links_business
  on public.outreach_tracked_links(business_id);
create index if not exists idx_outreach_tracked_links_city
  on public.outreach_tracked_links(city);
create index if not exists idx_outreach_tracked_links_code
  on public.outreach_tracked_links(code);

alter table public.outreach_tracked_links enable row level security;
-- No anon/authenticated policies: redirect route uses service role.

-- ---------------------------------------------------------------------------
-- Click events (append-only log, mirrors qr_code_scans)
-- ---------------------------------------------------------------------------
create table if not exists public.outreach_link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.outreach_tracked_links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  city text not null,
  user_agent text,
  ip_address text,
  device_type text
);

comment on table public.outreach_link_clicks is
  'Per-click log for outreach_tracked_links. Counts every hit (incl. possible bot prefetch).';

create index if not exists idx_outreach_link_clicks_link
  on public.outreach_link_clicks(link_id);
create index if not exists idx_outreach_link_clicks_clicked_at
  on public.outreach_link_clicks(clicked_at desc);
create index if not exists idx_outreach_link_clicks_city
  on public.outreach_link_clicks(city);

alter table public.outreach_link_clicks enable row level security;

-- ---------------------------------------------------------------------------
-- Enrichment rollups for Acquisition Sent UI
-- ---------------------------------------------------------------------------
alter table public.business_enrichments
  add column if not exists sent_to_email text,
  add column if not exists claim_link_clicked_at timestamptz,
  add column if not exists claim_link_click_count integer not null default 0,
  add column if not exists demo_link_clicked_at timestamptz,
  add column if not exists demo_link_click_count integer not null default 0;

comment on column public.business_enrichments.sent_to_email is
  'Recipient email snapshot at claim-invite send time (stable if CRM email later changes).';
comment on column public.business_enrichments.claim_link_click_count is
  'Aggregate clicks on the claim CTA tracked link for this business.';
comment on column public.business_enrichments.demo_link_click_count is
  'Aggregate clicks on the Present Mode / demo tracked link for this business.';
