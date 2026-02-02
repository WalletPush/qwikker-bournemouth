-- Check actual structure of google_reviews_highlights in database
SELECT 
  business_name,
  jsonb_array_length(google_reviews_highlights) as review_count,
  google_reviews_highlights->0 as first_review_structure
FROM business_profiles
WHERE google_reviews_highlights IS NOT NULL
  AND jsonb_array_length(google_reviews_highlights) > 0
  AND city = 'bali'
LIMIT 3;
