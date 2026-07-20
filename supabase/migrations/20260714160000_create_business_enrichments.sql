-- Migration: Create business_enrichments (Acquisition Engine draft layer)
-- Description: Stores AI-generated listing + offer DRAFTS for a business so the
--   Acquisition Engine can pre-bake drafts (per-city, admin-triggered) and let an
--   admin triage/approve them later. Nothing here is live profile content — it is
--   a staging layer. One draft row per business.
-- Affected tables: creates public.business_enrichments (FK -> business_profiles).
-- Special considerations: this is an ADMIN-INTERNAL table. It is only ever read /
--   written by server code using the Supabase service-role client (which bypasses
--   RLS). We still enable RLS and deliberately add NO anon/authenticated policies,
--   so it is deny-by-default for end users and business owners. Drafts may contain
--   AI-inferred content that must NOT leak to public/business roles until reviewed.
-- Date: 2026-07-14 16:00:00 UTC

create table if not exists public.business_enrichments (
  id uuid primary key default gen_random_uuid(),

  -- one enrichment draft per business
  business_id uuid not null unique references public.business_profiles(id) on delete cascade,

  -- denormalised franchise city for fast per-city filtering + scoping
  city text,

  -- lifecycle of the draft: pending (queued) -> generating -> ready | error
  status text not null default 'pending' check (status in ('pending', 'generating', 'ready', 'error')),

  -- the full generated draft (insight + listing + offers + signals + meta),
  -- shape mirrors AcquisitionResult in lib/listing-engine/generate-acquisition-draft.ts
  draft jsonb,

  -- per-field human review decisions (accepted/declined/edited), keyed by field id
  decisions jsonb not null default '{}'::jsonb,

  -- generation metadata (useful for cost tracking + debugging)
  model text,
  cost_estimate_usd numeric(10, 4),
  error text,

  -- admin id string (from city_admins; may be a non-uuid dev id, so kept as text)
  generated_by text,
  generated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.business_enrichments is 'Admin-internal staging layer for AI-generated listing + offer drafts (Acquisition Engine). Service-role access only; deny-by-default for end users.';

-- Indexes to support the per-city triage table + status filtering.
-- (business_id already has a unique index from the UNIQUE constraint.)
create index if not exists idx_business_enrichments_city on public.business_enrichments(city);
create index if not exists idx_business_enrichments_status on public.business_enrichments(status);

-- Enable RLS. No policies are added on purpose: only the service-role client
-- (used by admin server routes) may touch this table. anon + authenticated roles
-- get no access, which is the intended security posture for unreviewed AI drafts.
alter table public.business_enrichments enable row level security;
