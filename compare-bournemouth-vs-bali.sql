-- Compare Bournemouth (working) vs Bali (not working)
SELECT 
  city,
  status,
  atlas_enabled,
  -- Check BOTH possible column names
  google_places_api_key IS NOT NULL as has_api_key,
  google_places_public_key IS NOT NULL as has_public_key,
  mapbox_public_token IS NOT NULL as has_mapbox_token,
  -- Show previews
  CASE 
    WHEN google_places_api_key IS NOT NULL THEN CONCAT(LEFT(google_places_api_key, 15), '...')
    ELSE 'NULL'
  END as api_key,
  CASE 
    WHEN google_places_public_key IS NOT NULL THEN CONCAT(LEFT(google_places_public_key, 15), '...')
    ELSE 'NULL'
  END as public_key,
  -- Verdict
  CASE 
    WHEN status = 'active' AND atlas_enabled = true AND mapbox_public_token IS NOT NULL 
    THEN '✅ Should work'
    ELSE '❌ Won''t work'
  END as atlas_verdict
FROM franchise_crm_configs
WHERE city IN ('bournemouth', 'bali')
ORDER BY city;
