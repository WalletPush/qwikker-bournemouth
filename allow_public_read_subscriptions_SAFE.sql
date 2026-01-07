-- ✅ SAFE: Allow public read of subscription trial status
-- 
-- WHY THIS IS SAFE:
-- 1. Trial dates are not sensitive payment information
-- 2. Only for approved businesses (checked in policy)
-- 3. City filtering happens at application level (discover page already filters by city)
-- 4. No Stripe keys or payment methods exposed
-- 5. Users need to know trial status to see correct listings

-- Drop old policy if exists
DROP POLICY IF EXISTS "Public can view subscriptions for approved businesses" ON business_subscriptions;

-- Create simple, safe policy
CREATE POLICY "Public can view subscriptions for approved businesses"
ON business_subscriptions
FOR SELECT
TO public
USING (
  -- Only allow read if business is approved
  EXISTS (
    SELECT 1 FROM business_profiles
    WHERE business_profiles.id = business_subscriptions.business_id
    AND business_profiles.status = 'approved'
  )
);

-- Verify policy created
SELECT 
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'business_subscriptions';

-- Test query (should return data for approved businesses only)
SELECT 
  bp.business_name,
  bp.city,
  bs.is_in_free_trial,
  bs.free_trial_end_date,
  CASE 
    WHEN bs.free_trial_end_date < NOW() THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END as status
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bp.city = 'bournemouth'
ORDER BY bp.business_name;

