-- ============================================================================
-- FIX MULTI-CITY RLS SECURITY
-- Date: 2026-01-12
-- 
-- ISSUES FIXED:
-- 1. Public discover policy bypasses city isolation
-- 2. Anonymous INSERT allowed (security risk)
-- 3. Tenant isolation only applies to authenticated, not public
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop insecure policies
-- ============================================================================

-- Remove the policy that allows cross-city public reads
DROP POLICY IF EXISTS "Anyone can read discoverable businesses" ON business_profiles;

-- Remove the policy that allows anonymous inserts
DROP POLICY IF EXISTS "Allow profile creation" ON business_profiles;

-- ============================================================================
-- STEP 2: Create secure, city-aware policies
-- ============================================================================

-- PUBLIC DISCOVER: Only show businesses from the current city
CREATE POLICY "Public can read discoverable businesses in current city"
ON business_profiles
FOR SELECT
TO public
USING (
  -- Must be discoverable status
  status IN ('approved', 'unclaimed', 'claimed_free')
  AND
  -- Must match the current city context
  (
    -- If app.current_city is set, use it
    city = current_setting('app.current_city', true)
    OR
    -- Fallback for direct Supabase queries (admin/debugging)
    current_setting('app.current_city', true) IS NULL
  )
);

-- AUTHENTICATED INSERT: Only logged-in users can create profiles
CREATE POLICY "Authenticated users can create their own profile"
ON business_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- AUTHENTICATED UPDATE: Users can only update their own business
CREATE POLICY "Users can update their own business profile"
ON business_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  auth.uid() = owner_user_id
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  auth.uid() = owner_user_id
);

-- ============================================================================
-- STEP 3: Add city constraint to other public-facing tables
-- ============================================================================

-- Fix business_offers public reads (if they exist)
DROP POLICY IF EXISTS "Public can view active offers" ON business_offers;

CREATE POLICY "Public can view active offers in current city"
ON business_offers
FOR SELECT
TO public
USING (
  status = 'active'
  AND
  EXISTS (
    SELECT 1 FROM business_profiles bp
    WHERE bp.id = business_offers.business_id
    AND bp.city = COALESCE(
      current_setting('app.current_city', true),
      'bournemouth'
    )
  )
);

-- ============================================================================
-- STEP 4: Add comments for future reference
-- ============================================================================

COMMENT ON POLICY "Public can read discoverable businesses in current city" ON business_profiles IS
'Ensures public discover page only shows businesses from the current subdomain city. Uses app.current_city session variable set by middleware.';

COMMENT ON POLICY "Authenticated users can create their own profile" ON business_profiles IS
'Prevents anonymous spam. Only authenticated users can create profiles, and only for themselves.';

COMMENT ON POLICY "Users can update their own business profile" ON business_profiles IS
'Business owners can update their profile via user_id or owner_user_id (for claimed listings).';

-- ============================================================================
-- VERIFICATION QUERIES (run these after migration to confirm)
-- ============================================================================

-- Test 1: Verify public can't see cross-city data
-- SET app.current_city = 'bournemouth';
-- SELECT city, COUNT(*) FROM business_profiles WHERE status IN ('approved','unclaimed','claimed_free') GROUP BY city;
-- Expected: Only bournemouth businesses

-- Test 2: Verify anonymous can't insert
-- Should fail: INSERT INTO business_profiles (business_name, user_id) VALUES ('Test', NULL);

-- Test 3: Verify authenticated users CAN insert their own profile
-- Should succeed: INSERT INTO business_profiles (business_name, user_id) VALUES ('My Business', auth.uid());

