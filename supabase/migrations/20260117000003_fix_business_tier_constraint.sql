-- Migration: Fix business_tier constraint to include free_trial and free_tier
-- Purpose: Allow free_trial (Featured trial) and free_tier (unclaimed/imported) tiers
-- Date: 2026-01-17

-- Drop the old constraint
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_business_tier_check;

-- Add updated constraint with all valid tiers
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_business_tier_check
CHECK (business_tier IN (
  'qwikker_picks',  -- Spotlight tier (premium paid)
  'featured',       -- Featured tier (paid)
  'free_trial',     -- Featured trial (promotional)
  'recommended',    -- Starter tier (paid)
  'free_tier'       -- Free tier (unclaimed/imported businesses)
));

-- Add comment for documentation
COMMENT ON CONSTRAINT business_profiles_business_tier_check ON business_profiles IS 
'Valid business tiers: qwikker_picks (Spotlight), featured (Featured), free_trial (Featured trial), recommended (Starter), free_tier (unclaimed/imported)';

-- Verification query (run after migration)
/*
SELECT business_tier, COUNT(*) as count
FROM business_profiles
GROUP BY business_tier
ORDER BY 
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'free_trial' THEN 3
    WHEN 'recommended' THEN 4
    WHEN 'free_tier' THEN 5
    ELSE 6
  END;
*/
