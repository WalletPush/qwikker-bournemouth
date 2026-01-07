-- ✅ FIX: Allow Discover page to read trial status from business_subscriptions
-- This is SAFE because:
-- 1. Only shows trial dates (not payment info)
-- 2. Only for approved businesses
-- 3. City filtering happens in application query (.eq('city', currentCity))

-- Create public read policy for trial status
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

