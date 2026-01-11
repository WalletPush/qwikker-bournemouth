-- Quick diagnostic: Check Google Places API key status for Bournemouth
SELECT 
  city,
  CASE 
    WHEN google_places_api_key IS NULL THEN '❌ NOT SET'
    WHEN LENGTH(google_places_api_key) < 30 THEN '⚠️ TOO SHORT (invalid format)'
    ELSE '✅ SET (' || LENGTH(google_places_api_key) || ' chars)'
  END as api_key_status,
  CASE 
    WHEN lat IS NULL OR lng IS NULL THEN '❌ NOT CACHED'
    ELSE '✅ CACHED: ' || lat || ', ' || lng
  END as coordinates,
  COALESCE(country_code, '❌ NULL') as country_code,
  COALESCE(country_name, '❌ NULL') as country_name
FROM franchise_crm_configs
WHERE city = 'bournemouth';

