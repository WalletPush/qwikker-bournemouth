-- ============================================
-- QWIKKER VIBES MVP - DATABASE MIGRATION
-- ============================================
-- Purpose: Add simple vibe collection system
-- Timeline: Pre-launch critical (2-3 days)
--
-- ✅ VERIFIED:
-- - app_users.id exists (UUID PK) and is correct FK
-- - wallet_pass_id is the REAL unique identity (TEXT, not UUID)
-- - app_users can have DUPLICATES (same email, different user_id)
-- - Supabase auth.users is NOT used (wallet pass is the identity system)
--
-- ⚠️ CRITICAL ARCHITECTURAL DECISIONS:
-- 1. user_id references app_users.id (for historical/analytics)
-- 2. wallet_pass_id column added (TEXT, NOT NULL) - the REAL identity
-- 3. UNIQUE constraint on (business_id, wallet_pass_id) - NOT user_id
-- 4. RLS policies: read-only (API writes via service role)
-- 5. API must validate wallet_pass_id ownership before insert
-- 6. 3 indexes: business_id, user_id, wallet_pass_id
-- 7. Combined duplicate table comments
-- 8. Added write policy verification (must be 0)
--
-- 🔥 WHY wallet_pass_id IS CRITICAL:
-- - app_users has duplicates (same email, different user_id)
-- - Without wallet_pass_id, users could vibe same business multiple times
-- - wallet_pass_id is how your entire system identifies users
-- - This aligns vibes with your existing wallet pass flow
--
-- 📱 UI NOTE: Keep "Reviews" tab but rename to:
--    "What People Think" (Trust & Vibe panel)
--    Contains: Google trust + Qwikker vibes + About section
-- ============================================

-- ============================================
-- PRE-FLIGHT CHECK: Verify app_users exists
-- ============================================

-- Verify app_users table exists (required for FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'app_users'
  ) THEN
    RAISE EXCEPTION 'ERROR: app_users table does not exist. Cannot create FK.';
  END IF;
  
  RAISE NOTICE '✅ app_users table exists - proceeding with migration';
END $$;

-- ============================================
-- PART A: CREATE VIBES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS qwikker_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  wallet_pass_id TEXT NOT NULL,
  vibe_rating TEXT NOT NULL CHECK (vibe_rating IN ('loved_it', 'it_was_good', 'not_for_me')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ⚠️ CRITICAL: wallet_pass_id is the REAL unique identity in Qwikker
  -- app_users can have duplicates (same email, different user_id)
  -- So we enforce uniqueness on wallet_pass_id, NOT just user_id
  UNIQUE(business_id, wallet_pass_id)
);

-- Add helpful comments
COMMENT ON TABLE qwikker_vibes IS 
  'User vibes for businesses (3-level rating). Written via API (service role), readable for aggregate stats. Uniqueness enforced on wallet_pass_id (the REAL identity), not user_id (which can have duplicates).';
COMMENT ON COLUMN qwikker_vibes.vibe_rating IS 
  'loved_it = ♥ Loved it, it_was_good = ✓ It was good, not_for_me = — Not for me';
COMMENT ON COLUMN qwikker_vibes.user_id IS 
  'References app_users.id - for historical/analytics purposes (NOT for uniqueness check)';
COMMENT ON COLUMN qwikker_vibes.wallet_pass_id IS 
  'The REAL unique identity in Qwikker (TEXT, not UUID). UNIQUE constraint uses this field. API must always supply this.';

-- ============================================
-- PART B: CREATE INDEXES
-- ============================================

-- Index for fast lookups by business (most common query: aggregate vibes per business)
CREATE INDEX IF NOT EXISTS idx_qwikker_vibes_business 
  ON qwikker_vibes(business_id);

-- Index for user's vibes history (secondary: user's vibe feed)
CREATE INDEX IF NOT EXISTS idx_qwikker_vibes_user 
  ON qwikker_vibes(user_id);

-- Index for wallet pass lookups (check if user already vibed this business)
CREATE INDEX IF NOT EXISTS idx_qwikker_vibes_wallet_pass 
  ON qwikker_vibes(wallet_pass_id);

-- ⚠️ NO composite index needed - UNIQUE(business_id, wallet_pass_id) already creates one

