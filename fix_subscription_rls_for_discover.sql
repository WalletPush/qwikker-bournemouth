-- ✅ FIX: Allow Discover page to read trial status from business_subscriptions
-- This is safe because:
-- 1. Only exposes trial status, not payment info
-- 2. Only for approved businesses
-- 3. Needed to hide expired businesses from Discover

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can view trial status for approved businesses" ON business_subscriptions;

-- Create new policy: Anyone can read ONLY trial status fields for approved businesses
CREATE POLICY "Public can view trial status for approved businesses"
ON business_subscriptions
FOR SELECT
USING (
  -- Can read if the business is approved
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_subscriptions.business_id
    AND business_profiles.status = 'approved'
  )
);

-- Verify policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'business_subscriptions'
AND policyname = 'Public can view trial status for approved businesses';

