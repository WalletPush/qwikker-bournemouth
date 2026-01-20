-- ============================================================================
-- ENTITLEMENT DRIFT DETECTOR
-- ============================================================================
-- Detects bad states where business_tier/plan don't match subscription reality.
--
-- BAD STATES:
-- 1. business_tier in ('free_trial','featured','qwikker_picks') but NO subscription row
-- 2. status != 'approved' but HAS a subscription row
-- 3. business_tier='free_trial' but subscription.is_in_free_trial=false
-- 4. Expired trial (end_date < now) but still business_tier='free_trial'

-- QUERY 1: Paid Tiers Without Subscription (CRITICAL DRIFT)
WITH businesses_with_paid_tiers AS (
  SELECT 
    bp.id,
    bp.business_name,
    bp.status,
    bp.business_tier,
    bp.plan,
    bp.owner_user_id,
    bs.id AS subscription_id,
    bs.tier_id,
    bs.status AS sub_status,
    bs.is_in_free_trial,
    bs.free_trial_end_date
  FROM business_profiles bp
  LEFT JOIN business_subscriptions bs ON bp.id = bs.business_id
  WHERE bp.business_tier IN ('free_trial', 'featured', 'qwikker_picks', 'spotlight')
     OR bp.plan IN ('featured', 'spotlight')
)
SELECT 
  business_name,
  status AS bp_status,
  business_tier,
  plan,
  CASE 
    WHEN subscription_id IS NULL THEN '🚨 NO SUBSCRIPTION ROW'
    ELSE '✅ Has subscription'
  END AS subscription_check,
  CASE
    WHEN status != 'approved' AND subscription_id IS NOT NULL THEN '🚨 UNAPPROVED WITH SUBSCRIPTION'
    WHEN status = 'approved' AND subscription_id IS NULL THEN '🚨 APPROVED WITHOUT SUBSCRIPTION'
    ELSE '✅ Status OK'
  END AS status_check,
  CASE
    WHEN business_tier = 'free_trial' AND (is_in_free_trial IS NULL OR is_in_free_trial = false) THEN '🚨 free_trial WITHOUT is_in_free_trial'
    WHEN business_tier = 'free_trial' AND is_in_free_trial = true AND free_trial_end_date < NOW() THEN '🚨 EXPIRED TRIAL STILL ACTIVE'
    WHEN business_tier = 'free_trial' THEN '✅ Trial valid'
    ELSE 'N/A'
  END AS trial_check
FROM businesses_with_paid_tiers
WHERE subscription_id IS NULL -- Missing subscription
   OR (status != 'approved' AND subscription_id IS NOT NULL) -- Unapproved with subscription
   OR (business_tier = 'free_trial' AND (is_in_free_trial = false OR (is_in_free_trial = true AND free_trial_end_date < NOW())))
ORDER BY 
  CASE 
    WHEN subscription_id IS NULL THEN 1
    WHEN status != 'approved' THEN 2
    ELSE 3
  END,
  business_name;

-- QUERY 2: Summary Stats
SELECT 
  'TOTAL BUSINESSES' AS category,
  COUNT(*) AS count
FROM business_profiles
UNION ALL
SELECT 
  'Paid tier (free_trial/featured/spotlight)' AS category,
  COUNT(*) AS count
FROM business_profiles
WHERE business_tier IN ('free_trial', 'featured', 'qwikker_picks', 'spotlight')
UNION ALL
SELECT 
  'Paid tier WITHOUT subscription' AS category,
  COUNT(*) AS count
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bp.business_tier IN ('free_trial', 'featured', 'qwikker_picks', 'spotlight')
  AND bs.id IS NULL
UNION ALL
SELECT 
  'Unapproved WITH subscription' AS category,
  COUNT(*) AS count
FROM business_profiles bp
INNER JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bp.status != 'approved'
UNION ALL
SELECT 
  'Expired trials still marked free_trial' AS category,
  COUNT(*) AS count
FROM business_profiles bp
INNER JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bp.business_tier = 'free_trial'
  AND bs.is_in_free_trial = true
  AND bs.free_trial_end_date < NOW();

-- QUERY 3: Detailed Drift Report (All Issues)
WITH drift_cases AS (
  SELECT 
    bp.id,
    bp.business_name,
    bp.city,
    bp.status,
    bp.business_tier,
    bp.plan,
    bs.id AS sub_id,
    bs.status AS sub_status,
    bs.is_in_free_trial,
    bs.free_trial_end_date,
    st.tier_name,
    CASE 
      WHEN bp.business_tier IN ('free_trial','featured','qwikker_picks','spotlight') AND bs.id IS NULL 
        THEN 'PAID_TIER_NO_SUB'
      WHEN bp.status != 'approved' AND bs.id IS NOT NULL 
        THEN 'UNAPPROVED_WITH_SUB'
      WHEN bp.business_tier = 'free_trial' AND (bs.is_in_free_trial = false OR bs.is_in_free_trial IS NULL) 
        THEN 'TRIAL_TIER_NO_TRIAL_FLAG'
      WHEN bp.business_tier = 'free_trial' AND bs.is_in_free_trial = true AND bs.free_trial_end_date < NOW() 
        THEN 'EXPIRED_TRIAL_ACTIVE'
      WHEN bp.business_tier != 'free_trial' AND bs.is_in_free_trial = true 
        THEN 'TRIAL_FLAG_WRONG_TIER'
      ELSE NULL
    END AS drift_type
  FROM business_profiles bp
  LEFT JOIN business_subscriptions bs ON bp.id = bs.business_id
  LEFT JOIN subscription_tiers st ON bs.tier_id = st.id
)
SELECT 
  drift_type,
  business_name,
  city,
  status AS bp_status,
  business_tier AS bp_tier,
  plan AS bp_plan,
  sub_status,
  tier_name AS sub_tier,
  is_in_free_trial,
  free_trial_end_date,
  CASE drift_type
    WHEN 'PAID_TIER_NO_SUB' THEN 'CRITICAL: Business has paid tier but no subscription row'
    WHEN 'UNAPPROVED_WITH_SUB' THEN 'CRITICAL: Unapproved business has subscription row'
    WHEN 'TRIAL_TIER_NO_TRIAL_FLAG' THEN 'WARNING: business_tier=free_trial but is_in_free_trial=false'
    WHEN 'EXPIRED_TRIAL_ACTIVE' THEN 'WARNING: Trial expired but still shows as free_trial'
    WHEN 'TRIAL_FLAG_WRONG_TIER' THEN 'WARNING: is_in_free_trial=true but business_tier != free_trial'
  END AS issue_description
FROM drift_cases
WHERE drift_type IS NOT NULL
ORDER BY 
  CASE drift_type
    WHEN 'PAID_TIER_NO_SUB' THEN 1
    WHEN 'UNAPPROVED_WITH_SUB' THEN 2
    ELSE 3
  END,
  city,
  business_name;

-- USAGE:
-- Run these queries regularly (daily/weekly) to catch drift.
-- Any results from Query 1 or Query 3 indicate data integrity issues that need fixing.
-- PAID_TIER_NO_SUB cases are CRITICAL and must be fixed immediately (either add subscription or downgrade tier).