-- ============================================
-- PART C: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on vibes table
ALTER TABLE qwikker_vibes ENABLE ROW LEVEL SECURITY;

-- ⚠️ STRATEGY: API-based writes via service role (no direct user writes)
-- This is cleanest since user_id references app_users.id (not auth.users.id)
-- Your POST /api/vibes/submit route will use service role to insert vibes

-- ⚠️ NOTE: Service role requests bypass RLS anyway (no policy needed)
-- We enable RLS + add SELECT policies for client-side aggregate queries

-- Policy 1: Allow authenticated users to READ vibes (for aggregation queries)
CREATE POLICY "vibes_read_authenticated"
ON qwikker_vibes
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow anon users to READ vibes (for public Discover page)
-- Enable this since Discover page / business modals are often public
CREATE POLICY "vibes_read_anon"
ON qwikker_vibes
FOR SELECT
TO anon
USING (true);

-- ✅ RESULT: 
-- - Anyone can READ vibes (aggregate stats are public)
-- - NO direct INSERT/UPDATE/DELETE (all writes via API service role)
-- - Service role bypasses RLS (doesn't need explicit policy)
-- - This prevents users from bypassing API validation
--
-- 🔒 API SPAM PREVENTION STRATEGY:
-- - API must validate wallet_pass_id ownership before inserting vibe
-- - Options:
--   1. Require signed token (vibe_token on app_users or HMAC derivable)
--   2. Reuse existing wallet pass update token/secret
--   3. Verify wallet_pass_id exists in app_users before insert
-- - Without this, anyone can spam vibes by guessing wallet_pass_ids

-- ============================================
-- PART D: VERIFICATION QUERIES
-- ============================================

-- Check table was created
SELECT 
  tablename, 
  schemaname 
FROM pg_tables 
WHERE tablename = 'qwikker_vibes';

-- Check indexes were created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'qwikker_vibes';

-- Check constraints
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint 
WHERE conrelid = 'qwikker_vibes'::regclass;

-- Check RLS policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'qwikker_vibes';

-- ⚠️ CRITICAL: Confirm NO write policies exist (must be 0)
-- Users should NOT be able to INSERT/UPDATE/DELETE directly
-- All writes must go through API (service role)
SELECT
  'vibes_write_policy_check' as check_name,
  COUNT(*) FILTER (WHERE cmd IN ('INSERT','UPDATE','DELETE','ALL')) AS write_policy_count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd IN ('INSERT','UPDATE','DELETE','ALL')) = 0 
    THEN '✅ Correct: No write policies (API-only writes)'
    ELSE '❌ ERROR: Write policies exist (users can bypass API)'
  END as status
FROM pg_policies
WHERE schemaname='public'
  AND tablename='qwikker_vibes';

-- Expected result: write_policy_count = 0 (✅)

-- ============================================
-- PART E: TEST DATA (OPTIONAL - FOR DEV ONLY)
-- ============================================

-- Uncomment below to insert test vibes
-- Replace placeholders with real values from your DB

