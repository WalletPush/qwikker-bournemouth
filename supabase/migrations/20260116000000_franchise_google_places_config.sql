-- Add Google Places configuration and geographic settings to franchise_crm_configs
-- This enables per-franchise API keys, radius controls, and location-based restrictions

-- Add new columns for Google Places configuration
ALTER TABLE public.franchise_crm_configs
  ADD COLUMN IF NOT EXISTS google_places_public_key text,
  ADD COLUMN IF NOT EXISTS google_places_server_key text,
  ADD COLUMN IF NOT EXISTS google_places_country text DEFAULT 'gb',
  ADD COLUMN IF NOT EXISTS city_center_lat numeric,
  ADD COLUMN IF NOT EXISTS city_center_lng numeric,
  ADD COLUMN IF NOT EXISTS onboarding_search_radius_m integer DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS import_search_radius_m integer DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS import_max_radius_m integer DEFAULT 200000;

-- Add index for city lookups
CREATE INDEX IF NOT EXISTS idx_franchise_crm_configs_city ON public.franchise_crm_configs(city);

-- Add helpful comments
COMMENT ON COLUMN public.franchise_crm_configs.google_places_public_key IS 'Browser-safe Google Places API key restricted by HTTP referrers (per franchise)';
COMMENT ON COLUMN public.franchise_crm_configs.google_places_server_key IS 'Server-side Google Places API key for Places Details (per franchise; billing belongs to franchise)';
COMMENT ON COLUMN public.franchise_crm_configs.google_places_country IS 'ISO country code for Places API restrictions (e.g. "gb", "us")';
COMMENT ON COLUMN public.franchise_crm_configs.city_center_lat IS 'Latitude of franchise city center for geographic bounds';
COMMENT ON COLUMN public.franchise_crm_configs.city_center_lng IS 'Longitude of franchise city center for geographic bounds';
COMMENT ON COLUMN public.franchise_crm_configs.onboarding_search_radius_m IS 'Meters: onboarding autocomplete strict bounds radius';
COMMENT ON COLUMN public.franchise_crm_configs.import_search_radius_m IS 'Default meters for admin import tool radius';
COMMENT ON COLUMN public.franchise_crm_configs.import_max_radius_m IS 'Upper limit for import slider to prevent excessive API usage';

-- Seed default values for existing franchises (adjust as needed)
UPDATE public.franchise_crm_configs
SET 
  onboarding_search_radius_m = COALESCE(onboarding_search_radius_m, 35000),
  import_search_radius_m = COALESCE(import_search_radius_m, 75000),
  import_max_radius_m = COALESCE(import_max_radius_m, 200000),
  city_center_lat = CASE city
    WHEN 'bournemouth' THEN 50.7192
    WHEN 'poole' THEN 50.7150
    WHEN 'christchurch' THEN 50.7357
    ELSE city_center_lat
  END,
  city_center_lng = CASE city
    WHEN 'bournemouth' THEN -1.8808
    WHEN 'poole' THEN -1.9872
    WHEN 'christchurch' THEN -1.7785
    ELSE city_center_lng
  END
WHERE city IN ('bournemouth', 'poole', 'christchurch');

-- Note: Franchise admins must add their own Google Places API keys via HQ admin UI
