-- Atlas Configuration Sanity Check
-- Run this to verify all franchise Atlas configs

SELECT 
  city,
  status,
  atlas_enabled,
  (mapbox_public_token IS NOT NULL) AS has_token,
  (mapbox_style_url IS NOT NULL) AS has_style,
  CASE 
    WHEN atlas_enabled AND mapbox_public_token IS NOT NULL 
      AND mapbox_style_url IS NOT NULL 
      AND lat IS NOT NULL 
      AND lng IS NOT NULL 
    THEN '✓ Ready'
    WHEN atlas_enabled THEN '⚠ Incomplete'
    ELSE '○ Disabled'
  END AS atlas_status,
  lat,
  lng,
  atlas_min_rating,
  atlas_max_results,
  onboarding_search_radius_m,
  import_search_radius_m,
  import_max_radius_m,
  ROUND(import_search_radius_m / 1609.34, 1) AS import_radius_miles,
  ROUND(import_max_radius_m / 1609.34, 1) AS max_radius_miles
FROM franchise_crm_configs
ORDER BY city;

-- Check for config issues
SELECT 
  city,
  'Missing city center' AS issue
FROM franchise_crm_configs
WHERE atlas_enabled = TRUE AND (lat IS NULL OR lng IS NULL)

UNION ALL

SELECT 
  city,
  'Missing Mapbox token' AS issue
FROM franchise_crm_configs
WHERE atlas_enabled = TRUE AND mapbox_public_token IS NULL

UNION ALL

SELECT 
  city,
  'Missing style URL' AS issue
FROM franchise_crm_configs
WHERE atlas_enabled = TRUE AND mapbox_style_url IS NULL

UNION ALL

SELECT 
  city,
  'Import radius exceeds max' AS issue
FROM franchise_crm_configs
WHERE import_search_radius_m > import_max_radius_m;
