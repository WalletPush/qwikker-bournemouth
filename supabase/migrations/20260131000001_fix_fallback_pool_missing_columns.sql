-- ============================================================================
-- FIX: business_profiles_ai_fallback_pool missing critical columns
-- ============================================================================
-- PROBLEM: View is missing google_reviews_highlights and status
-- IMPACT: Review snippets never show, status checks fail
-- ROOT CAUSE: View was recreated without these columns at some point
-- ============================================================================

-- Drop and recreate the view with ALL required columns
DROP VIEW IF EXISTS public.business_profiles_ai_fallback_pool;

CREATE OR REPLACE VIEW public.business_profiles_ai_fallback_pool AS
SELECT
  id,
  business_name,
  display_category,
  google_primary_type,
  business_town,
  business_address,
  phone,
  website_url,
  google_place_id,
  google_reviews_highlights,  -- ✅ CRITICAL: For review snippets in chat
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured,
  status  -- ✅ CRITICAL: Chat code checks b.status === 'unclaimed'
FROM business_profiles
WHERE
  auto_imported = true
  AND status = 'unclaimed'
  AND business_tier = 'free_tier'
  AND admin_chat_fallback_approved = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_ai_fallback_pool IS
  'Tier 3: Admin-curated fallback directory for chat when Tier 1 AND Tier 2 are empty. Basic contact info + Google reviews. Requires Google attribution: Ratings and reviews data provided by Google.';

GRANT SELECT ON business_profiles_ai_fallback_pool TO authenticated, anon, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- This should now show google_reviews_highlights and status
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles_ai_fallback_pool'
  AND table_schema = 'public'
  AND column_name IN ('google_reviews_highlights', 'status')
ORDER BY column_name;
