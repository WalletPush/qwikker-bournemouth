-- Debug: Check what the status changes query would return
SELECT 
  id,
  business_name,
  status,
  business_town,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 as minutes_diff
FROM business_profiles
WHERE business_name ILIKE '%scizzor%'
ORDER BY updated_at DESC
LIMIT 20;
