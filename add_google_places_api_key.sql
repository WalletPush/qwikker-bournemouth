-- Add Google Places API key to franchise_crm_configs
-- This allows each franchise to use their own Google Cloud account

ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN franchise_crm_configs.google_places_api_key IS 'Google Places API key for importing businesses and displaying photos. Get from console.cloud.google.com';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND column_name = 'google_places_api_key';

