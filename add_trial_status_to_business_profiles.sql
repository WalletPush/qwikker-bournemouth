-- ✅ SAFEST SOLUTION: Add trial status directly to business_profiles
-- This avoids RLS complexity and keeps multi-tenant isolation intact

-- Add computed field for trial status
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS is_trial_expired BOOLEAN 
GENERATED ALWAYS AS (
  CASE
    WHEN EXISTS (
      SELECT 1 FROM business_subscriptions bs
      WHERE bs.business_id = business_profiles.id
      AND bs.is_in_free_trial = true
      AND bs.free_trial_end_date < NOW()
    )
    THEN true
    ELSE false
  END
) STORED;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_trial_expired 
ON business_profiles(is_trial_expired) 
WHERE is_trial_expired = true;

-- Verify it works
SELECT 
  business_name,
  is_trial_expired,
  (SELECT free_trial_end_date FROM business_subscriptions WHERE business_id = business_profiles.id LIMIT 1) as trial_end
FROM business_profiles
WHERE city = 'bournemouth'
ORDER BY business_name;

