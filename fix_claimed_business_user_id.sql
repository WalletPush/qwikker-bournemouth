-- Fix the existing approved claim - set user_id so they can log in
-- This business was approved but user_id wasn't set, so dashboard couldn't load their profile

-- Get the claim_requests record to find the user_id
-- Then update business_profiles to set user_id = owner_user_id

UPDATE business_profiles
SET user_id = owner_user_id
WHERE status = 'claimed_free'
  AND user_id IS NULL
  AND owner_user_id IS NOT NULL;

-- Verify the fix
SELECT 
  business_name,
  status,
  user_id,
  owner_user_id,
  claimed_at
FROM business_profiles
WHERE status = 'claimed_free';
