-- Migration: Add additional_notes to business_profiles_chat_eligible view
-- Purpose: Support secret menu fetching from the eligibility-filtered view
-- Date: 2026-01-24
-- CRITICAL: This ensures secret menus are only shown for eligible businesses

-- ============================================================================
-- Recreate the view with additional_notes included
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
    bp.additional_notes, -- ✅ ADDED for secret menu support
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
    CASE
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'spotlight'
      THEN 'spotlight'
      
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'featured'
      THEN 'featured'
      
      WHEN ls.sub_status = 'trial'
        AND ls.is_in_free_trial = true
        AND ls.free_trial_end_date IS NOT NULL
        AND ls.free_trial_end_date >= NOW()
      THEN 'featured'
      
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'starter'
      THEN 'starter'
      
      ELSE NULL
    END AS effective_tier,
    -- ============================================================================
    -- COMPUTED: is_chat_eligible (boolean filter)
    -- ============================================================================
    CASE
      WHEN bp.status != 'approved' THEN false
      WHEN ls.business_id IS NULL THEN false
      WHEN bp.status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete') THEN false
      WHEN ls.is_in_free_trial = true 
        AND ls.free_trial_end_date IS NOT NULL 
        AND ls.free_trial_end_date < NOW() THEN false
      WHEN ls.sub_status = 'active' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
        AND ls.is_in_free_trial = false THEN true
      WHEN ls.sub_status = 'trial'
        AND ls.is_in_free_trial = true
        AND ls.free_trial_end_date IS NOT NULL
        AND ls.free_trial_end_date >= NOW() THEN true
      ELSE false
    END AS is_chat_eligible,
    -- ============================================================================
    -- COMPUTED: tier_priority (for ORDER BY)
    -- ============================================================================
    CASE
      WHEN ls.sub_status = 'active' 
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'spotlight' 
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
      THEN 1
      
      WHEN (
        (ls.sub_status = 'active' 
          AND ls.is_in_free_trial = false
          AND ls.tier_name = 'featured'
          AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW()))
        OR
        (ls.sub_status = 'trial'
          AND ls.is_in_free_trial = true
          AND ls.free_trial_end_date >= NOW())
      ) THEN 2
      
      WHEN ls.sub_status = 'active' 
        AND ls.is_in_free_trial = false
        AND ls.tier_name = 'starter'
        AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW())
      THEN 3
      
      ELSE 999
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
  additional_notes, -- ✅ ADDED for secret menu support
  city,
  bp_status AS status,
  visibility,
  auto_imported,
  owner_user_id,
  claimed_at,
  created_at,
  updated_at,
  -- Subscription metadata
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
WHERE is_chat_eligible = true;

-- ============================================================================
-- Update comment
-- ============================================================================

COMMENT ON VIEW business_profiles_chat_eligible IS 
  'SUBSCRIPTION-BASED chat eligibility. ' ||
  'Enforces: status=approved + valid subscription + (paid active OR trial active). ' ||
  'Excludes: unclaimed, pending_claim, claimed_free, incomplete, expired trials, no subscription. ' ||
  'Includes additional_notes for secret menu support. ' ||
  'Use effective_tier for display and tier_priority for sorting.';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON business_profiles_chat_eligible TO authenticated, anon, service_role;
