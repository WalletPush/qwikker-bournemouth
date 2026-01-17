-- CRITICAL FIX: Reset business_tier for auto-imported businesses
-- Problem: Some auto_imported businesses have business_tier = 'recommended'
-- Root cause: Likely DB default when column was added, or manual admin changes
-- Solution: Set all auto_imported businesses to 'free_tier' (regardless of claimed status)

-- Step 1: Identify the problem (DRY RUN)
SELECT
  id,
  business_name,
  auto_imported,
  owner_user_id IS NOT NULL as is_claimed,
  business_tier as current_tier,
  CASE 
    WHEN owner_user_id IS NULL THEN 'free_tier (unclaimed)'
    WHEN owner_user_id IS NOT NULL THEN 'free_tier (claimed)'
  END as should_be
FROM business_profiles
WHERE auto_imported = true
  AND business_tier != 'free_tier'
ORDER BY created_at DESC;

-- Step 2: Fix the data (APPLY FIX)
UPDATE business_profiles
SET 
  business_tier = 'free_tier',
  visibility = 'discover_only',
  updated_at = NOW()
WHERE auto_imported = true
  AND business_tier != 'free_tier';

-- Step 3: Verification
SELECT
  business_tier,
  auto_imported,
  COUNT(*) as count,
  SUM(CASE WHEN owner_user_id IS NOT NULL THEN 1 ELSE 0 END) as claimed_count
FROM business_profiles
WHERE city = 'bournemouth'
GROUP BY business_tier, auto_imported
ORDER BY 
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'free_trial' THEN 3
    WHEN 'recommended' THEN 4
    WHEN 'free_tier' THEN 5
    ELSE 6
  END;
