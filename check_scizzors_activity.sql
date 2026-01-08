-- Check Scizzors business profile for activity feed
SELECT 
  id,
  business_name,
  status,
  created_at,
  updated_at,
  approved_at,
  city,
  -- Calculate time difference
  EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 as minutes_between_create_and_update
FROM business_profiles
WHERE business_name ILIKE '%scizzor%'
ORDER BY updated_at DESC;
