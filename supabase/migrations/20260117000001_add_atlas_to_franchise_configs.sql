-- ============================================================================
-- ATLAS: Add map-based discovery fields to franchise_crm_configs
-- ============================================================================
-- Atlas is a full-screen map mode inside AI Companion
-- Each franchise configures their own Mapbox token (NO CENTRAL BILLING)
-- ============================================================================

-- Add Atlas configuration fields
DO $$ 
BEGIN
  -- Atlas enabled flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_enabled') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_enabled BOOLEAN DEFAULT false;
  END IF;
  
  -- Map provider (mapbox is default, could support others later)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_provider') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_provider TEXT DEFAULT 'mapbox';
  END IF;
  
  -- Mapbox public token (safe to send to browser)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'mapbox_public_token') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN mapbox_public_token TEXT;
  END IF;
  
  -- Mapbox style URL (dark atmospheric theme)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'mapbox_style_url') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN mapbox_style_url TEXT;
  END IF;
  
  -- Map view settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_default_zoom') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_default_zoom NUMERIC DEFAULT 13;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_pitch') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_pitch NUMERIC DEFAULT 45;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_bearing') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_bearing NUMERIC DEFAULT 0;
  END IF;
  
  -- Search/filter settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_max_results') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_max_results INTEGER DEFAULT 12;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_min_rating') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_min_rating NUMERIC DEFAULT 4.4;
  END IF;
  
  -- Atlas mode: 'curated' (high-rated only) or 'all' (all businesses)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'franchise_crm_configs' AND column_name = 'atlas_mode') THEN
    ALTER TABLE franchise_crm_configs ADD COLUMN atlas_mode TEXT DEFAULT 'curated';
  END IF;
  
END $$;

-- Add helpful comments
COMMENT ON COLUMN franchise_crm_configs.atlas_enabled IS 'Enable full-screen map discovery mode in AI Companion';
COMMENT ON COLUMN franchise_crm_configs.atlas_provider IS 'Map provider (mapbox is default)';
COMMENT ON COLUMN franchise_crm_configs.mapbox_public_token IS 'Mapbox public token (safe for browser, franchise-specific)';
COMMENT ON COLUMN franchise_crm_configs.mapbox_style_url IS 'Mapbox style URL for dark atmospheric theme';
COMMENT ON COLUMN franchise_crm_configs.atlas_default_zoom IS 'Default map zoom level (13 = city view)';
COMMENT ON COLUMN franchise_crm_configs.atlas_pitch IS 'Map pitch angle in degrees (45 = 3D perspective)';
COMMENT ON COLUMN franchise_crm_configs.atlas_bearing IS 'Map bearing/rotation in degrees (0 = north)';
COMMENT ON COLUMN franchise_crm_configs.atlas_max_results IS 'Maximum number of businesses to show on map at once';
COMMENT ON COLUMN franchise_crm_configs.atlas_min_rating IS 'Minimum rating for businesses to appear in Atlas (default 4.4)';
COMMENT ON COLUMN franchise_crm_configs.atlas_mode IS 'Atlas mode: curated (high-rated) or all (all businesses)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Atlas migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📍 Added fields to franchise_crm_configs:';
  RAISE NOTICE '   - atlas_enabled (false by default)';
  RAISE NOTICE '   - atlas_provider, mapbox_public_token, mapbox_style_url';
  RAISE NOTICE '   - atlas_default_zoom, atlas_pitch, atlas_bearing';
  RAISE NOTICE '   - atlas_max_results, atlas_min_rating, atlas_mode';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security: Each franchise uses their OWN Mapbox token';
  RAISE NOTICE '🗺️  Atlas is disabled by default (enable per franchise)';
  RAISE NOTICE '';
END $$;
