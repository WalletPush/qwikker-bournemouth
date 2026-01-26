-- Check if Bournemouth and London have GHL API keys
SELECT 
  city,
  CASE 
    WHEN ghl_api_key IS NOT NULL AND ghl_api_key != '' 
    THEN '✅ HAS API KEY' 
    ELSE '❌ NO API KEY' 
  END as api_key_status,
  CASE 
    WHEN ghl_location_id IS NOT NULL AND ghl_location_id != '' 
    THEN '✅ HAS LOCATION ID' 
    ELSE '❌ NO LOCATION ID' 
  END as location_id_status
FROM franchise_crm_configs 
WHERE city IN ('bournemouth', 'london')
ORDER BY city;
