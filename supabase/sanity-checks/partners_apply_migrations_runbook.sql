-- Partners migrations — runbook (READ THIS, then run the 3 files in order)
--
-- Safe? Mostly additive. Does NOT touch franchise_crm_configs data,
-- business profiles, wallet, or other product tables.
--
-- What changes:
--   Phase 1 — adds columns/constraints/audit to partner_claims; remaps claimed→held
--   Phase 2 — CREATES partner_markets + seeds catalogue; marks rows owned if franchise exists
--   Phase 3 — flags Tier 1 cities reserved (skips already-owned)
--
-- Run in Supabase SQL Editor as ONE transaction each file (or whole batch below).
-- Prefer: BEGIN; ... COMMIT; so a failure rolls back that phase.
--
-- ORDER (do not skip / do not reorder):
--   1) supabase/migrations/20260803180000_partner_claims_phase1_hardening.sql
--   2) supabase/migrations/20260803190000_partner_markets_phase2.sql
--   3) supabase/migrations/20260803200000_partner_markets_tier1_reserved.sql
--
-- Then re-run: supabase/sanity-checks/partners_full_sanity_check.sql
-- Expect: partner_markets present, reserved > 0, bali/brighton/koh-samui owned not reserved.

-- Optional quick preflight (should match your earlier sanity):
select
  to_regclass('public.partner_claims') as partner_claims,
  to_regclass('public.partner_markets') as partner_markets,
  (select count(*) from public.partner_claims where status = 'converted') as converted_claims,
  (select count(*) from public.franchise_crm_configs
   where status in ('active','coming_soon','pending_setup')) as live_franchises;
