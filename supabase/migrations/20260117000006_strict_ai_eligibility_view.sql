-- Migration: STRICT Atlas/AI eligibility view (FINAL)
-- Purpose: Enforce ONLY tier + coords + city (NO status filtering)
-- Date: 2026-01-17
-- CRITICAL: Minimal, bulletproof eligibility enforcement

-- Drop existing view
DROP VIEW IF EXISTS business_profiles_ai_eligible CASCADE;

-- Create STRICT eligibility view (tier + coords + city ONLY)
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
  -- 🔒 TIER: Only AI-eligible tiers (NO free_tier, NO null)
  business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  -- 🔒 COORDS: Must have valid coordinates for Atlas
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL
  -- 🔒 CITY: Must have city assigned
  AND city IS NOT NULL;
  -- ✅ NO STATUS FILTER: Let application layer handle approval/visibility logic

-- Add helpful comment
COMMENT ON VIEW business_profiles_ai_eligible IS 
  'STRICT Atlas/AI eligibility: tier + coords + city ONLY. ' ||
  'Excludes free_tier and null tier automatically. ' ||
  'Does NOT filter by status/visibility (application layer concern).';

-- Grant permissions
GRANT SELECT ON business_profiles_ai_eligible TO authenticated, anon, service_role;

-- ============================================================================
-- OPTIONAL: Debug view for diagnostics (includes excluded rows with reasons)
-- ============================================================================

DROP VIEW IF EXISTS business_profiles_ai_eligible_debug CASCADE;

CREATE OR REPLACE VIEW business_profiles_ai_eligible_debug AS
SELECT 
  id,
  business_name,
  business_tier,
  city,
  latitude,
  longitude,
  status,
  visibility,
  created_at,
  -- Eligibility flags
  CASE 
    WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended') 
    THEN true 
    ELSE false 
  END as tier_ok,
  CASE 
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
    THEN true 
    ELSE false 
  END as coords_ok,
  CASE 
    WHEN city IS NOT NULL 
    THEN true 
    ELSE false 
  END as city_ok,
  -- Overall eligibility
  CASE 
    WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND city IS NOT NULL
    THEN true
    ELSE false
  END as is_eligible,
  -- Exclusion reason
  CASE 
    WHEN business_tier NOT IN ('qwikker_picks', 'featured', 'free_trial', 'recommended') OR business_tier IS NULL
      THEN 'tier_excluded'
    WHEN latitude IS NULL OR longitude IS NULL
      THEN 'missing_coords'
    WHEN city IS NULL
      THEN 'missing_city'
    ELSE 'eligible'
  END as exclusion_reason
FROM business_profiles
ORDER BY 
  CASE 
    WHEN business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
      AND latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND city IS NOT NULL
    THEN 0
    ELSE 1
  END,
  created_at DESC;

COMMENT ON VIEW business_profiles_ai_eligible_debug IS 
  'Debug view: Shows ALL businesses with eligibility flags for diagnostics.';

GRANT SELECT ON business_profiles_ai_eligible_debug TO authenticated, service_role;

-- ============================================================================
-- Verification queries (run manually after migration)
-- ============================================================================

/*
-- 1. Check eligible count
SELECT COUNT(*) as eligible_count
FROM business_profiles_ai_eligible;

-- 2. Verify NO free_tier or null tier (MUST BE 0)
SELECT COUNT(*) as leak_count
FROM business_profiles_ai_eligible
WHERE business_tier = 'free_tier' OR business_tier IS NULL;

-- 3. Verify ALL have coords (MUST BE 0)
SELECT COUNT(*) as missing_coords_count
FROM business_profiles_ai_eligible
WHERE latitude IS NULL OR longitude IS NULL;

-- 4. Tier distribution
SELECT 
  business_tier,
  COUNT(*) as count
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

-- 5. Debug: Check exclusion reasons
SELECT 
  exclusion_reason,
  COUNT(*) as count
FROM business_profiles_ai_eligible_debug
GROUP BY exclusion_reason
ORDER BY count DESC;

-- 6. Debug: AI-eligible tiers missing coords
SELECT id, business_name, business_tier, city, latitude, longitude, created_at
FROM business_profiles_ai_eligible_debug
WHERE tier_ok = true AND coords_ok = false
ORDER BY created_at DESC
LIMIT 20;
*/
