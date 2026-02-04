-- =====================================================
-- DEBUG: Check business_user_roles Setup
-- =====================================================

-- 1. Does the table exist?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_user_roles'
    ) THEN '✅ business_user_roles table EXISTS'
    ELSE '❌ business_user_roles table MISSING - Run migration 20260204000000 first!'
  END as "Table Status";

-- 2. How many rows in business_user_roles?
SELECT 
  COUNT(*) as "Total Roles",
  COUNT(DISTINCT business_id) as "Unique Businesses",
  COUNT(DISTINCT user_id) as "Unique Users"
FROM business_user_roles;

-- 3. Show sample roles
SELECT 
  bur.role,
  COUNT(*) as "Count"
FROM business_user_roles bur
GROUP BY bur.role
ORDER BY bur.role;

-- 4. Check YOUR specific user
SELECT 
  bur.business_id,
  bp.business_name,
  bur.role,
  bur.created_at
FROM business_user_roles bur
JOIN business_profiles bp ON bp.id = bur.business_id
WHERE bur.user_id = auth.uid();

-- 5. Find businesses WITHOUT roles (should be 0 after backfill)
SELECT 
  bp.id,
  bp.business_name,
  bp.user_id,
  au.email as owner_email
FROM business_profiles bp
LEFT JOIN business_user_roles bur ON bur.business_id = bp.id
JOIN auth.users au ON au.id = bp.user_id
WHERE bur.id IS NULL
  AND bp.user_id IS NOT NULL
LIMIT 10;

-- 6. Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trg_create_business_owner_role'
    ) THEN '✅ Trigger installed'
    ELSE '❌ Trigger missing'
  END as "Trigger Status";
