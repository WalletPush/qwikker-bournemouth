-- Migration: Create AI-safe view for business_profiles
-- Purpose: Create a view that ONLY exposes AI-eligible businesses
-- Date: 2026-01-17
-- CRITICAL: This prevents free_tier businesses from EVER appearing in AI recommendations

-- Drop existing view if it exists
DROP VIEW IF EXISTS business_profiles_ai_eligible;

-- Create AI-safe view that filters out free_tier
CREATE OR REPLACE VIEW business_profiles_ai_eligible AS
SELECT *
FROM business_profiles
WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  AND visibility = 'ai_enabled'
  AND status IN ('claimed_paid', 'claimed_trial');

-- Add comment for documentation
COMMENT ON VIEW business_profiles_ai_eligible IS 
'AI-safe view: Only includes businesses eligible for AI recommendations. Excludes free_tier businesses automatically.';

-- Grant SELECT to authenticated users (via RLS on underlying table)
GRANT SELECT ON business_profiles_ai_eligible TO authenticated, anon, service_role;

-- Verification query
/*
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

-- Should show NO free_tier businesses
*/
