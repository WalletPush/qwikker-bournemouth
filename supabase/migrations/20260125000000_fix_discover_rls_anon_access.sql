-- Migration: Fix Discover Page RLS for Anonymous Access
-- Description: Allow anon role to query business_profiles with city filtering
-- Date: 2026-01-25 00:00:00 UTC
-- Issue: User discover page shows 0 businesses because RLS requires authenticated role

-- ============================================================================
-- FIX: Update business_profiles RLS policy to allow anon role
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for business_profiles" ON public.business_profiles;
CREATE POLICY "Tenant isolation for business_profiles"
ON public.business_profiles
FOR SELECT
TO authenticated, anon  -- ✅ ADD ANON ROLE
USING (
    -- Allow service role full access (preserves existing functionality)
    current_setting('role') = 'service_role'
    OR
    -- For regular users AND anon users, only show businesses from their detected city
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'  -- Safe fallback for existing functionality
    )
);

-- ============================================================================
-- FIX: Update app_users RLS policy to allow anon role
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for app_users" ON public.app_users;
CREATE POLICY "Tenant isolation for app_users"
ON public.app_users
FOR SELECT
TO authenticated, anon  -- ✅ ADD ANON ROLE
USING (
    -- Allow service role full access
    current_setting('role') = 'service_role'
    OR
    -- For all users, only show users from their detected city
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'
    )
);

-- ============================================================================
-- FIX: Update business_offers RLS policy to allow anon role
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for business_offers" ON public.business_offers;
CREATE POLICY "Tenant isolation for business_offers"
ON public.business_offers
FOR SELECT
TO authenticated, anon  -- ✅ ADD ANON ROLE
USING (
    -- Allow service role full access
    current_setting('role') = 'service_role'
    OR
    -- Filter by business city through join
    EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id = business_offers.business_id
        AND bp.city = COALESCE(
            current_setting('app.current_city', true),
            'bournemouth'
        )
    )
);

-- ============================================================================
-- FIX: Update user_offer_claims RLS policy to allow anon role
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for user_offer_claims" ON public.user_offer_claims;
CREATE POLICY "Tenant isolation for user_offer_claims"
ON public.user_offer_claims
FOR SELECT
TO authenticated, anon  -- ✅ ADD ANON ROLE
USING (
    -- Allow service role full access
    current_setting('role') = 'service_role'
    OR
    -- Filter by user city through join using user_id
    EXISTS (
        SELECT 1 FROM public.app_users au
        WHERE au.user_id = user_offer_claims.user_id
        AND au.city = COALESCE(
            current_setting('app.current_city', true),
            'bournemouth'
        )
    )
);

-- ============================================================================
-- FIX: Update knowledge_base RLS policy to allow anon role
-- ============================================================================

DROP POLICY IF EXISTS "Tenant isolation for knowledge_base" ON public.knowledge_base;
CREATE POLICY "Tenant isolation for knowledge_base"
ON public.knowledge_base
FOR SELECT
TO authenticated, anon  -- ✅ ADD ANON ROLE
USING (
    -- Allow service role full access
    current_setting('role') = 'service_role'
    OR
    -- Filter by city
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'
    )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON POLICY "Tenant isolation for business_profiles" ON public.business_profiles IS 
'Ensures users (authenticated + anon) only see businesses from their franchise city. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for app_users" ON public.app_users IS 
'Ensures users (authenticated + anon) only see app users from their franchise city. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for business_offers" ON public.business_offers IS 
'Ensures offers are filtered by business city for authenticated + anon users. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for user_offer_claims" ON public.user_offer_claims IS 
'Ensures offer claims are filtered by user city for authenticated + anon users. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for knowledge_base" ON public.knowledge_base IS 
'Ensures knowledge base entries are filtered by city for authenticated + anon users. Service role bypasses for admin operations.';
