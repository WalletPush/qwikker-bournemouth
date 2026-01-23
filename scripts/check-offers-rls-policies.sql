-- ============================================================================
-- CHECK BUSINESS_OFFERS RLS POLICIES
-- Purpose: See what Row Level Security policies exist on business_offers
-- ============================================================================

-- 1. Show all RLS policies on business_offers
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
WHERE tablename = 'business_offers'
ORDER BY policyname;

-- ============================================================================

-- 2. Show the actual policy definitions in readable format
SELECT 
  policyname,
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'business_offers'
ORDER BY policyname;

-- ============================================================================

-- 3. Check if there's a city-based policy
SELECT 
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'business_offers'
  AND (qual LIKE '%city%' OR qual LIKE '%current_setting%');
