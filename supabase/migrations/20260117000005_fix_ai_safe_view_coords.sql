-- Migration: Fix AI-safe view to include coordinate filtering
-- Purpose: Ensure ONLY businesses with valid coords and AI-eligible tiers appear
-- Date: 2026-01-17
-- CRITICAL: Prevents free_tier AND coord-less businesses from AI/Atlas

-- Drop existing view
DROP VIEW IF EXISTS business_profiles_ai_eligible CASCADE;

-- Create corrected AI-safe view
CREATE OR REPLACE VIEW business_profiles_ai_eligible AS
SELECT 
  id,
  business_name,
  business_tagline,
  system_category,
  display_category,
  business_tier,
  business_address,
  business_town,
  logo,
  business_images,
  rating,
  review_count,
  owner_user_id,
  claimed_at,
  latitude,
  longitude,
  phone,
  website_url,
  google_place_id,
  google_primary_type,
  google_types,
  business_hours,
  business_hours_structured,
  city,
  status,
  visibility,
  auto_imported,
  created_at,
  updated_at
FROM business_profiles
WHERE 
  -- 🔒 TIER: Only AI-eligible tiers (NO free_tier)
  business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  -- 🔒 COORDS: Must have valid coordinates for Atlas
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL
  -- 🔒 CITY: Must have city assigned
  AND city IS NOT NULL
  -- 🔒 STATUS: Allow approved, claimed, or unclaimed (but tier filters apply)
  AND status IN ('approved', 'unclaimed', 'claimed_paid', 'claimed_trial')
  -- 🔒 VISIBILITY: Only AI-enabled (discover_only excluded)
  AND (visibility = 'ai_enabled' OR visibility IS NULL); -- NULL = legacy rows, treat as enabled

-- Add helpful comment
COMMENT ON VIEW business_profiles_ai_eligible IS 
  'AI/Atlas-safe view: Only businesses with AI-eligible tiers + valid coordinates. ' ||
  'Excludes free_tier automatically. Used by AI chat and Atlas endpoints.';

-- Grant permissions
GRANT SELECT ON business_profiles_ai_eligible TO authenticated, anon, service_role;

-- Verification queries (run manually after migration)
/*
-- 1. Check tier distribution
SELECT 
  business_tier,
  COUNT(*) as count,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coords
FROM business_profiles_ai_eligible
GROUP BY business_tier
ORDER BY 
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'free_trial' THEN 3
    WHEN 'recommended' THEN 4
    ELSE 5
  END;

-- 2. Verify NO free_tier leakage (MUST BE 0)
SELECT COUNT(*) as free_tier_leak_count
FROM business_profiles_ai_eligible
WHERE business_tier = 'free_tier' OR business_tier IS NULL;

-- 3. Verify ALL have coords (MUST BE 0)
SELECT COUNT(*) as missing_coords_count
FROM business_profiles_ai_eligible
WHERE latitude IS NULL OR longitude IS NULL;

-- 4. Sample results
SELECT id, business_name, business_tier, city, latitude, longitude
FROM business_profiles_ai_eligible
LIMIT 10;
*/
