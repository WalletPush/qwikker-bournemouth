-- ============================================================================
-- ADD CALGARY AS A FRANCHISE CITY
-- Run this in Supabase SQL Editor to add Calgary
-- ============================================================================

-- 1. Add Calgary to franchise_crm_configs
INSERT INTO franchise_crm_configs (
  -- Basic info
  city,
  display_name,
  country_code,
  country_name,
  currency_code,
  currency_symbol,
  
  -- Coordinates (for Google Places imports)
  latitude,
  longitude,
  
  -- Trial configuration (same as Bournemouth)
  trial_length_days,
  founding_member_discount,
  founding_member_until,
  
  -- Email config
  resend_from_email,
  
  -- Status
  status,
  
  -- Timestamps
  created_at,
  updated_at
) VALUES (
  'calgary',                          -- MUST be lowercase, no spaces
  'Calgary',                          -- Display name
  'CA',                               -- Canada
  'Canada',
  'CAD',                              -- Canadian Dollar
  '$',                                -- Currency symbol (same as USD but different code)
  
  51.0447,                            -- Calgary latitude
  -114.0719,                          -- Calgary longitude
  
  90,                                 -- 90-day trial
  20,                                 -- 20% founding member discount
  '2026-03-31',                       -- Founding member deadline
  
  'calgary@qwikker.com',              -- From email for Calgary
  
  'active',                           -- Make it live immediately
  
  NOW(),
  NOW()
)
ON CONFLICT (city) DO UPDATE SET
  updated_at = NOW();

-- 2. Verify Calgary was added
SELECT 
  city,
  display_name,
  country_code,
  currency_code,
  latitude,
  longitude,
  status
FROM franchise_crm_configs
WHERE city = 'calgary';

-- Expected: 1 row returned with Calgary details

-- 3. Check all cities
SELECT 
  city,
  display_name,
  country_code,
  status,
  created_at
FROM franchise_crm_configs
ORDER BY city;

-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS:
-- ============================================================================

-- 1. Test subdomain detection:
--    curl http://calgary.localhost:3000/api/internal/get-city
--    Expected: {"success":true,"city":"calgary"}

-- 2. Test discover page:
--    http://calgary.localhost:3000/user/discover
--    Should load without errors (might be empty if no businesses yet)

-- 3. Import businesses for Calgary:
--    http://calgary.localhost:3000/admin/import
--    (Need to add Google Places API key first)

-- ============================================================================
-- TO ADD MORE CITIES:
-- ============================================================================

-- Copy the INSERT statement above and change:
-- - city (slug, lowercase): 'london', 'paris', etc.
-- - display_name: 'London', 'Paris', etc.
-- - country_code: 'GB', 'FR', etc.
-- - country_name: 'United Kingdom', 'France', etc.
-- - currency_code: 'GBP', 'EUR', etc.
-- - currency_symbol: '£', '€', etc.
-- - latitude/longitude: Get from Google Maps
-- - resend_from_email: city@qwikker.com

