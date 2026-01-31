-- ============================================
-- COMPLETE SANITY CHECK: AI Chat Query Chain
-- ============================================
-- Run this to verify EVERYTHING the AI chat queries

-- STEP 1: Verify the 3 tier views exist and have data
-- ============================================
SELECT 'TIER 1 (Paid/Trial)' as tier_name, COUNT(*) as bali_count
FROM business_profiles_chat_eligible
WHERE city = 'bali'
UNION ALL
SELECT 'TIER 2 (Claimed-Free)' as tier_name, COUNT(*) as bali_count
FROM business_profiles_lite_eligible
WHERE city = 'bali'
UNION ALL
SELECT 'TIER 3 (Unclaimed)' as tier_name, COUNT(*) as bali_count
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali';

-- STEP 2: Check Indian restaurants in each tier
-- ============================================
SELECT 'TIER 1 (Paid/Trial)' as tier_name, business_name, display_category
FROM business_profiles_chat_eligible
WHERE city = 'bali'
  AND display_category ILIKE '%indian%'
UNION ALL
SELECT 'TIER 2 (Claimed-Free)' as tier_name, business_name, display_category
FROM business_profiles_lite_eligible
WHERE city = 'bali'
  AND display_category ILIKE '%indian%'
UNION ALL
SELECT 'TIER 3 (Unclaimed)' as tier_name, business_name, display_category
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
  AND display_category ILIKE '%indian%';

-- STEP 3: Check what columns are available in fallback_pool
-- ============================================
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'business_profiles_ai_fallback_pool'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 4: Verify the Indian restaurants have proper data
-- ============================================
SELECT 
  business_name,
  display_category,
  rating,
  review_count,
  latitude,
  longitude,
  google_place_id,
  CASE 
    WHEN google_reviews_highlights IS NOT NULL THEN 'Has cached reviews'
    ELSE 'No cached reviews'
  END as review_cache_status
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
  AND display_category ILIKE '%indian%';

-- STEP 5: Simulate the relevance scoring
-- ============================================
-- Check if "indian" appears in display_category or business_name
SELECT 
  business_name,
  display_category,
  rating,
  CASE 
    WHEN display_category ILIKE '%indian%' THEN 3
    WHEN business_name ILIKE '%indian%' THEN 2
    ELSE 0
  END as simulated_relevance_score
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
ORDER BY 
  CASE 
    WHEN display_category ILIKE '%indian%' THEN 3
    WHEN business_name ILIKE '%indian%' THEN 2
    ELSE 0
  END DESC,
  rating DESC NULLS LAST
LIMIT 10;

-- STEP 6: Check what the top 10 by RATING are (OLD BROKEN LOGIC)
-- ============================================
SELECT 
  business_name,
  display_category,
  rating,
  review_count
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
ORDER BY rating DESC NULLS LAST, review_count DESC NULLS LAST
LIMIT 10;

-- STEP 7: Count businesses by category to understand distribution
-- ============================================
SELECT 
  display_category,
  COUNT(*) as count,
  ROUND(AVG(rating), 1) as avg_rating
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
GROUP BY display_category
ORDER BY count DESC
LIMIT 10;

-- ============================================
-- EXPECTED RESULTS FOR "indian in bali":
-- ============================================
-- Tier 1: 0 (no paid Indian restaurants)
-- Tier 2: 0 (no claimed-free Indian restaurants)
-- Tier 3: 2 Indian restaurants with score=3
-- Should show: ONLY those 2 Indian restaurants
-- Should NOT show: Thai, Mediterranean, Italian, etc
-- ============================================
