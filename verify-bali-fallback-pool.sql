-- CRITICAL: Are Bali businesses actually IN the fallback pool view?
SELECT COUNT(*) as total_bali_businesses
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali';

-- Are there ANY Indian restaurants?
SELECT business_name, display_category
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
  AND (
    display_category ILIKE '%indian%' 
    OR business_name ILIKE '%indian%'
    OR business_name ILIKE '%bollywood%'
  )
LIMIT 5;

-- What categories DO exist in Bali?
SELECT display_category, COUNT(*) as count
FROM business_profiles_ai_fallback_pool
WHERE city = 'bali'
GROUP BY display_category
ORDER BY count DESC
LIMIT 20;
