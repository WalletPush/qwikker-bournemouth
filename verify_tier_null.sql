-- Check if the tier was set to NULL
SELECT 
  business_name,
  status,
  business_tier,
  visibility
FROM business_profiles
WHERE status = 'unclaimed'
  AND city = 'bournemouth'
ORDER BY business_name;

