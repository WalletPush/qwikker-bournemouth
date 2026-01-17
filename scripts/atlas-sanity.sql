-- Atlas Sanity Check Script
-- Purpose: Verify Atlas eligibility rules and identify data quality issues
-- Run this manually to audit business data before/after changes

-- ============================================================================
-- 1. TOTAL BUSINESSES PER TIER
-- ============================================================================
SELECT 
  business_tier,
  COUNT(*) as total_count,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) as with_coords,
  SUM(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END) as missing_coords
FROM business_profiles
GROUP BY business_tier
ORDER BY 
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'free_trial' THEN 3
    WHEN 'recommended' THEN 4
    WHEN 'free_tier' THEN 5
    ELSE 6
  END;

-- ============================================================================
-- 2. AI-ELIGIBLE TIERS MISSING COORDINATES (DATA QUALITY ISSUE)
-- ============================================================================
SELECT 
  id,
  business_name,
  business_tier,
  city,
  business_address,
  google_place_id,
  auto_imported,
  created_at,
  CASE 
    WHEN latitude IS NULL AND longitude IS NULL THEN 'Both missing'
    WHEN latitude IS NULL THEN 'Latitude missing'
    WHEN longitude IS NULL THEN 'Longitude missing'
    ELSE 'Invalid coords'
  END as issue
FROM business_profiles
WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  AND (latitude IS NULL OR longitude IS NULL)
ORDER BY created_at DESC
LIMIT 50;

-- ============================================================================
-- 3. FREE TIER BUSINESSES WITH COORDS (OK, BUT EXCLUDED FROM AI/ATLAS)
-- ============================================================================
SELECT 
  COUNT(*) as free_tier_with_coords,
  SUM(CASE WHEN google_place_id IS NOT NULL THEN 1 ELSE 0 END) as with_google_place_id
FROM business_profiles
WHERE business_tier = 'free_tier'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

-- ============================================================================
-- 4. BUSINESSES WITH NULL TIER (SHOULD BE EXCLUDED)
-- ============================================================================
SELECT 
  id,
  business_name,
  city,
  owner_user_id IS NOT NULL as is_claimed,
  auto_imported,
  google_place_id,
  latitude IS NOT NULL as has_lat,
  longitude IS NOT NULL as has_lng,
  created_at
FROM business_profiles
WHERE business_tier IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- 5. ATLAS-ELIGIBLE COUNT (SHOULD MATCH VIEW)
-- ============================================================================
SELECT COUNT(*) as atlas_eligible_count
FROM business_profiles_ai_eligible;

-- ============================================================================
-- 6. VERIFICATION STATUS BREAKDOWN
-- ============================================================================
SELECT 
  CASE 
    WHEN google_place_id IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL THEN 'Verified'
    WHEN google_place_id IS NOT NULL AND (latitude IS NULL OR longitude IS NULL) THEN 'Partial (missing coords)'
    ELSE 'Not verified'
  END as verification_status,
  COUNT(*) as count,
  SUM(CASE WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended') THEN 1 ELSE 0 END) as ai_eligible_tier_count
FROM business_profiles
GROUP BY 
  CASE 
    WHEN google_place_id IS NOT NULL AND latitude IS NOT NULL AND longitude IS NOT NULL THEN 'Verified'
    WHEN google_place_id IS NOT NULL AND (latitude IS NULL OR longitude IS NULL) THEN 'Partial (missing coords)'
    ELSE 'Not verified'
  END
ORDER BY count DESC;

-- ============================================================================
-- 7. AI-SAFE VIEW LEAKAGE CHECK (MUST BE ZERO)
-- ============================================================================
-- Check if any free_tier or null tier businesses leaked into the view
SELECT 
  'CRITICAL: free_tier in AI view' as issue,
  COUNT(*) as leaked_count
FROM business_profiles_ai_eligible
WHERE business_tier = 'free_tier'
UNION ALL
SELECT 
  'CRITICAL: null tier in AI view' as issue,
  COUNT(*) as leaked_count
FROM business_profiles_ai_eligible
WHERE business_tier IS NULL
UNION ALL
SELECT 
  'CRITICAL: missing coords in AI view' as issue,
  COUNT(*) as leaked_count
FROM business_profiles_ai_eligible
WHERE latitude IS NULL OR longitude IS NULL;

-- Expected output: All counts should be 0

-- ============================================================================
-- 8. CITY-SPECIFIC ATLAS READINESS
-- ============================================================================
SELECT 
  city,
  COUNT(*) as total_businesses,
  SUM(CASE WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended') THEN 1 ELSE 0 END) as ai_eligible_tier,
  SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) as with_coords,
  SUM(CASE 
    WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL 
    THEN 1 ELSE 0 
  END) as atlas_ready
FROM business_profiles
GROUP BY city
ORDER BY atlas_ready DESC;
