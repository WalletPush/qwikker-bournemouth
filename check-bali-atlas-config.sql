-- Diagnostic: Check Bali's Atlas configuration
-- This will show if all required fields are set correctly

SELECT 
  city,
  status,
  atlas_enabled,
  mapbox_public_token IS NOT NULL as has_token,
  CASE 
    WHEN mapbox_public_token IS NOT NULL THEN CONCAT(LEFT(mapbox_public_token, 10), '...')
    ELSE NULL
  END as token_preview,
  mapbox_style_url,
  lat,
  lng,
  city_center_lat,
  city_center_lng,
  atlas_default_zoom,
  atlas_pitch,
  atlas_bearing,
  atlas_max_results,
  atlas_min_rating,
  -- Show what conditions are met
  CASE 
    WHEN status = 'active' THEN '✅ Active'
    ELSE '❌ Not Active: ' || COALESCE(status, 'NULL')
  END as status_check,
  CASE 
    WHEN atlas_enabled = true THEN '✅ Enabled'
    WHEN atlas_enabled = false THEN '❌ Disabled'
    ELSE '❌ NULL'
  END as atlas_check,
  CASE 
    WHEN mapbox_public_token IS NOT NULL THEN '✅ Has Token'
    ELSE '❌ No Token'
  END as token_check,
  CASE 
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN '✅ Has Coordinates'
    ELSE '❌ Missing Coordinates'
  END as coords_check,
  -- Overall verdict
  CASE 
    WHEN status = 'active' AND atlas_enabled = true AND mapbox_public_token IS NOT NULL 
    THEN '✅ SHOULD BE VISIBLE'
    ELSE '❌ WILL NOT SHOW - See checks above'
  END as verdict
FROM franchise_crm_configs
WHERE city ILIKE '%bali%';
