-- =====================================================
-- QUICK CHECK: What columns ACTUALLY exist in business_profiles?
-- Run this FIRST to see your real schema
-- =====================================================

-- Show ALL columns in business_profiles table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_profiles'
ORDER BY ordinal_position;

-- If that doesn't work, try this:
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'business_profiles';
