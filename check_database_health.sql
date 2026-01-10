-- Quick database health check
-- Run this in Supabase SQL Editor to verify everything is intact

-- 1. Check all businesses are still there
SELECT 
  COUNT(*) as total_businesses,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'unclaimed') as unclaimed_count
FROM business_profiles
WHERE city = 'bournemouth';

-- 2. Check your 9 original businesses are untouched
SELECT 
  business_name,
  status,
  visibility,
  user_id IS NOT NULL as has_user_id,
  owner_user_id IS NOT NULL as has_owner_id,
  created_at::date as created_date
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'approved'
ORDER BY created_at;

-- 3. Verify unclaimed test businesses
SELECT 
  business_name,
  status,
  visibility,
  auto_imported
FROM business_profiles
WHERE city = 'bournemouth'
  AND status = 'unclaimed';

