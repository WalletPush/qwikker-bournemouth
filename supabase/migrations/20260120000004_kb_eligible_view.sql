-- Migration: KB Eligible Businesses View (Identical to Chat Eligible)
-- Purpose: Lock down "Select Target for Knowledge Base" dropdown to ONLY show businesses eligible for paid AI exposure
-- Date: 2026-01-20
-- CRITICAL: Prevents KB ingestion for auto-imported, unclaimed, expired trials, and unapproved businesses

-- ============================================================================
-- Drop existing view if any
-- ============================================================================

DROP VIEW IF EXISTS business_profiles_kb_eligible CASCADE;

-- ============================================================================
-- Create KB eligible view (IDENTICAL to chat eligible for consistency)
-- ============================================================================

-- Design decision: Make KB eligibility IDENTICAL to chat eligibility
-- This prevents future leaks by design - if it can't show in chat, we shouldn't ingest KB for it

CREATE OR REPLACE VIEW business_profiles_kb_eligible AS
SELECT 
  id,
  business_name,
  business_category,
  system_category,
  display_category,
  business_tagline,
  business_town,
  city,
  status,
  visibility,
  auto_imported,
  owner_user_id,
  claimed_at,
  created_at,
  updated_at,
  -- Subscription-based eligibility fields from business_profiles_chat_eligible
  effective_tier,
  tier_priority,
  sub_tier_name,
  sub_tier_display_name,
  sub_status,
  is_in_free_trial,
  free_trial_end_date,
  current_period_end
FROM business_profiles_chat_eligible;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON VIEW business_profiles_kb_eligible IS 
  'SUBSCRIPTION-BASED KB target eligibility (IDENTICAL to chat_eligible). ' ||
  'Enforces: status=approved + valid subscription + (paid active OR trial active) + NOT auto_imported (unless claimed). ' ||
  'Excludes: unclaimed, pending_claim, claimed_free, incomplete, expired trials, unapproved, no subscription. ' ||
  'Use this view for "Select Target for Knowledge Base" dropdown in admin panel. ' ||
  'Prevents stale menus/deals from ineligible businesses from polluting KB.';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON business_profiles_kb_eligible TO authenticated, anon, service_role;

-- ============================================================================
-- Verification queries (run these to check the view works)
-- ============================================================================

-- Check counts
-- SELECT COUNT(*) AS kb_eligible_businesses FROM business_profiles_kb_eligible;

-- Verify NO auto-imported unclaimed businesses (should return 0)
-- SELECT COUNT(*) FROM business_profiles_kb_eligible bke
-- JOIN business_profiles bp ON bp.id = bke.id
-- WHERE bp.auto_imported = true AND bp.status IN ('unclaimed', 'pending_claim');

-- Verify NO expired trials (should return 0)
-- SELECT COUNT(*) FROM business_profiles_kb_eligible 
-- WHERE is_in_free_trial = true AND free_trial_end_date < NOW();

-- Show tier distribution (should only be spotlight/featured/starter)
-- SELECT effective_tier, COUNT(*) FROM business_profiles_kb_eligible GROUP BY 1;

-- Compare to current "Live Businesses" count in admin (before fix)
-- SELECT 
--   (SELECT COUNT(*) FROM business_profiles WHERE status IN ('approved', 'claimed_free')) AS old_count,
--   (SELECT COUNT(*) FROM business_profiles_kb_eligible) AS new_count,
--   (SELECT COUNT(*) FROM business_profiles WHERE status IN ('approved', 'claimed_free'))
--     - (SELECT COUNT(*) FROM business_profiles_kb_eligible) AS excluded_count;

-- ============================================================================
-- OPTIONAL: Create RPC function for admin dashboard KB dropdown
-- ============================================================================

CREATE OR REPLACE FUNCTION get_kb_eligible_businesses(p_city TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  business_category TEXT,
  system_category TEXT,
  display_category TEXT,
  business_tagline TEXT,
  business_town TEXT,
  city TEXT,
  effective_tier TEXT,
  tier_priority INT,
  sub_tier_name TEXT,
  sub_status TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bke.id,
    bke.business_name,
    bke.business_category,
    bke.system_category,
    bke.display_category,
    bke.business_tagline,
    bke.business_town,
    bke.city,
    bke.effective_tier,
    bke.tier_priority,
    bke.sub_tier_name,
    bke.sub_status
  FROM business_profiles_kb_eligible bke
  WHERE (p_city IS NULL OR bke.city = p_city)
  ORDER BY bke.tier_priority ASC, bke.business_name ASC;
END;
$$;

COMMENT ON FUNCTION get_kb_eligible_businesses IS 
  'RPC function to fetch KB-eligible businesses for admin panel dropdown. ' ||
  'Returns businesses sorted by tier priority (spotlight first, then featured/trial, then starter) ' ||
  'and within tier by name (alphabetical). ' ||
  'Optional city filter for multi-tenant support.';

GRANT EXECUTE ON FUNCTION get_kb_eligible_businesses TO authenticated, service_role;

-- ============================================================================
-- DRIFT DETECTION: Show which businesses are being excluded from KB and why
-- ============================================================================

-- This query shows businesses that are in "Live Listings" but EXCLUDED from KB eligible
-- SELECT 
--   bp.id,
--   bp.business_name,
--   bp.status,
--   bp.auto_imported,
--   CASE
--     WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'NOT_CHAT_ELIGIBLE'
--     WHEN bp.status = 'claimed_free' THEN 'CLAIMED_FREE (no paid sub)'
--     WHEN bp.status = 'unclaimed' THEN 'UNCLAIMED'
--     WHEN bp.status = 'incomplete' THEN 'INCOMPLETE'
--     ELSE 'OTHER'
--   END AS exclusion_reason,
--   bs.status AS sub_status,
--   bs.is_in_free_trial,
--   bs.free_trial_end_date
-- FROM business_profiles bp
-- LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
-- WHERE bp.status IN ('approved', 'claimed_free')
--   AND bp.id NOT IN (SELECT id FROM business_profiles_kb_eligible)
-- ORDER BY exclusion_reason, bp.business_name;
