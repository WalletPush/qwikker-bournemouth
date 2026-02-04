-- =====================================================
-- INSPECT: Your actual business_user_roles table
-- =====================================================

-- 1. Table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'business_user_roles'
ORDER BY ordinal_position;

-- 2. Existing RLS policies
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'business_user_roles';

-- 3. Current row count
SELECT COUNT(*) as "Total Rows" FROM business_user_roles;

-- 4. Sample data (first 5 rows)
SELECT 
  bur.*,
  bp.business_name,
  au.email as user_email
FROM business_user_roles bur
LEFT JOIN business_profiles bp ON bp.id = bur.business_id
LEFT JOIN auth.users au ON au.id = bur.user_id
LIMIT 5;

-- 5. Indexes on the table
SELECT 
  indexname as "Index Name",
  indexdef as "Definition"
FROM pg_indexes
WHERE tablename = 'business_user_roles';
