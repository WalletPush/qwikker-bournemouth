-- Migration: Chat Active Deals View (Eligibility + Validity Gated)
-- Purpose: Ensure AI chat NEVER shows expired offers or offers from ineligible businesses
-- Date: 2026-01-20
-- CRITICAL: Hard-gates both business eligibility AND offer validity

-- ============================================================================
-- Drop existing view if any
-- ============================================================================

DROP VIEW IF EXISTS chat_active_deals CASCADE;

-- ============================================================================
-- Create chat active deals view
-- ============================================================================

CREATE OR REPLACE VIEW chat_active_deals AS
SELECT 
  bo.id AS offer_id,
  bo.business_id,
  bp.business_name,
  bo.offer_name,
  bo.offer_description,
  bo.offer_value,
  bo.terms_conditions,
  bo.valid_from,
  bo.valid_until,
  bo.status AS offer_status,
  bo.qr_code,
  bo.created_at AS offer_created_at,
  bo.updated_at AS offer_updated_at,
  -- Business metadata
  bp.city,
  bp.system_category,
  bp.display_category,
  bp.logo AS business_logo,
  -- Subscription-based eligibility fields from business_profiles_chat_eligible
  bce.effective_tier,
  bce.tier_priority,
  bce.sub_status,
  bce.is_in_free_trial,
  bce.free_trial_end_date
FROM business_offers bo
-- ============================================================================
-- CRITICAL JOIN: Only businesses that are chat-eligible
-- ============================================================================
INNER JOIN business_profiles_chat_eligible bce ON bce.id = bo.business_id
-- Also join base profile for additional metadata
INNER JOIN business_profiles bp ON bp.id = bo.business_id
WHERE 
  -- ============================================================================
  -- OFFER VALIDITY FILTERS
  -- ============================================================================
  -- 1. Offer must be approved
  bo.status = 'approved'
  -- 2. Offer must be currently valid (not expired)
  AND (bo.valid_until IS NULL OR bo.valid_until >= NOW())
  -- 3. Offer must have started (not future-dated)
  AND (bo.valid_from IS NULL OR bo.valid_from <= NOW())
  -- 4. If is_active column exists and is false, exclude
  -- (Note: business_offers table may not have is_active, so this is conditional)
  -- Uncomment if your schema has this column:
  -- AND (bo.is_active IS NULL OR bo.is_active = true)
;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON VIEW chat_active_deals IS 
  'SUBSCRIPTION-BASED + DATE-GATED active offers for AI chat. ' ||
  'Enforces: business must be in business_profiles_chat_eligible (approved + subscribed + not expired trial) ' ||
  'AND offer must be valid (valid_until >= now, valid_from <= now, status=approved). ' ||
  'Use this view for "current deals" queries to prevent expired offers and ineligible business offers from appearing in chat. ' ||
  'Returns effective_tier and tier_priority for sorting (spotlight=1, featured/trial=2, starter=3).';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT ON chat_active_deals TO authenticated, anon, service_role;

-- ============================================================================
-- Verification queries (run these to check the view works)
-- ============================================================================

-- Check counts by tier
-- SELECT effective_tier, COUNT(*) AS num_offers FROM chat_active_deals GROUP BY 1 ORDER BY 1;

-- Verify NO expired offers (should return 0)
-- SELECT COUNT(*) FROM chat_active_deals WHERE valid_until IS NOT NULL AND valid_until < NOW();

-- Verify NO offers from auto_imported businesses (should return 0)
-- SELECT COUNT(*) FROM chat_active_deals cad
-- JOIN business_profiles bp ON bp.id = cad.business_id
-- WHERE bp.auto_imported = true;

-- Verify NO offers from expired trials (should return 0)
-- SELECT COUNT(*) FROM chat_active_deals 
-- WHERE is_in_free_trial = true AND free_trial_end_date IS NOT NULL AND free_trial_end_date < NOW();

-- Sample output (ordered by tier priority)
-- SELECT 
--   business_name,
--   offer_name,
--   offer_value,
--   valid_until,
--   effective_tier,
--   tier_priority
-- FROM chat_active_deals
-- WHERE city = 'bournemouth'
-- ORDER BY tier_priority ASC, offer_updated_at DESC
-- LIMIT 10;

-- ============================================================================
-- OPTIONAL: Create RPC function for parameterized city filter
-- ============================================================================

CREATE OR REPLACE FUNCTION get_chat_active_deals(p_city TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (
  offer_id UUID,
  business_id UUID,
  business_name TEXT,
  offer_name TEXT,
  offer_description TEXT,
  offer_value TEXT,
  terms_conditions TEXT,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  offer_status TEXT,
  qr_code TEXT,
  city TEXT,
  system_category TEXT,
  display_category TEXT,
  business_logo TEXT,
  effective_tier TEXT,
  tier_priority INT,
  offer_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cad.offer_id,
    cad.business_id,
    cad.business_name,
    cad.offer_name,
    cad.offer_description,
    cad.offer_value,
    cad.terms_conditions,
    cad.valid_from,
    cad.valid_until,
    cad.offer_status,
    cad.qr_code,
    cad.city,
    cad.system_category,
    cad.display_category,
    cad.business_logo,
    cad.effective_tier,
    cad.tier_priority,
    cad.offer_updated_at
  FROM chat_active_deals cad
  WHERE cad.city = p_city
  ORDER BY cad.tier_priority ASC, cad.offer_updated_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_chat_active_deals IS 
  'RPC function to fetch active, eligible deals for a specific city. ' ||
  'Returns offers sorted by tier priority (spotlight first, then featured/trial, then starter) ' ||
  'and within tier by recency (updated_at DESC). ' ||
  'Only returns offers from chat-eligible businesses (approved + subscribed + not expired).';

GRANT EXECUTE ON FUNCTION get_chat_active_deals TO authenticated, anon, service_role;

-- ============================================================================
-- DRIFT DETECTION: Find offers that would be excluded by this view
-- ============================================================================

-- This query shows offers that exist in business_offers but are EXCLUDED from chat_active_deals
-- Use this to understand what's being filtered out and why

-- SELECT 
--   bp.business_name,
--   bp.status AS bp_status,
--   bp.auto_imported,
--   bo.offer_name,
--   bo.status AS offer_status,
--   bo.valid_until,
--   CASE
--     WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'BUSINESS_NOT_ELIGIBLE'
--     WHEN bo.status != 'approved' THEN 'OFFER_NOT_APPROVED'
--     WHEN bo.valid_until IS NOT NULL AND bo.valid_until < NOW() THEN 'OFFER_EXPIRED'
--     WHEN bo.valid_from IS NOT NULL AND bo.valid_from > NOW() THEN 'OFFER_FUTURE'
--     ELSE 'OTHER'
--   END AS exclusion_reason
-- FROM business_offers bo
-- JOIN business_profiles bp ON bp.id = bo.business_id
-- WHERE bo.id NOT IN (SELECT offer_id FROM chat_active_deals)
--   AND bo.status = 'approved' -- Focus on approved offers that got excluded
-- ORDER BY exclusion_reason, bp.business_name
-- LIMIT 50;
