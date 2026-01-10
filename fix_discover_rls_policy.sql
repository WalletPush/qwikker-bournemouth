-- Fix RLS policy to allow unclaimed and claimed_free businesses to be visible in Discover
-- This allows the user-facing Discover page to show all discoverable businesses

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Anyone can read approved businesses" ON business_profiles;

-- Create new policy that includes unclaimed and claimed_free
CREATE POLICY "Anyone can read discoverable businesses"
ON business_profiles
FOR SELECT
TO public
USING (
  status IN ('approved', 'unclaimed', 'claimed_free')
);

-- Verify the new policy
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'business_profiles' 
  AND policyname = 'Anyone can read discoverable businesses';
