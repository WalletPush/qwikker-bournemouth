-- Check if any imported businesses have reviews
SELECT 
  business_name,
  google_place_id,
  review_count,
  google_reviews_highlights,
  CASE 
    WHEN google_reviews_highlights IS NULL THEN 'No reviews data'
    WHEN jsonb_array_length(google_reviews_highlights) = 0 THEN 'Empty array'
    ELSE CONCAT(jsonb_array_length(google_reviews_highlights), ' reviews stored')
  END as review_status
FROM business_profiles
WHERE auto_imported = true
ORDER BY business_name
LIMIT 10;

-- Check one specific business in detail
SELECT 
  business_name,
  google_reviews_highlights
FROM business_profiles
WHERE business_name = 'Fireball Bar & Club'
LIMIT 1;
