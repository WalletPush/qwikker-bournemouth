-- Check RLS policies on business_profiles that might be blocking unclaimed businesses

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'business_profiles'
ORDER BY policyname;

