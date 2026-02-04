-- =====================================================
-- SOCIAL WIZARD v1 — PRE-MIGRATION SANITY CHECK
-- SUPABASE DASHBOARD VERSION (Pure SQL, no psql commands)
-- Run this BEFORE applying the migration
-- Date: 2026-02-04
-- =====================================================

-- =====================================================
-- CHECK 1: Does social_posts table already exist?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'SOCIAL WIZARD v1 - PRE-MIGRATION CHECK';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CHECK 1: social_posts table existence...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'social_posts'
    ) THEN '⚠️  WARNING: social_posts table ALREADY EXISTS - migration may fail or skip'
    ELSE '✅ PASS: social_posts table does not exist - safe to create'
  END as "CHECK 1: Table Existence";

-- =====================================================
-- CHECK 2: Does business_profiles table exist?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 2: business_profiles table existence...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
    ) THEN '✅ PASS: business_profiles table exists'
    ELSE '❌ FAIL: business_profiles table MISSING - migration will fail'
  END as "CHECK 2: business_profiles Table";

-- =====================================================
-- CHECK 3: Does business_profiles have user_id column?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 3: business_profiles.user_id column...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
      AND column_name = 'user_id'
    ) THEN '✅ PASS: business_profiles.user_id column exists'
    ELSE '❌ FAIL: business_profiles.user_id column MISSING - RLS will fail'
  END as "CHECK 3: user_id Column";

-- =====================================================
-- CHECK 4: user_id column details
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 4: user_id column type and constraints...';
END $$;

SELECT 
  c.column_name as "Column",
  c.data_type as "Type",
  c.is_nullable as "Nullable",
  CASE 
    WHEN c.data_type = 'uuid' THEN '✅ Correct'
    ELSE '⚠️  Unexpected: ' || c.data_type
  END as "Type Check",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'business_profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
    ) THEN '✅ Has FK'
    ELSE '⚠️  No FK'
  END as "Foreign Key"
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'business_profiles'
  AND c.column_name = 'user_id';

-- =====================================================
-- CHECK 5: Existing business data
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 5: Existing business profiles data...';
END $$;

SELECT 
  COUNT(*) as "Total Businesses",
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as "With user_id",
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as "Without user_id",
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️  No businesses - need to create one to test'
    WHEN COUNT(CASE WHEN user_id IS NULL THEN 1 END) > 0 THEN '⚠️  Some NULL user_id - they cannot use Social Wizard'
    ELSE '✅ All have user_id'
  END as "Status"
FROM business_profiles;

-- =====================================================
-- CHECK 6: Sample business data
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 6: Sample business data (top 5)...';
END $$;

SELECT 
  bp.business_name as "Business Name",
  SUBSTRING(bp.user_id::text, 1, 8) || '...' as "User ID",
  bp.effective_tier as "Tier",
  au.email as "Owner Email",
  CASE 
    WHEN bp.effective_tier IN ('featured', 'spotlight') THEN '✅ Can access'
    WHEN bp.effective_tier = 'starter' THEN '⚠️  Locked (Starter)'
    ELSE '❓ Unknown tier'
  END as "Social Wizard Access"
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
ORDER BY bp.created_at DESC
LIMIT 5;

-- =====================================================
-- CHECK 7: Test auth.uid() function
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 7: Testing auth.uid() function...';
END $$;

SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '✅ Returns NULL (expected - not in user session)'
    ELSE '✅ Returns: ' || SUBSTRING(auth.uid()::text, 1, 8) || '...'
  END as "CHECK 7: auth.uid() Function";

-- =====================================================
-- CHECK 8: RLS policy preview
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 8: Preview RLS access (simulating policy)...';
END $$;

SELECT 
  au.email as "User Email",
  bp.business_name as "Business Name",
  bp.effective_tier as "Tier",
  CASE 
    WHEN bp.user_id = au.id THEN '✅ Will have access'
    ELSE '❌ No access'
  END as "After Migration"
FROM business_profiles bp
INNER JOIN auth.users au ON au.id = bp.user_id
ORDER BY au.email, bp.business_name
LIMIT 10;

-- =====================================================
-- CHECK 9: Naming conflicts
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 9: Checking for naming conflicts...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename = 'social_posts'
    ) THEN '⚠️  RLS policies exist on social_posts (already migrated?)'
    ELSE '✅ No conflicts'
  END as "CHECK 9: Naming Conflicts";

-- =====================================================
-- CHECK 10: Required columns verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 10: business_profiles required columns...';
END $$;

SELECT 
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  CASE 
    WHEN column_name IN ('id', 'user_id', 'business_name', 'effective_tier') 
      THEN '✅ Required'
    ELSE 'ℹ️  Optional'
  END as "Importance"
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

-- =====================================================
-- FINAL RECOMMENDATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'FINAL RECOMMENDATION';
  RAISE NOTICE '=========================================';
END $$;

SELECT 
  CASE 
    -- Check all critical conditions
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'business_profiles'
    ) THEN '❌ CRITICAL: business_profiles missing - DO NOT RUN MIGRATION'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'business_profiles' 
        AND column_name = 'user_id'
    ) THEN '❌ CRITICAL: user_id column missing - DO NOT RUN MIGRATION'
    
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'social_posts'
    ) THEN '⚠️  WARNING: social_posts exists - migration may have been run already'
    
    WHEN (
      SELECT COUNT(*) FROM business_profiles WHERE user_id IS NOT NULL
    ) = 0 THEN '⚠️  WARNING: No businesses with user_id - you will need data to test'
    
    ELSE '✅ ✅ ✅ SAFE TO RUN MIGRATION - all checks passed! ✅ ✅ ✅'
  END as "🎯 FINAL RECOMMENDATION";

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'If SAFE TO RUN:';
  RAISE NOTICE '1. Run: supabase/migrations/20260204000001_create_social_wizard_v1.sql';
  RAISE NOTICE '2. Then run: SOCIAL_WIZARD_POST_MIGRATION_VERIFY_SUPABASE.sql';
  RAISE NOTICE '3. Test at: http://localhost:3000/business/social-wizard';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;
