-- ============================================================================
-- Add menu_preview (+ featured_items_count) to the Tier 3 chat fallback view
-- ============================================================================
-- PURPOSE:
--   The AI chat injects a business's featured menu items into the model context
--   from `business.menu_preview` (see lib/ai/hybrid-chat.ts).
--     - Tier 2 (business_profiles_lite_eligible / claimed_free) already exposes it.
--     - Tier 1 (business_profiles_chat_eligible / paid+trial) ALSO already exposes
--       it (confirmed via pre-flight check 2026-07-22) — so no change needed there.
--     - Tier 3 (business_profiles_ai_fallback_pool / unclaimed, admin-approved) did
--       NOT — so enriched featured items on unclaimed listings were visible on the
--       public listing page but INVISIBLE to the AI chat (users asking for a listed
--       dish/service got "I can't find any in <city>").
--
--   This migration adds `menu_preview` + a derived `featured_items_count` to the
--   Tier 3 view so the existing injection logic can surface those items.
--
-- SCOPE NOTE: We intentionally do NOT touch business_profiles_chat_eligible here.
--   It already outputs menu_preview, and a CREATE OR REPLACE that reorders its
--   columns would be rejected by Postgres. Tier 1 needs nothing.
--
-- SAFETY: A read-only view over business_profiles. No data is modified. Pre-flight
--   check confirmed nothing depends on this view, so `drop view` is safe.
-- ============================================================================

drop view if exists public.business_profiles_ai_fallback_pool;

create or replace view public.business_profiles_ai_fallback_pool as
select
  id,
  business_name,
  business_tagline,
  system_category,
  display_category,
  google_primary_type,
  google_types,
  business_town,
  business_address,
  phone,
  website_url,
  google_place_id,
  google_reviews_highlights,
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured,
  status,
  -- NEW: featured menu / service items so the AI chat can surface them
  menu_preview,
  coalesce(jsonb_array_length(menu_preview), 0) as featured_items_count
from business_profiles
where
  auto_imported = true
  and status = 'unclaimed'
  and business_tier = 'free_tier'
  and admin_chat_fallback_approved = true
  and latitude is not null
  and longitude is not null;

comment on view public.business_profiles_ai_fallback_pool is
  'Tier 3: Admin-curated fallback directory for chat. Includes system_category, google_types and (as of 2026-07-22) menu_preview + featured_items_count so enriched featured items are searchable by the AI.';

grant select on business_profiles_ai_fallback_pool to authenticated, anon, service_role;
