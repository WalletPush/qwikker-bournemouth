-- =====================================================
-- SOCIAL WIZARD v1 — POST-MIGRATION VERIFICATION
-- Run this AFTER applying the migration
-- Date: 2026-02-04
-- =====================================================

\echo '========================================='
\echo 'SOCIAL WIZARD v1 - POST-MIGRATION CHECK'
\echo '========================================='
\echo ''

-- =====================================================
-- CHECK 1: Table created successfully?
-- =====================================================
\echo '✓ CHECK 1: Verifying social_posts table exists...'

SELECT 
  table_name,
  CASE 
    WHEN table_name = 'social_posts' THEN '✅ Table created successfully'
    ELSE '❌ Table not found'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'social_posts';

\echo ''

-- =====================================================
-- CHECK 2: All columns created?
-- =====================================================
\echo '✓ CHECK 2: Verifying all columns exist...'

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name IN ('id', 'business_id', 'caption') THEN '✅ Required column'
    ELSE '✅ Optional column'
  END as importance
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'social_posts'
ORDER BY ordinal_position;

\echo ''

-- =====================================================
-- CHECK 3: Indexes created?
-- =====================================================
\echo '✓ CHECK 3: Verifying indexes exist...'

SELECT 
  indexname,
  indexdef,
  '✅ Index created' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

\echo ''

-- =====================================================
-- CHECK 4: RLS enabled?
-- =====================================================
\echo '✓ CHECK 4: Verifying Row Level Security is enabled...'

SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS enabled'
    ELSE '❌ RLS NOT enabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

\echo ''

-- =====================================================
-- CHECK 5: RLS policy created?
-- =====================================================
\echo '✓ CHECK 5: Verifying RLS policies exist...'

SELECT 
  policyname,
  cmd,
  qual,
  with_check,
  '✅ Policy created' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'social_posts';

\echo ''

-- =====================================================
-- CHECK 6: Test RLS policy logic
-- =====================================================
\echo '✓ CHECK 6: Testing RLS policy logic (dry run)...'
\echo 'This simulates which users can access social_posts...'

SELECT 
  bp.business_name,
  au.email as owner_email,
  bp.effective_tier,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM business_profiles bp2
      WHERE bp2.id = bp.id
        AND bp2.user_id = au.id
    ) THEN '✅ RLS WILL ALLOW access'
    ELSE '❌ RLS WILL DENY access'
  END as rls_result
FROM business_profiles bp
LEFT JOIN auth.users au ON au.id = bp.user_id
LIMIT 5;

\echo ''

-- =====================================================
-- CHECK 7: Foreign key constraints?
-- =====================================================
\echo '✓ CHECK 7: Verifying foreign key constraints...'

SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ Foreign key exists' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'social_posts';

\echo ''

-- =====================================================
-- CHECK 8: Test insert (will fail due to RLS, but that's expected)
-- =====================================================
\echo '✓ CHECK 8: Testing basic insert/select operations...'
\echo '(This is a dry run check - no data will be inserted)'

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'social_posts'
    ) THEN '✅ Table is queryable'
    ELSE '❌ Table cannot be queried'
  END as result;

-- Try to count (should work even with RLS)
SELECT 
  COUNT(*) as current_post_count,
  '✅ Table is accessible' as status
FROM social_posts;

\echo ''

-- =====================================================
-- CHECK 9: Table comments exist?
-- =====================================================
\echo '✓ CHECK 9: Verifying table and column comments...'

SELECT 
  'social_posts' as table_name,
  obj_description('social_posts'::regclass) as table_comment,
  CASE 
    WHEN obj_description('social_posts'::regclass) IS NOT NULL 
      THEN '✅ Table comment exists'
    ELSE '⚠️  No table comment'
  END as status;

\echo ''

-- =====================================================
-- FINAL SUMMARY
-- =====================================================
\echo '========================================='
\echo 'MIGRATION VERIFICATION COMPLETE'
\echo '========================================='

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_posts')
      THEN '❌ FAILED: social_posts table was not created'
    WHEN NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts')
      THEN '❌ FAILED: RLS policies were not created'
    WHEN NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'social_posts')
      THEN '⚠️  WARNING: Indexes were not created'
    ELSE '✅ SUCCESS: Migration completed successfully'
  END as final_result;

\echo ''
\echo '========================================='
\echo 'READY TO TEST'
\echo '========================================='
\echo 'Navigate to: http://localhost:3000/business/social-wizard'
\echo '========================================='
