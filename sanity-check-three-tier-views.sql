-- SANITY CHECK: What columns exist in each tier view?

-- ==========================================
-- TIER 1: business_profiles_chat_eligible
-- ==========================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles_chat_eligible'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- TIER 2: business_profiles_lite_eligible
-- ==========================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles_lite_eligible'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- TIER 3: business_profiles_ai_fallback_pool
-- ==========================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'business_profiles_ai_fallback_pool'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- TEST QUERY: Can we actually query all 3 views?
-- ==========================================
SELECT 'Tier 1 (Chat Eligible)' as tier, COUNT(*) as count
FROM business_profiles_chat_eligible
WHERE city = 'bali'
UNION ALL
SELECT 'Tier 2 (Lite Eligible)' as tier, COUNT(*) as count
FROM business_profiles_lite_eligible
WHERE city = 'bali'
UNION ALL
SELECT 'Tier 3 (Fallback Pool)' as tier, COUNT(*) as count
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali';

-- ==========================================
-- CRITICAL: Do these views have tier_priority?
-- ==========================================
SELECT 
  business_name,
  effective_tier,
  tier_priority,
  display_category,
  rating
FROM business_profiles_chat_eligible
WHERE city = 'bali'
LIMIT 3;

SELECT 
  business_name,
  display_category,
  rating
FROM business_profiles_lite_eligible
WHERE city = 'bali'
LIMIT 3;

SELECT 
  business_name,
  display_category,
  rating
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
LIMIT 3;
