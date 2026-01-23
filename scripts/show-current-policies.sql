-- ============================================================================
-- SHOW CURRENT RLS POLICIES
-- Purpose: Display ALL current policies to see what's actually enforced
-- ============================================================================

-- Show all policies for the three key tables
SELECT 
  tablename,
  policyname,
  CASE cmd
    WHEN 'SELECT' THEN 'SELECT'
    WHEN 'INSERT' THEN 'INSERT'
    WHEN 'UPDATE' THEN 'UPDATE'
    WHEN 'DELETE' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  roles::text[] as applies_to_roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename IN ('business_offers', 'business_events', 'business_profiles')
ORDER BY tablename, policyname;
