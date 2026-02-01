-- Check what businesses should show up in Atlas for Bournemouth

-- 1. Check all businesses in Bournemouth
SELECT 
  'Total businesses' as check_type,
  COUNT(*) as count
FROM business_profiles
WHERE city = 'bournemouth';

-- 2. Check businesses in each tier
SELECT 
  'Tier 1 (Paid/Trial)' as tier,
  COUNT(*) as count,
  string_agg(DISTINCT display_category, ', ') as categories
FROM business_profiles_chat_eligible
WHERE city = 'bournemouth';

SELECT 
  'Tier 2 (Claimed-Free)' as tier,
  COUNT(*) as count,
  string_agg(DISTINCT display_category, ', ') as categories
FROM business_profiles_lite_eligible
WHERE city = 'bournemouth';

SELECT 
  'Tier 3 (Unclaimed)' as tier,
  COUNT(*) as count,
  string_agg(DISTINCT display_category, ', ') as categories
FROM business_profiles_ai_fallback_pool
WHERE city = 'bournemouth';

-- 3. Test the exact query that Atlas uses for "greek"
SELECT 
  id,
  business_name,
  display_category,
  rating,
  latitude,
  longitude
FROM business_profiles_ai_fallback_pool
WHERE city = 'bournemouth'
  AND rating >= 4.4
  AND (display_category ILIKE '%greek%' OR business_name ILIKE '%greek%')
LIMIT 10;

-- 4. Check what Greek restaurants exist (any tier, any rating)
SELECT 
  business_name,
  display_category,
  rating,
  status,
  CASE 
    WHEN id IN (SELECT id FROM business_profiles_chat_eligible WHERE city = 'bournemouth') THEN 'Tier 1'
    WHEN id IN (SELECT id FROM business_profiles_lite_eligible WHERE city = 'bournemouth') THEN 'Tier 2'
    WHEN id IN (SELECT id FROM business_profiles_ai_fallback_pool WHERE city = 'bournemouth') THEN 'Tier 3'
    ELSE 'Not in any tier'
  END as tier_status
FROM business_profiles
WHERE city = 'bournemouth'
  AND (display_category ILIKE '%greek%' OR business_name ILIKE '%greek%')
ORDER BY rating DESC;
