-- Migration: Add walletpush_dashboard_url to franchise_crm_configs
--
-- Purpose: Store the per-city WalletPush dashboard base URL so each franchise
-- uses its own WalletPush instance instead of the hardcoded loyalty.qwikker.com.
-- This URL is used for both admin UI links and API calls.
--
-- Affected table: franchise_crm_configs
-- Non-destructive: adds a nullable column only.

alter table public.franchise_crm_configs
  add column if not exists walletpush_dashboard_url text;

comment on column public.franchise_crm_configs.walletpush_dashboard_url
  is 'Base URL of this franchise''s WalletPush instance (e.g. https://loyalty.qwikker.com). Used for admin links and API calls.';

-- Backfill Bournemouth with the existing hardcoded URL
update public.franchise_crm_configs
set walletpush_dashboard_url = 'https://loyalty.qwikker.com'
where city = 'bournemouth'
  and walletpush_dashboard_url is null;
