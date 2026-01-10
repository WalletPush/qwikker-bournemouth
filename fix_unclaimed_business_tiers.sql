-- Fix unclaimed businesses to have NULL tier (not "Starter")
-- Run this in Supabase SQL Editor

UPDATE business_profiles
SET business_tier = NULL
WHERE status = 'unclaimed'
  AND city = 'bournemouth';

-- Verify the changes
SELECT 
  business_name,
  status,
  business_tier,
  visibility
FROM business_profiles
WHERE status = 'unclaimed'
  AND city = 'bournemouth'
ORDER BY business_name;

