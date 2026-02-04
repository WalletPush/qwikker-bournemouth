-- =====================================================
-- SOCIAL WIZARD v1 — PRE-MIGRATION SANITY CHECK
-- Run this BEFORE applying the migration
-- Date: 2026-02-04
-- =====================================================

-- This script will verify:
-- 1. Required tables exist
-- 2. Required columns exist
-- 3. No conflicts with existing data
-- 4. RLS will work correctly

-- =====================================================
-- SANITY CHECK START
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'SOCIAL WIZARD v1 - PRE-MIGRATION SANITY CHECK';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CHECK 1: Does social_posts table already exist?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 1: Checking if social_posts table already exists...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'social_posts'
    ) THEN '⚠️  WARNING: social_posts table ALREADY EXISTS - migration will fail or skip'
    ELSE '✅ PASS: social_posts table does not exist - safe to create'
  END as result;

\echo ''

-- =====================================================
-- CHECK 2: Does business_profiles table exist?
-- =====================================================
\echo '✓ CHECK 2: Verifying business_profiles table exists...'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
    ) THEN '✅ PASS: business_profiles table exists'
    ELSE '❌ FAIL: business_profiles table MISSING - migration will fail'
  END as result;

\echo ''

-- =====================================================
-- CHECK 3: Does business_profiles have user_id column?
-- =====================================================
\echo '✓ CHECK 3: Verifying business_profiles.user_id column exists...'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
      AND column_name = 'user_id'
    ) THEN '✅ PASS: business_profiles.user_id column exists'
    ELSE '❌ FAIL: business_profiles.user_id column MISSING - RLS will fail'
  END as result;

\echo ''

-- =====================================================
-- CHECK 4: Is user_id a UUID and references auth.users?
-- =====================================================
\echo '✓ CHECK 4: Verifying user_id column type and foreign key...'

SELECT 
  c.column_name,
  c.data_type,
  c.is_nullable,
  CASE 
    WHEN c.data_type = 'uuid' THEN '✅ Correct type (UUID)'
    ELSE '⚠️  Unexpected type: ' || c.data_type
  END as type_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'business_profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
    ) THEN '✅ Foreign key to auth.users exists'
    ELSE '⚠️  No foreign key (may be ok, but unusual)'
  END as fk_check
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'business_profiles'
  AND c.column_name = 'user_id';

\echo ''

-- =====================================================
-- CHECK 5: Test data - Do you have businesses?
-- =====================================================
\echo '✓ CHECK 5: Checking for existing business profiles...'

SELECT 
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as businesses_with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as businesses_without_user_id,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️  No businesses found - you will need to create one to test'
    WHEN COUNT(CASE WHEN user_id IS NULL THEN 1 END) > 0 THEN '⚠️  Some businesses have NULL user_id - they cannot access Social Wizard'
    ELSE '✅ All businesses have user_id - ready for Social Wizard'
  END as status
FROM business_profiles;

\echo ''

-- =====================================================
-- CHECK 6: Sample business data for testing
-- =====================================================
\echo '✓ CHECK 6: Sample business data (for testing after migration)...'

SELECT 
  bp.id as business_id,
  bp.business_name,
  bp.user_id,
  bp.effective_tier,
  au.email as owner_email,
  CASE 
    WHEN bp.effective_tier IN ('featured', 'spotlight') THEN '✅ Can access Social Wizard'
    WHEN bp.effective_tier = 'starter' THEN '⚠️  Starter tier - will see locked view'
    ELSE '❓ Unknown tier: ' || COALESCE(bp.effective_tier, 'NULL')
  END as social_wizard_access
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
ORDER BY bp.created_at DESC
LIMIT 5;

\echo ''

-- =====================================================
-- CHECK 7: Verify auth.uid() function works
-- =====================================================
\echo '✓ CHECK 7: Testing auth.uid() function (needed for RLS)...'

SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '✅ PASS: auth.uid() returns NULL (expected when not in authenticated session)'
    ELSE '✅ PASS: auth.uid() returns: ' || auth.uid()::text
  END as result;

\echo ''

-- =====================================================
-- CHECK 8: Preview RLS policy logic
-- =====================================================
\echo '✓ CHECK 8: Preview RLS policy logic (simulating access check)...'
\echo 'This shows which businesses would be accessible by each user...'

SELECT 
  au.email as user_email,
  bp.business_name,
  bp.effective_tier,
  CASE 
    WHEN bp.user_id = au.id THEN '✅ User CAN access (owner)'
    ELSE '❌ User CANNOT access (not owner)'
  END as access_after_migration
FROM business_profiles bp
CROSS JOIN auth.users au
WHERE bp.user_id = au.id -- Only show matching pairs
ORDER BY au.email, bp.business_name
LIMIT 10;

\echo ''

-- =====================================================
-- CHECK 9: Verify no naming conflicts
-- =====================================================
\echo '✓ CHECK 9: Checking for naming conflicts...'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename = 'social_posts'
    ) THEN '⚠️  WARNING: RLS policies already exist on social_posts table'
    ELSE '✅ PASS: No RLS policy conflicts'
  END as policy_check;

\echo ''

-- =====================================================
-- CHECK 10: Required columns in business_profiles
-- =====================================================
\echo '✓ CHECK 10: Verifying all required business_profiles columns...'

SELECT 
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN column_name IN ('id', 'user_id', 'business_name', 'effective_tier') THEN '✅ Required for Social Wizard'
    ELSE 'ℹ️  Optional'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_profiles'
  AND column_name IN ('id', 'user_id', 'business_name', 'effective_tier', 'city', 'status')
ORDER BY 
  CASE column_name 
    WHEN 'id' THEN 1
    WHEN 'user_id' THEN 2
    WHEN 'business_name' THEN 3
    WHEN 'effective_tier' THEN 4
    ELSE 5
  END;

\echo ''

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
\echo '========================================='
\echo 'SUMMARY & RECOMMENDATIONS'
\echo '========================================='

SELECT 
  CASE 
    -- Check all critical conditions
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_profiles')
      THEN '❌ CRITICAL: business_profiles table missing - DO NOT RUN MIGRATION'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_profiles' AND column_name = 'user_id')
      THEN '❌ CRITICAL: user_id column missing - DO NOT RUN MIGRATION'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_posts')
      THEN '⚠️  WARNING: social_posts already exists - check if migration was already run'
    WHEN (SELECT COUNT(*) FROM business_profiles WHERE user_id IS NOT NULL) = 0
      THEN '⚠️  WARNING: No businesses with user_id found - you will need to create/update data to test'
    ELSE '✅ SAFE TO RUN MIGRATION - all checks passed'
  END as final_recommendation;

\echo ''
\echo '========================================='
\echo 'NEXT STEPS IF SAFE:'
\echo '========================================='
\echo '1. Run the migration: 20260204000001_create_social_wizard_v1.sql'
\echo '2. Verify with: SELECT COUNT(*) FROM social_posts;'
\echo '3. Test access at: http://localhost:3000/business/social-wizard'
\echo '========================================='
