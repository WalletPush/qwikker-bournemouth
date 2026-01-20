-- Migration: Chat Eligibility View (Subscription-Based)
-- Purpose: Enforce ONLY approved + subscribed businesses appear in AI chat
-- Date: 2026-01-20
-- CRITICAL: This replaces the stale business_tier column with subscription-based logic

-- ============================================================================
-- Drop existing views that depend on business_tier
-- ============================================================================

DROP VIEW IF EXISTS business_profiles_chat_eligible CASCADE;

-- ============================================================================
-- Create subscription-based chat eligibility view
-- ============================================================================

CREATE OR REPLACE VIEW business_profiles_chat_eligible AS
WITH latest_subscription AS (
  -- Get the most recent subscription for each business
  SELECT DISTINCT ON (bs.business_id)
    bs.business_id,
    bs.tier_id,
    st.tier_name,
    st.tier_display_name,
    bs.status AS sub_status,
    bs.is_in_free_trial,
    bs.free_trial_start_date,
    bs.free_trial_end_date,
    bs.current_period_end,
    bs.updated_at AS sub_updated_at
  FROM business_subscriptions bs
  LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
  ORDER BY bs.business_id, bs.updated_at DESC NULLS LAST
),
computed_eligibility AS (
  SELECT 
    bp.id,
    bp.business_name,
    bp.business_tagline,
    bp.system_category,
    bp.display_category,
    bp.business_address,
    bp.business_town,
    bp.logo,
    bp.business_images,
    bp.rating,
    bp.review_count,
    bp.latitude,
    bp.longitude,
    bp.phone,
    bp.website_url,
    bp.google_place_id,
    bp.google_primary_type,
    bp.google_types,
    bp.business_hours,
    bp.business_hours_structured,
    bp.city,
    bp.status AS bp_status,
    bp.visibility,
    bp.auto_imported,
    bp.owner_user_id,
    bp.claimed_at,
    bp.created_at,
    bp.updated_at,
    -- Subscription fields
    ls.tier_name AS sub_tier_name,
    ls.tier_display_name AS sub_tier_display_name,
    ls.sub_status,
    ls.is_in_free_trial,
    ls.free_trial_end_date,
    ls.current_period_end,
    -- ============================================================================
    -- COMPUTED: effective_tier (for sorting and display)
    -- ============================================================================
    -- This is the SINGLE SOURCE OF TRUTH for chat eligibility
    -- spotlight → featured → trial (treated as featured) → starter → null (excluded)
    CASE
      -- SPOTLIGHT (qwikker_picks)
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'spotlight'
      THEN 'spotlight'
      
      -- FEATURED (paid)
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'featured'
      THEN 'featured'
      
      -- TRIAL ACTIVE (treat as featured)
      WHEN ls.sub_status = 'trial'
        AND ls.is_in_free_trial = true
        AND ls.free_trial_end_date IS NOT NULL
        AND ls.free_trial_end_date >= NOW()
      THEN 'featured' -- Trials show as featured in chat
      
      -- STARTER (paid)
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'starter'
      THEN 'starter'
      
      -- All other cases: NOT ELIGIBLE
      ELSE NULL
    END AS effective_tier,
    -- ============================================================================
    -- COMPUTED: is_chat_eligible (boolean filter)
    -- ============================================================================
    -- Business is chat-eligible if ALL of these are true:
    -- 1. status = 'approved'
    -- 2. has valid subscription
    -- 3. either paid active OR trial active
    -- 4. NOT explicitly excluded statuses
    CASE
      WHEN bp.status != 'approved' THEN false
      WHEN ls.business_id IS NULL THEN false -- No subscription
      WHEN bp.status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete') THEN false
      WHEN ls.is_in_free_trial = true 
        AND ls.free_trial_end_date IS NOT NULL 
        AND ls.free_trial_end_date < NOW() THEN false -- Trial expired
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false THEN true -- Paid active
      WHEN ls.sub_status = 'trial'
        AND ls.is_in_free_trial = true
        AND ls.free_trial_end_date IS NOT NULL
        AND ls.free_trial_end_date >= NOW() THEN true -- Trial active
      ELSE false
    END AS is_chat_eligible,
    -- ============================================================================
    -- COMPUTED: tier_priority (for ORDER BY)
    -- ============================================================================
    -- Lower number = higher priority (shows first in chat)
    CASE
      WHEN ls.sub_status = 'active' 
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'spotlight' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
      THEN 1 -- Spotlight first
      
      WHEN (
        (ls.sub_status = 'active' 
          AND ls.is_in_free_trial = false
          AND ls.tier_name = 'featured'
          AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW()))
        OR
        (ls.sub_status = 'trial'
          AND ls.is_in_free_trial = true
          AND ls.free_trial_end_date >= NOW())
      ) THEN 2 -- Featured + trial active
      
      WHEN ls.sub_status = 'active' 
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'starter'
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
      THEN 3 -- Starter last
      
      ELSE 999 -- Not eligible
    END AS tier_priority
  FROM business_profiles bp
  LEFT JOIN latest_subscription ls ON ls.business_id = bp.id
)
-- ============================================================================
-- FINAL SELECT: Only return chat-eligible businesses
-- ============================================================================
SELECT 
  id,
  business_name,
  business_tagline,
  system_category,
  display_category,
  business_address,
  business_town,
  logo,
  business_images,
  rating,
  review_count,
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
  bp_status AS status,
  visibility,
  auto_imported,
  owner_user_id,
  claimed_at,
  created_at,
  updated_at,
  -- Subscription metadata (for debugging/logging only)
  sub_tier_name,
  sub_tier_display_name,
  sub_status,
  is_in_free_trial,
  free_trial_end_date,
  current_period_end,
  -- Computed eligibility fields
  effective_tier,
  tier_priority
FROM computed_eligibility
WHERE is_chat_eligible = true; -- ✅ CRITICAL FILTER

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON VIEW business_profiles_chat_eligible IS 
  'SUBSCRIPTION-BASED chat eligibility. ' ||
  'Enforces: status=approved + valid subscription + (paid active OR trial active). ' ||
  'Excludes: unclaimed, pending_claim, claimed_free, incomplete, expired trials, no subscription. ' ||
  'Use effective_tier for display and tier_priority for sorting (spotlight=1, featured/trial=2, starter=3). ' ||
  'DO NOT use business_profiles.business_tier or plan columns - they are stale.';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON business_profiles_chat_eligible TO authenticated, anon, service_role;

-- ============================================================================
-- Verification queries (run these to check the view works)
-- ============================================================================

-- Check counts by effective_tier
-- SELECT effective_tier, COUNT(*) AS n FROM business_profiles_chat_eligible GROUP BY 1 ORDER BY 1;

-- Check tier priority distribution
-- SELECT tier_priority, effective_tier, COUNT(*) AS n FROM business_profiles_chat_eligible GROUP BY 1, 2 ORDER BY 1, 2;

-- Verify no free listings (should return 0)
-- SELECT COUNT(*) FROM business_profiles_chat_eligible WHERE sub_tier_name IS NULL OR effective_tier IS NULL;

-- Verify no unapproved businesses (should return 0)
-- SELECT COUNT(*) FROM business_profiles_chat_eligible WHERE status != 'approved';

-- Sample output
-- SELECT business_name, city, effective_tier, tier_priority, sub_status, is_in_free_trial 
-- FROM business_profiles_chat_eligible 
-- ORDER BY tier_priority, rating DESC NULLS LAST 
-- LIMIT 10;
