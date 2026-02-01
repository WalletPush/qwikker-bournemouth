-- Check if Bali has Google Places API key configured
SELECT 
  city,
  google_places_api_key IS NOT NULL as has_api_key,
  google_places_public_key IS NOT NULL as has_public_key,
  CASE 
    WHEN google_places_public_key IS NOT NULL THEN CONCAT(LEFT(google_places_public_key, 15), '...')
    ELSE 'NULL'
  END as public_key_preview,
  CASE 
    WHEN google_places_api_key IS NOT NULL THEN CONCAT(LEFT(google_places_api_key, 15), '...')
    ELSE 'NULL'
  END as api_key_preview
FROM franchise_crm_configs
WHERE city = 'bali';
