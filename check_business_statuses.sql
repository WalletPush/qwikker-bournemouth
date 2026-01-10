-- Check all businesses and their statuses
SELECT 
  business_name,
  status,
  user_id IS NULL as no_user_id,
  owner_user_id IS NULL as no_owner_id,
  visibility,
  auto_imported,
  created_at
FROM business_profiles
WHERE city = 'bournemouth'
ORDER BY created_at DESC;

