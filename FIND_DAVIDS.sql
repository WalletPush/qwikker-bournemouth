-- Find David's grill shack (case-insensitive)
SELECT 
  business_name,
  system_category,
  display_category,
  google_verified_at,
  google_place_id,
  status,
  auto_imported,
  owner_user_id,
  latitude,
  longitude,
  CASE 
    WHEN google_verified_at IS NOT NULL THEN '✅ GOOGLE VERIFIED'
    WHEN google_place_id IS NOT NULL THEN '🔍 HAS PLACE ID'
    WHEN auto_imported = true THEN '🤖 AUTO IMPORTED'
    WHEN owner_user_id IS NOT NULL THEN '👤 CLAIMED'
    WHEN status = 'unclaimed' THEN '📍 UNCLAIMED'
    ELSE '❌ MOCK/TEST DATA'
  END as business_type
FROM business_profiles
WHERE business_name ILIKE '%david%'
ORDER BY business_name;
