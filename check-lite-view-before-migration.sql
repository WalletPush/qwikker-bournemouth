-- SANITY CHECK: Before migrating business_profiles_lite_eligible view
-- This will show us exactly what we're working with

-- ============================================================================
-- STEP 1: Check if the view exists and what columns it currently has
-- ============================================================================
SELECT 
  column_name,
  data_type,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'business_profiles_lite_eligible'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check what Tier 2 businesses we have (claimed_free with menu items)
-- ============================================================================
SELECT 
  id,
  business_name,
  status,
  business_tier,
  jsonb_array_length(menu_preview) as menu_items,
  business_tagline,
  business_description,
  business_hours,
  latitude,
  longitude,
  city
FROM business_profiles
WHERE 
  status = 'claimed_free'
  AND business_tier = 'free_tier'
  AND (menu_preview IS NOT NULL AND jsonb_array_length(menu_preview) >= 1)
  AND city IS NOT NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- STEP 3: Verify business_tagline and business_description exist in business_profiles
-- ============================================================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles'
  AND column_name IN ('business_tagline', 'business_description', 'business_hours')
ORDER BY column_name;

-- ============================================================================
-- STEP 4: Preview what the NEW view will return (without creating it)
-- ============================================================================
SELECT
  bp.id,
  bp.business_name,
  bp.business_tagline,  -- NEW
  bp.business_description,  -- NEW
  bp.display_category,
  bp.google_primary_type,
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
  bp.business_hours,
  bp.business_hours_structured,
  bp.menu_preview,
  
  jsonb_array_length(bp.menu_preview) as featured_items_count,
  
  (SELECT COUNT(*) 
   FROM business_offers 
   WHERE business_id = bp.id 
   AND status = 'approved' 
   AND (offer_end_date IS NULL OR offer_end_date >= NOW())
  ) as approved_offers_count

FROM business_profiles bp
WHERE 
  bp.status = 'claimed_free'
  AND bp.business_tier = 'free_tier'
  AND (bp.menu_preview IS NOT NULL AND jsonb_array_length(bp.menu_preview) >= 1)
  AND bp.city IS NOT NULL
  AND bp.latitude IS NOT NULL
  AND bp.longitude IS NOT NULL
LIMIT 3;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If you see:
-- ✅ Step 1: View exists with columns listed
-- ✅ Step 2: At least 1 business (e.g., Triangle GYROSS)
-- ✅ Step 3: All 3 columns exist in business_profiles
-- ✅ Step 4: Preview shows data with business_tagline and business_description filled
-- 
-- THEN: Safe to run the migration (but we need to DROP the view first, not REPLACE)
