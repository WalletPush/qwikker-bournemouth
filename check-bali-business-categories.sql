-- Check what categories/types the Bali businesses have
SELECT 
  business_name,
  display_category,
  system_category,
  google_primary_type,
  rating,
  review_count
FROM business_profiles
WHERE city = 'bali'
  AND admin_chat_fallback_approved = true
ORDER BY business_name;
