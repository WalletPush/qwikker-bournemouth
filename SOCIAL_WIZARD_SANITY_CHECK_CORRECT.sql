-- =====================================================
-- SOCIAL WIZARD v1 — PRE-MIGRATION SANITY CHECK
-- CORRECTED FOR YOUR ACTUAL DATABASE SCHEMA
-- Date: 2026-02-04
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'SOCIAL WIZARD v1 - SANITY CHECK';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CHECK 1: Does social_posts table already exist?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 1: social_posts table existence...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'social_posts'
    ) THEN '⚠️  WARNING: social_posts ALREADY EXISTS - migration may fail'
    ELSE '✅ PASS: social_posts does not exist - safe to create'
  END as "CHECK 1: Table Existence";

-- =====================================================
-- CHECK 2: Does business_profiles table exist?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 2: business_profiles table...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
    ) THEN '✅ PASS: business_profiles table exists'
    ELSE '❌ FAIL: business_profiles table MISSING'
  END as "CHECK 2: business_profiles";

-- =====================================================
-- CHECK 3: Does business_profiles have user_id?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 3: user_id column...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'business_profiles'
      AND column_name = 'user_id'
    ) THEN '✅ PASS: user_id column exists'
    ELSE '❌ FAIL: user_id column MISSING'
  END as "CHECK 3: user_id Column";

-- =====================================================
-- CHECK 4: user_id column details
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 4: user_id column details...';
END $$;

SELECT 
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  CASE 
    WHEN data_type = 'uuid' THEN '✅ Correct type'
    ELSE '⚠️  Type: ' || data_type
  END as "Type Check"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_profiles'
  AND column_name = 'user_id';

-- =====================================================
-- CHECK 5: Existing business data
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 5: Business data...';
END $$;

SELECT 
  COUNT(*) as "Total Businesses",
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as "With user_id",
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as "Without user_id",
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️  No businesses found'
    WHEN COUNT(CASE WHEN user_id IS NULL THEN 1 END) > 0 THEN '⚠️  Some NULL user_id'
    ELSE '✅ All have user_id'
  END as "Status"
FROM business_profiles;

-- =====================================================
-- CHECK 6: Sample businesses (using YOUR actual columns)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 6: Sample business data...';
END $$;

SELECT 
  bp.business_name as "Business Name",
  SUBSTRING(bp.user_id::text, 1, 8) || '...' as "User ID",
  bp.plan as "Plan",
  bp.status as "Status",
  au.email as "Owner Email",
  CASE 
    WHEN bp.plan = 'spotlight' THEN '✅ FULL ACCESS (campaigns, secret menu, Claude AI)'
    WHEN bp.plan = 'trial' THEN '⚠️  LIMITED (Featured trial: basic generation, OpenAI, no campaigns)'
    WHEN bp.plan = 'featured' THEN '⚠️  LIMITED (basic generation, OpenAI, no campaigns, no secret menu)'
    WHEN bp.plan IN ('starter', 'free') THEN '❌ LOCKED (will see upgrade screen)'
    ELSE '❓ Unknown plan: ' || COALESCE(bp.plan, 'NULL')
  END as "Social Wizard Access"
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
WHERE bp.user_id IS NOT NULL
ORDER BY bp.created_at DESC
LIMIT 5;

-- =====================================================
-- CHECK 7: auth.uid() function
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 7: auth.uid() function...';
END $$;

SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN '✅ Returns NULL (not in user session)'
    ELSE '✅ Returns: ' || SUBSTRING(auth.uid()::text, 1, 8) || '...'
  END as "CHECK 7: auth.uid()";

-- =====================================================
-- CHECK 8: RLS preview (who will have access)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 8: RLS access preview...';
END $$;

SELECT 
  au.email as "User Email",
  bp.business_name as "Business Name",
  bp.plan as "Plan",
  CASE 
    WHEN bp.user_id = au.id THEN '✅ Will have access (owner)'
    ELSE '❌ No access'
  END as "After Migration"
FROM business_profiles bp
INNER JOIN auth.users au ON au.id = bp.user_id
WHERE bp.user_id IS NOT NULL
ORDER BY au.email
LIMIT 10;

-- =====================================================
-- CHECK 9: Naming conflicts
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 9: Naming conflicts...';
END $$;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public'
        AND tablename = 'social_posts'
    ) THEN '⚠️  Policies exist - migration may have run already'
    ELSE '✅ No conflicts'
  END as "CHECK 9: Policies";

-- =====================================================
-- CHECK 10: Required columns in business_profiles
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 10: Required columns...';
END $$;

SELECT 
  column_name as "Column",
  data_type as "Type",
  CASE 
    WHEN column_name IN ('id', 'user_id', 'business_name', 'plan') 
      THEN '✅ Required'
    ELSE 'ℹ️  Optional'
  END as "For Social Wizard"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'business_profiles'
  AND column_name IN ('id', 'user_id', 'business_name', 'plan', 'city', 'status')
ORDER BY 
  CASE column_name 
    WHEN 'id' THEN 1
    WHEN 'user_id' THEN 2
    WHEN 'business_name' THEN 3
    WHEN 'plan' THEN 4
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
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'business_profiles'
    ) THEN '❌ CRITICAL: business_profiles missing - DO NOT RUN'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'business_profiles' 
        AND column_name = 'user_id'
    ) THEN '❌ CRITICAL: user_id missing - DO NOT RUN'
    
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'social_posts'
    ) THEN '⚠️  WARNING: social_posts exists - check if already migrated'
    
    WHEN (
      SELECT COUNT(*) FROM business_profiles WHERE user_id IS NOT NULL
    ) = 0 THEN '⚠️  WARNING: No businesses with user_id to test'
    
    ELSE '✅ ✅ ✅ SAFE TO RUN MIGRATION ✅ ✅ ✅'
  END as "🎯 FINAL RECOMMENDATION";

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run the migration file if SAFE';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;
