-- ============================================================================
-- Add system_category to Tier 2 and Tier 3 views
-- ============================================================================
-- PURPOSE: The AI relevance scorer checks system_category for intent matching.
-- Both Tier 2 (business_profiles_lite_eligible) and Tier 3
-- (business_profiles_ai_fallback_pool) were missing this column, causing
-- lower relevance scores and missed matches for category-based queries.
-- ============================================================================

-- ============================================================================
-- TIER 2: business_profiles_lite_eligible
-- ============================================================================
-- Adding: system_category, google_types
-- These columns are needed for accurate relevance scoring in the AI chat.

drop view if exists public.business_profiles_lite_eligible;

create or replace view public.business_profiles_lite_eligible as
select
  bp.id,
  bp.business_name,
  bp.business_tagline,
  bp.business_description,
  bp.system_category,
  bp.display_category,
  bp.google_primary_type,
  bp.google_types,
  bp.business_town,
  bp.business_address,
  bp.phone,
  bp.website_url,
  bp.google_place_id,
  bp.latitude,
  bp.longitude,
  bp.rating,
  bp.review_count,
  bp.city,
  bp.status,
  bp.business_hours,
  bp.business_hours_structured,
  bp.menu_preview,
  jsonb_array_length(bp.menu_preview) as featured_items_count,
  (select count(*)
   from business_offers
   where business_id = bp.id
   and status = 'approved'
   and (offer_end_date is null or offer_end_date >= now())
  ) as approved_offers_count
from business_profiles bp
where
  bp.status = 'claimed_free'
  and bp.business_tier = 'free_tier'
  and (bp.menu_preview is not null and jsonb_array_length(bp.menu_preview) >= 1)
  and bp.city is not null
  and bp.latitude is not null
  and bp.longitude is not null;

comment on view public.business_profiles_lite_eligible is
  'Tier 2: Claimed-free businesses with at least 1 featured menu item. Text-only mentions in chat (no carousel). Includes system_category and google_types for accurate AI relevance scoring.';

grant select on business_profiles_lite_eligible to authenticated, anon, service_role;

-- ============================================================================
-- TIER 3: business_profiles_ai_fallback_pool
-- ============================================================================
-- Adding: system_category, google_types, business_tagline
-- These columns are needed for accurate relevance scoring and richer context.

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
  status
from business_profiles
where
  auto_imported = true
  and status = 'unclaimed'
  and business_tier = 'free_tier'
  and admin_chat_fallback_approved = true
  and latitude is not null
  and longitude is not null;

comment on view public.business_profiles_ai_fallback_pool is
  'Tier 3: Admin-curated fallback directory for chat. Includes system_category and google_types for accurate AI relevance scoring. Requires Google attribution for ratings.';

grant select on business_profiles_ai_fallback_pool to authenticated, anon, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Confirm system_category is now available in both views

select 'lite_eligible' as view_name, column_name
from information_schema.columns
where table_name = 'business_profiles_lite_eligible'
  and table_schema = 'public'
  and column_name in ('system_category', 'google_types', 'status')
order by column_name;

select 'ai_fallback_pool' as view_name, column_name
from information_schema.columns
where table_name = 'business_profiles_ai_fallback_pool'
  and table_schema = 'public'
  and column_name in ('system_category', 'google_types', 'business_tagline')
order by column_name;
