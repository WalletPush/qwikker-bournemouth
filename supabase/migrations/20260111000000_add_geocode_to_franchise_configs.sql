-- Add lat/lng coordinates and country constraints to franchise_crm_configs
-- This enables accurate Google Places radius searches without repeated geocoding
-- AND prevents cross-country import errors (e.g., Manchester UK vs Manchester USA)

ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'GB',
ADD COLUMN IF NOT EXISTS country_name TEXT DEFAULT 'United Kingdom';

-- Add index for potential geographic queries
CREATE INDEX IF NOT EXISTS idx_franchise_crm_configs_coords 
ON franchise_crm_configs(lat, lng);

-- Add comments
COMMENT ON COLUMN franchise_crm_configs.lat IS 'City center latitude - cached from Google Geocoding API for accurate Places searches';
COMMENT ON COLUMN franchise_crm_configs.lng IS 'City center longitude - cached from Google Geocoding API for accurate Places searches';
COMMENT ON COLUMN franchise_crm_configs.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., GB, CA, US) - used to constrain Google Places searches to correct country';
COMMENT ON COLUMN franchise_crm_configs.country_name IS 'Full country name - automatically appended to location searches to prevent wrong-country imports';

-- Seed country data for existing franchises
-- This prevents cross-country import errors (e.g., importing Manchester, USA instead of Manchester, UK)

UPDATE franchise_crm_configs
SET country_code = 'GB', country_name = 'United Kingdom'
WHERE city IN ('bournemouth', 'london', 'manchester', 'birmingham', 'liverpool', 'leeds');

UPDATE franchise_crm_configs
SET country_code = 'CA', country_name = 'Canada'
WHERE city IN ('calgary', 'toronto', 'vancouver', 'montreal');

UPDATE franchise_crm_configs
SET country_code = 'US', country_name = 'United States'
WHERE city IN ('newyork', 'losangeles', 'chicago', 'miami');

UPDATE franchise_crm_configs
SET country_code = 'AE', country_name = 'United Arab Emirates'
WHERE city IN ('dubai', 'abudhabi');

-- NOTE: We intentionally do NOT seed approximate coordinates
-- This ensures the first import geocodes precisely using Google's Geocoding API
-- Approximate coords would prevent the "geocode once" optimization from ever running

-- Verify
DO $$
BEGIN
  RAISE NOTICE '✅ Added lat/lng and country columns to franchise_crm_configs';
  RAISE NOTICE '   lat/lng are NULL by default (will geocode precisely on first use)';
  RAISE NOTICE '   country_code/country_name seeded for existing franchises';
  RAISE NOTICE '   Country constraints prevent wrong-country imports (e.g., Manchester UK vs Manchester USA)';
  RAISE NOTICE '   First preview request will geocode precisely and cache coordinates';
  RAISE NOTICE '   Subsequent requests will reuse cached coordinates';
END $$;

