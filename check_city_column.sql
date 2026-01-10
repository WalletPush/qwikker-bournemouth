-- CRITICAL: Check the 'city' column value (this is what the Discover page filters by)
-- The business_town is just for display, but 'city' is used for filtering!

SELECT 
  business_name,
  status,
  city,           -- ⚠️ THIS is what the query filters by
  business_town,  -- This is just for display
  CASE 
    WHEN city = 'bournemouth' THEN '✅ CORRECT'
    WHEN city IS NULL THEN '❌ NULL (WILL NOT SHOW!)'
    ELSE '⚠️ WRONG: ' || city
  END as city_check
FROM business_profiles
WHERE status = 'unclaimed'
ORDER BY business_name;

