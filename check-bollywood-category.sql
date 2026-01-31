-- Check what category Bollywood Indian Cuisine has
SELECT 
  business_name,
  display_category,
  system_category,
  google_primary_type
FROM business_profiles
WHERE business_name ILIKE '%bollywood%'
  AND city = 'bali';

-- Also check other Indian restaurants
SELECT 
  business_name,
  display_category,
  system_category,
  google_primary_type
FROM business_profiles
WHERE display_category ILIKE '%indian%'
  AND city = 'bali'
LIMIT 5;
