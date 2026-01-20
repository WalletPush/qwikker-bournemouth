-- ============================================================================
-- FIX ALEXANDRA'S CAFÉ TIER MISMATCH
-- Current: free_trial, Should be: qwikker_picks (SPOTLIGHT)
-- ============================================================================

UPDATE business_profiles 
SET business_tier = 'qwikker_picks'
WHERE business_name = 'Alexandra''s Café' AND city = 'bournemouth';

-- Verify the fix
SELECT 
  business_name,
  business_tier,
  plan,
  CASE 
    WHEN business_tier = 'qwikker_picks' THEN '⭐ SPOTLIGHT'
    WHEN business_tier = 'featured' THEN '🔥 FEATURED'
    WHEN business_tier = 'free_trial' THEN '🎁 FREE TRIAL'
    WHEN business_tier = 'starter' THEN '📍 STARTER'
    ELSE business_tier
  END as tier_display
FROM business_profiles
WHERE city = 'bournemouth'
  AND business_name IN ('Alexandra''s Café', 'David''s grill shack')
ORDER BY business_name;
