-- Migration: Fix RLS for Connection Pooling (Remove Session State Dependency)
-- Description: Stop relying on set_config session variables, use query-level filtering
-- Date: 2026-01-25 00:00:01 UTC
-- Issue: Connection pooling means session variables don't persist across requests

-- ============================================================================
-- FIX 1: business_profiles - Allow anon read for public data
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for business_profiles" ON public.business_profiles;
DROP POLICY IF EXISTS "Public read business_profiles" ON public.business_profiles;

CREATE POLICY "Public read business_profiles"
ON public.business_profiles
FOR SELECT
TO anon, authenticated
USING (
  -- Allow reading only public/discoverable statuses
  status IN ('approved', 'unclaimed', 'claimed_free')
  -- City isolation happens in the server query (.eq('city', currentCity))
  -- Belt-and-braces: require city to be set
  AND city IS NOT NULL
);

-- ============================================================================
-- FIX 2: business_offers - Allow anon read for approved offers
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for business_offers" ON public.business_offers;
DROP POLICY IF EXISTS "Public read approved business_offers" ON public.business_offers;

CREATE POLICY "Public read approved business_offers"
ON public.business_offers
FOR SELECT
TO anon, authenticated
USING (
  -- Only approved offers are visible
  status = 'approved'
  -- City isolation happens via the business_id FK + server-side filtering
);

-- ============================================================================
-- FIX 3: knowledge_base - Allow anon read for KB items
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for knowledge_base" ON public.knowledge_base;
DROP POLICY IF EXISTS "Public read knowledge_base" ON public.knowledge_base;

CREATE POLICY "Public read knowledge_base"
ON public.knowledge_base
FOR SELECT
TO anon, authenticated
USING (
  -- City isolation happens in the server query
  city IS NOT NULL
);

-- ============================================================================
-- FIX 4: app_users - KEEP LOCKED DOWN (no broad anon access)
-- ============================================================================

-- Leave app_users policy unchanged - it should NOT be publicly readable
-- Access should be via specific queries with wallet_pass_id

DROP POLICY IF EXISTS "Tenant isolation for app_users" ON public.app_users;

-- No new policy - app_users queries should use service_role or specific lookups

-- ============================================================================
-- FIX 5: user_offer_claims - Lock down to service role only
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for user_offer_claims" ON public.user_offer_claims;

-- Claims are not public data - service role handles these

-- ============================================================================
-- OPTIONAL: Drop set_current_city function if not needed elsewhere
-- ============================================================================

-- Uncomment if you're not using set_current_city for any other purpose:
-- DROP FUNCTION IF EXISTS set_current_city(text);
-- DROP FUNCTION IF EXISTS get_current_city();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Public read business_profiles" ON public.business_profiles IS 
'Allows anon/authenticated read for discoverable businesses. City filtering happens server-side in queries, not in RLS.';

COMMENT ON POLICY "Public read approved business_offers" ON public.business_offers IS 
'Allows anon/authenticated read for approved offers. City filtering via business_id FK + server queries.';

COMMENT ON POLICY "Public read knowledge_base" ON public.knowledge_base IS 
'Allows anon/authenticated read for KB items. City filtering happens server-side.';
