-- Migration: Add Free Tier & Founding Member Configuration to Franchise CRM Configs
-- Purpose: Add Google Places API and Founding Member program settings for each franchise
-- Date: 2025-01-07
-- Multi-Tenant: Each franchise manages their own import costs and founding member benefits

-- Add new columns to franchise_crm_configs table
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT,
ADD COLUMN IF NOT EXISTS founding_member_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS founding_member_total_spots INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS founding_member_trial_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS founding_member_discount_percent INTEGER DEFAULT 20 CHECK (founding_member_discount_percent >= 0 AND founding_member_discount_percent <= 100);

-- Add comments to document the new fields
COMMENT ON COLUMN franchise_crm_configs.google_places_api_key IS 'Google Places API key for auto-importing businesses (paid by franchise owner). Cost: ~£0.075/business.';
COMMENT ON COLUMN franchise_crm_configs.founding_member_enabled IS 'Whether the founding member program is active for this franchise';
COMMENT ON COLUMN franchise_crm_configs.founding_member_total_spots IS 'Maximum number of founding member spots available (first X claims)';
COMMENT ON COLUMN franchise_crm_configs.founding_member_trial_days IS 'Length of free Featured tier trial for founding members (in days)';
COMMENT ON COLUMN franchise_crm_configs.founding_member_discount_percent IS 'Lifetime discount percentage for founding members who upgrade (0-100)';

-- Update Bournemouth with default founding member settings
-- NOTE: Admin should add their Google Places API key via the franchise setup UI
UPDATE franchise_crm_configs
SET 
  founding_member_enabled = true,
  founding_member_total_spots = 150,
  founding_member_trial_days = 90,
  founding_member_discount_percent = 20
WHERE city = 'bournemouth';

-- Add helper function to check founding member eligibility
CREATE OR REPLACE FUNCTION is_founding_member_spot_available(p_city TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_total_spots INTEGER;
  v_claimed_spots INTEGER;
BEGIN
  -- Get franchise founding member settings
  SELECT 
    founding_member_enabled,
    founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  -- If not enabled, return false
  IF NOT v_enabled THEN
    RETURN false;
  END IF;
  
  -- Count how many founding member spots have been claimed
  -- TODO: Update this when claim_requests table is created
  -- For now, return true if enabled
  RETURN true;
  
  -- Future implementation:
  -- SELECT COUNT(*) INTO v_claimed_spots
  -- FROM claim_requests
  -- WHERE city = p_city 
  --   AND status = 'approved'
  --   AND is_founding_member = true;
  -- 
  -- RETURN v_claimed_spots < v_total_spots;
END;
$$;

COMMENT ON FUNCTION is_founding_member_spot_available(TEXT) IS 'Checks if founding member spots are still available for a given city/franchise';

