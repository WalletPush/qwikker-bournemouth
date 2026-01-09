-- Check what user_id currently represents in business_profiles

-- 1. Show all businesses with their user_id
SELECT 
  bp.id as business_id,
  bp.business_name,
  bp.user_id,
  bp.city,
  bp.status,
  u.email as user_email,
  u.created_at as user_created_at
FROM business_profiles bp
LEFT JOIN auth.users u ON u.id = bp.user_id
ORDER BY bp.business_name;

-- 2. Check if these user_ids exist in auth.users
SELECT 
  COUNT(*) as total_businesses,
  COUNT(bp.user_id) as businesses_with_user_id,
  COUNT(u.id) as user_ids_that_exist_in_auth
FROM business_profiles bp
LEFT JOIN auth.users u ON u.id = bp.user_id;

-- 3. Are any of these in app_users? (probably not - app_users are consumers)
SELECT 
  bp.business_name,
  bp.user_id,
  au.first_name,
  au.last_name,
  au.email as app_user_email
FROM business_profiles bp
LEFT JOIN app_users au ON au.user_id = bp.user_id
WHERE au.user_id IS NOT NULL;


