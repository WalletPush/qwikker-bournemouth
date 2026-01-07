-- ✅ SAFE: Multi-tenant RLS policy for business_subscriptions
-- This allows Discover page to check trial status while maintaining city isolation

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view trial status for approved businesses in same city" ON business_subscriptions;

-- Create SAFE, city-aware policy
CREATE POLICY "Public can view trial status for approved businesses in same city"
ON business_subscriptions
FOR SELECT
USING (
  -- Can read if:
  -- 1. Business is approved
  -- 2. Business is in the requester's city (multi-tenant safety)
  EXISTS (
    SELECT 1 FROM business_profiles bp
    WHERE bp.id = business_subscriptions.business_id
    AND bp.status = 'approved'
    -- CRITICAL: Match city from current_setting (set by app)
    -- This prevents cross-city data leaks
    AND bp.city = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'city',
      current_setting('app.current_city', true)
    )
  )
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'business_subscriptions'
AND policyname LIKE '%same city%';

-- Test: Should return policies
SELECT policyname FROM pg_policies WHERE tablename = 'business_subscriptions';

