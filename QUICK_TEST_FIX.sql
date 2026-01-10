-- Quick fix for existing claimed business
UPDATE business_profiles
SET user_id = owner_user_id
WHERE status = 'claimed_free'
  AND user_id IS NULL
  AND owner_user_id IS NOT NULL;

-- Verify
SELECT 
  business_name,
  status,
  user_id IS NOT NULL as has_user_id,
  owner_user_id IS NOT NULL as has_owner_id
FROM business_profiles
WHERE status = 'claimed_free';
