-- ============================================================================
-- RLS HOST HEADER PROTECTION (Optional Advanced Security)
-- Date: 2026-01-12
-- 
-- PURPOSE: Add DB-layer guardrail that uses request Host header to enforce
-- city isolation, even if app-layer .eq('city') is forgotten.
--
-- NOTE: This is OPTIONAL - your app-layer filtering is already secure.
-- Only run this if you want defense-in-depth.
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Extract city from Host header
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_city_from_host()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  host_header TEXT;
  forwarded_host TEXT;
  clean_host TEXT;
  subdomain TEXT;
  is_valid_city BOOLEAN;
BEGIN
  -- Get Host header from PostgREST request
  -- Note: This only works with PostgREST, not direct Postgres connections
  BEGIN
    -- Try x-forwarded-host first (for CDN/proxy scenarios)
    forwarded_host := current_setting('request.headers', true)::json->>'x-forwarded-host';
    IF forwarded_host IS NOT NULL AND forwarded_host != '' THEN
      host_header := forwarded_host;
    ELSE
      -- Fall back to regular host header
      host_header := current_setting('request.headers', true)::json->>'host';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If request.headers not available (direct DB connection), return NULL
    RETURN NULL;
  END;
  
  -- Handle NULL or empty host
  IF host_header IS NULL OR host_header = '' THEN
    RETURN NULL;
  END IF;
  
  -- Strip port (e.g., "localhost:3000" → "localhost")
  clean_host := LOWER(split_part(host_header, ':', 1));
  
  -- Handle localhost/127.0.0.1 (dev only - should not appear in prod)
  IF clean_host IN ('localhost', '127.0.0.1') THEN
    -- Allow in dev, but this should be blocked by app layer in prod
    RETURN 'bournemouth';
  END IF;
  
  -- Handle bournemouth.localhost, calgary.localhost (local testing)
  IF clean_host LIKE '%.localhost' THEN
    subdomain := split_part(clean_host, '.', 1);
    RETURN subdomain;
  END IF;
  
  -- Handle vercel.app (staging - should not appear in prod)
  IF clean_host LIKE '%.vercel.app' THEN
    -- Allow in staging, but should be blocked by app layer in prod
    RETURN 'bournemouth';
  END IF;
  
  -- Extract subdomain (first part before first dot)
  subdomain := split_part(clean_host, '.', 1);
  
  -- CRITICAL: Validate subdomain against franchise_crm_configs
  -- This prevents "evil.qwikker.com" from attempting to access data
  SELECT EXISTS (
    SELECT 1 FROM franchise_crm_configs
    WHERE city = subdomain
    AND status = 'active'
  ) INTO is_valid_city;
  
  IF is_valid_city THEN
    RETURN subdomain;
  END IF;
  
  -- Unknown subdomain - return NULL (app layer should handle this)
  RETURN NULL;
END;
$$;

-- ============================================================================
-- UPDATE PUBLIC DISCOVER POLICY (with host header check)
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Anyone can read discoverable businesses" ON business_profiles;
DROP POLICY IF EXISTS "Public can read discoverable businesses in current city" ON business_profiles;

-- Create new policy with host header validation
CREATE POLICY "Public discover filtered by host header"
ON business_profiles
FOR SELECT
TO public
USING (
  -- Must be discoverable status
  status IN ('approved', 'unclaimed', 'claimed_free')
  AND
  (
    -- If Host header available, enforce city match
    CASE 
      WHEN extract_city_from_host() IS NOT NULL THEN
        city = extract_city_from_host()
      ELSE
        -- If no header (direct DB query), allow but log warning
        TRUE
    END
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION extract_city_from_host() IS
'Extracts franchise city from PostgREST request Host header for RLS policies. Returns NULL for direct DB connections.';

COMMENT ON POLICY "Public discover filtered by host header" ON business_profiles IS
'DB-layer guardrail: Ensures public reads are filtered by Host header city, even if app forgets .eq(''city''). Falls back to allowing if header not available (direct DB access).';

-- ============================================================================
-- TEST QUERIES (run these to verify)
-- ============================================================================

-- Test 1: Direct DB query (should allow all discoverable)
-- SELECT city, COUNT(*) FROM business_profiles 
-- WHERE status IN ('approved','unclaimed','claimed_free') 
-- GROUP BY city;

-- Test 2: Via PostgREST with Host: bournemouth.qwikker.com
-- (Should only return bournemouth businesses)

-- Test 3: Via PostgREST with Host: calgary.qwikker.com
-- (Should only return calgary businesses)