/*
-- Step 1: Get a test business_id
SELECT id, business_name, city FROM business_profiles LIMIT 1;

-- Step 2: Get a test user (from app_users, NOT auth.users)
-- ⚠️ CRITICAL: Must have wallet_pass_id (the REAL unique identity)
SELECT id, wallet_pass_id, email FROM app_users WHERE wallet_pass_id IS NOT NULL LIMIT 3;

-- Step 3: Insert test vibe 
-- ⚠️ MUST include wallet_pass_id (UNIQUE constraint uses this, not user_id)
-- Use service role or run as superuser since RLS blocks direct INSERT
INSERT INTO qwikker_vibes (business_id, user_id, wallet_pass_id, vibe_rating)
VALUES 
  ('YOUR_BUSINESS_ID_HERE', 'YOUR_APP_USER_ID_HERE', 'YOUR_WALLET_PASS_ID_HERE', 'loved_it');

-- Step 4: Verify insert
SELECT 
  qv.vibe_rating,
  qv.wallet_pass_id,
  qv.created_at,
  bp.business_name,
  au.email
FROM qwikker_vibes qv
JOIN business_profiles bp ON bp.id = qv.business_id
JOIN app_users au ON au.id = qv.user_id
ORDER BY qv.created_at DESC;

-- Step 5: Test aggregate query (this is what your UI will do)
SELECT 
  COUNT(*) as total_vibes,
  SUM(CASE WHEN vibe_rating IN ('loved_it', 'it_was_good') THEN 1 ELSE 0 END) as positive_vibes,
  ROUND(
    (SUM(CASE WHEN vibe_rating IN ('loved_it', 'it_was_good') THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
  ) as positive_percentage
FROM qwikker_vibes
WHERE business_id = 'YOUR_BUSINESS_ID_HERE';

-- Step 6: Test uniqueness constraint (should FAIL - proves spam prevention works)
-- Try to insert duplicate vibe for same wallet_pass_id + business
INSERT INTO qwikker_vibes (business_id, user_id, wallet_pass_id, vibe_rating)
VALUES 
  ('YOUR_BUSINESS_ID_HERE', 'YOUR_APP_USER_ID_HERE', 'YOUR_WALLET_PASS_ID_HERE', 'not_for_me');
-- Expected: ERROR: duplicate key value violates unique constraint "qwikker_vibes_business_id_wallet_pass_id_key"
-- ✅ This confirms wallet_pass_id prevents spam (even if app_users has duplicates)
*/

-- ============================================
-- PART F: AGGREGATION QUERY (FOR REFERENCE)
-- ============================================

-- Example: Get vibe stats for a business
-- Replace YOUR_BUSINESS_ID_HERE with real UUID

/*
SELECT 
  COUNT(*) as total_vibes,
  SUM(CASE WHEN vibe_rating IN ('loved_it', 'it_was_good') THEN 1 ELSE 0 END) as positive_vibes,
  ROUND(
    (SUM(CASE WHEN vibe_rating IN ('loved_it', 'it_was_good') THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
  ) as positive_percentage,
  SUM(CASE WHEN vibe_rating = 'loved_it' THEN 1 ELSE 0 END) as loved_it_count,
  SUM(CASE WHEN vibe_rating = 'it_was_good' THEN 1 ELSE 0 END) as it_was_good_count,
  SUM(CASE WHEN vibe_rating = 'not_for_me' THEN 1 ELSE 0 END) as not_for_me_count
FROM qwikker_vibes
WHERE business_id = 'YOUR_BUSINESS_ID_HERE';
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- ✅ WHAT YOU NOW HAVE:
-- 1. qwikker_vibes table (ready to collect vibes)
-- 2. user_id FK references app_users.id (for historical/analytics)
-- 3. wallet_pass_id column (TEXT, NOT NULL) - the REAL unique identity
-- 4. UNIQUE constraint on (business_id, wallet_pass_id) - prevents spam
-- 5. RLS enabled with read-only policies (writes via API service role)
-- 6. 3 indexes for fast queries (business_id, user_id, wallet_pass_id)
-- 7. Public read access (authenticated + anon can read aggregate stats)
-- 8. No direct INSERT (all writes via POST /api/vibes/submit)

-- 🔒 SECURITY MODEL:
-- - Service role bypasses RLS (no explicit policy needed)
-- - Users READ vibes (for aggregate queries)
-- - Users CANNOT write vibes directly (must use API)
-- - API validates wallet_pass_id ownership + inserts using service role
-- - wallet_pass_id uniqueness prevents spam (even if app_users has duplicates)

-- 🎯 NEXT STEPS:
-- 1. Build POST /api/vibes/submit route
--    ⚠️ MUST validate wallet_pass_id ownership before insert
--    Options: signed token, HMAC, or verify wallet_pass_id exists in app_users
-- 2. Build bottom sheet UI prompt (after engagement: directions/call/save)
-- 3. Wire up triggers (directions tapped / offer saved / call tapped)
-- 4. Add display logic to business detail page (% positive + total)
-- 5. Update "What People Think" tab with vibes block
-- 6. Integrate with AI (use vibes in chat context for recommendations)

-- 📊 EXPECTED USAGE:
-- Week 1: ~50 vibes
-- Month 1: ~500 vibes
-- Month 3: ~2,000+ vibes (data flywheel begins)

SELECT '✅ Vibes MVP migration complete!' as status;
