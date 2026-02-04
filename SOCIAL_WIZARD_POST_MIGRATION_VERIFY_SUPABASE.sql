-- =====================================================
-- SOCIAL WIZARD v1 — POST-MIGRATION VERIFICATION
-- SUPABASE DASHBOARD VERSION (Pure SQL)
-- Run this AFTER applying the migration
-- Date: 2026-02-04
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'SOCIAL WIZARD v1 - POST-MIGRATION VERIFY';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CHECK 1: Table created?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 1: Verifying social_posts table...';
END $$;

SELECT 
  table_name as "Table Name",
  CASE 
    WHEN table_name = 'social_posts' THEN '✅ Table created successfully'
    ELSE '❌ Table not found'
  END as "Status"
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'social_posts';

-- =====================================================
-- CHECK 2: All columns created?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 2: Verifying all columns...';
END $$;

SELECT 
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  CASE 
    WHEN column_name IN ('id', 'business_id', 'caption') THEN '✅ Required'
    ELSE '✅ Optional'
  END as "Importance"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'social_posts'
ORDER BY ordinal_position;

-- =====================================================
-- CHECK 3: Indexes created?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 3: Verifying indexes...';
END $$;

SELECT 
  indexname as "Index Name",
  '✅ Created' as "Status"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

-- =====================================================
-- CHECK 4: RLS enabled?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 4: Verifying RLS is enabled...';
END $$;

SELECT 
  tablename as "Table",
  CASE 
    WHEN rowsecurity THEN '✅ RLS enabled'
    ELSE '❌ RLS NOT enabled'
  END as "Status"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

-- =====================================================
-- CHECK 5: RLS policies created?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 5: Verifying RLS policies...';
END $$;

SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  '✅ Policy created' as "Status"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

-- =====================================================
-- CHECK 6: Test RLS logic
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 6: Testing RLS policy logic...';
END $$;

SELECT 
  bp.business_name as "Business",
  au.email as "Owner Email",
  bp.effective_tier as "Tier",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM business_profiles bp2
      WHERE bp2.id = bp.id
        AND bp2.user_id = au.id
    ) THEN '✅ Will have access'
    ELSE '❌ No access'
  END as "RLS Result"
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
LIMIT 5;

-- =====================================================
-- CHECK 7: Foreign keys?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 7: Verifying foreign keys...';
END $$;

SELECT 
  tc.constraint_name as "Constraint",
  kcu.column_name as "Column",
  ccu.table_name AS "References Table",
  ccu.column_name AS "References Column",
  '✅ FK exists' as "Status"
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'social_posts';

-- =====================================================
-- CHECK 8: Basic query test
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 8: Testing basic queries...';
END $$;

SELECT 
  COUNT(*) as "Current Posts Count",
  '✅ Table is queryable' as "Status"
FROM social_posts;

-- =====================================================
-- CHECK 9: Table comments?
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'CHECK 9: Verifying documentation...';
END $$;

SELECT 
  'social_posts' as "Table",
  CASE 
    WHEN obj_description('social_posts'::regclass) IS NOT NULL 
      THEN '✅ Has description'
    ELSE '⚠️  No description'
  END as "Table Comment"
FROM information_schema.tables
WHERE table_name = 'social_posts'
LIMIT 1;

-- =====================================================
-- FINAL RESULT
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION COMPLETE';
  RAISE NOTICE '=========================================';
END $$;

SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'social_posts'
    ) THEN '❌ FAILED: social_posts table not created'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'social_posts'
    ) THEN '❌ FAILED: RLS policies not created'
    
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND tablename = 'social_posts'
    ) THEN '⚠️  WARNING: Indexes not created'
    
    ELSE '✅ ✅ ✅ SUCCESS: Migration completed successfully! ✅ ✅ ✅'
  END as "🎯 FINAL RESULT";

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Test at http://localhost:3000/business/social-wizard';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '';
END $$;
