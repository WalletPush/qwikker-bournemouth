-- Check if Bali businesses have Google Place IDs and review data
SELECT 
  business_name,
  google_place_id,
  rating,
  review_count,
  google_reviews_highlights IS NOT NULL as has_cached_reviews,
  CASE 
    WHEN google_reviews_highlights IS NOT NULL 
    THEN jsonb_array_length(google_reviews_highlights)
    ELSE 0
  END as cached_review_count,
  status
FROM business_profiles
WHERE city = 'bali'
  AND admin_chat_fallback_approved = true
ORDER BY business_name;
