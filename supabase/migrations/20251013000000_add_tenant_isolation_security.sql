-- Migration: Add Tenant Isolation Security (Non-Breaking)
-- Description: Adds city-based RLS policies for multi-tenant security WITHOUT breaking existing functionality
-- Date: 2025-10-13 00:00:00 UTC

-- ============================================================================
-- IMPORTANT: This migration ONLY ADDS security layers, does NOT modify existing tables
-- ============================================================================

-- Add city-based RLS policies for business_profiles (if not already exists)
-- These policies will work alongside existing auth-based policies
DO $$
BEGIN
    -- Check if business_profiles has RLS enabled (it should from profiles rename)
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'business_profiles'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add tenant isolation policy for business_profiles (non-breaking)
-- This allows existing service-role access while adding city filtering for regular users
DROP POLICY IF EXISTS "Tenant isolation for business_profiles" ON public.business_profiles;
CREATE POLICY "Tenant isolation for business_profiles"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (
    -- Allow service role full access (preserves existing functionality)
    current_setting('role') = 'service_role'
    OR
    -- For regular users, only show businesses from their detected city
    -- This is additive security - doesn't break existing queries
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'  -- Safe fallback for existing functionality
    )
);

-- Add city-based RLS policies for app_users (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'app_users'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add tenant isolation policy for app_users (non-breaking)
DROP POLICY IF EXISTS "Tenant isolation for app_users" ON public.app_users;
CREATE POLICY "Tenant isolation for app_users"
ON public.app_users
FOR SELECT
TO authenticated
USING (
    -- Allow service role full access (preserves existing functionality)
    current_setting('role') = 'service_role'
    OR
    -- For regular users, only show users from their detected city
    city = COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'  -- Safe fallback
    )
);

-- Add tenant isolation for business_offers (already has RLS enabled)
DROP POLICY IF EXISTS "Tenant isolation for business_offers" ON public.business_offers;
CREATE POLICY "Tenant isolation for business_offers"
ON public.business_offers
FOR SELECT
TO authenticated
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

-- Add tenant isolation for user_offer_claims (already has RLS enabled)
DROP POLICY IF EXISTS "Tenant isolation for user_offer_claims" ON public.user_offer_claims;
CREATE POLICY "Tenant isolation for user_offer_claims"
ON public.user_offer_claims
FOR SELECT
TO authenticated
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

-- Add tenant isolation for knowledge_base (already has RLS enabled)
DROP POLICY IF EXISTS "Tenant isolation for knowledge_base" ON public.knowledge_base;
CREATE POLICY "Tenant isolation for knowledge_base"
ON public.knowledge_base
FOR SELECT
TO authenticated
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
-- HELPER FUNCTIONS FOR TENANT-AWARE QUERIES (Non-Breaking)
-- ============================================================================

-- Function to set current city context (for use in middleware)
CREATE OR REPLACE FUNCTION set_current_city(city_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set the city context for the current session
    PERFORM set_config('app.current_city', city_name, false);
END;
$$;

-- Function to get current city context
CREATE OR REPLACE FUNCTION get_current_city()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_city', true),
        'bournemouth'
    );
END;
$$;

-- ============================================================================
-- VALIDATION FUNCTIONS (Non-Breaking)
-- ============================================================================

-- Function to validate city exists in franchise system
CREATE OR REPLACE FUNCTION validate_franchise_city(city_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    -- Check if city exists in franchise_crm_configs
    RETURN EXISTS (
        SELECT 1 FROM public.franchise_crm_configs
        WHERE city = city_name
        AND status = 'active'
    );
END;
$$;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Tenant isolation for business_profiles" ON public.business_profiles IS 
'Ensures users only see businesses from their franchise city. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for app_users" ON public.app_users IS 
'Ensures users only see app users from their franchise city. Service role bypasses for admin operations.';

COMMENT ON POLICY "Tenant isolation for business_offers" ON public.business_offers IS 
'Ensures offers are filtered by business city. Service role bypasses for admin operations.';

COMMENT ON FUNCTION set_current_city(text) IS 
'Sets the current franchise city context for tenant-aware queries. Use in middleware.';

COMMENT ON FUNCTION get_current_city() IS 
'Gets the current franchise city context, with bournemouth as safe fallback.';

COMMENT ON FUNCTION validate_franchise_city(text) IS 
'Validates if a city is an active franchise in the system.';
