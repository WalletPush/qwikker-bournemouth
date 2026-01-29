-- ============================================================================
-- THREE-TIER CHAT SYSTEM - DATABASE SETUP
-- ============================================================================
-- 
-- Run this SQL manually in Supabase SQL Editor
-- DO NOT run as migration - Darryl will execute after review
--
-- This implements:
-- - Tier 1: Paid/Trial (existing - unchanged)
-- - Tier 2: Claimed-Free "Lite" with featured items (NEW)
-- - Tier 3: Unclaimed Fallback directory (NEW)
--
-- ============================================================================

-- ============================================================================
-- PART A: ADD NEW COLUMNS
-- ============================================================================

-- Track if claimed business has seen welcome modal (one-time)
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS claim_welcome_modal_shown BOOLEAN DEFAULT false;

-- Admin approval flag for Tier 3 fallback directory
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS admin_chat_fallback_approved BOOLEAN DEFAULT false;

-- Create index for Tier 3 fallback queries
-- Partial index that matches the view's WHERE clause exactly
-- This is the "never think about it again" version - covers all Tier 3 filters
CREATE INDEX IF NOT EXISTS idx_bp_fallback_pool_city
ON business_profiles(city)
WHERE admin_chat_fallback_approved = true
  AND auto_imported = true
  AND status = 'unclaimed'
  AND business_tier = 'free_tier'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

COMMENT ON INDEX idx_bp_fallback_pool_city IS
  'Optimizes Tier 3 fallback pool queries. Partial index matches business_profiles_ai_fallback_pool view filters exactly.';

-- ============================================================================
-- PART B: ADD DATABASE CONSTRAINT (PREVENT CHEATING)
-- ============================================================================

-- CRITICAL: Enforce max 5 featured items at database level
-- This prevents API/dev tool workarounds that bypass UI validation
-- CONDITIONAL on status='claimed_free' (doesn't limit paid tiers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_preview_max_5_items'
  ) THEN
    ALTER TABLE business_profiles
    ADD CONSTRAINT menu_preview_max_5_items
    CHECK (
      status <> 'claimed_free'
      OR menu_preview IS NULL
      OR jsonb_array_length(menu_preview) <= 5
    );
    
    COMMENT ON CONSTRAINT menu_preview_max_5_items ON business_profiles IS
      'Enforces max 5 featured items for claimed_free tier only. Logic: if status = claimed_free then menu_preview must be null or length <= 5. Paid tiers unlimited. Prevents API/dev tool workarounds that bypass UI validation.';
      
    RAISE NOTICE 'Created constraint: menu_preview_max_5_items';
  ELSE
    RAISE NOTICE 'Constraint menu_preview_max_5_items already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- PART C: CREATE TIER 2 VIEW (Claimed-Free "Lite")
-- ============================================================================

-- Tier 2: Claimed-Free businesses with at least 1 featured item
-- These appear in chat BELOW paid/trial (Tier 1)
-- Max 3 cards shown in chat with divider label
CREATE OR REPLACE VIEW public.business_profiles_lite_eligible AS
SELECT
  bp.id,
  bp.business_name,
  bp.display_category,
  bp.google_primary_type,
  bp.business_town,
  bp.business_address,
  bp.phone,
  bp.website_url,
  bp.google_place_id,
  bp.latitude,
  bp.longitude,
  bp.rating,
  bp.review_count,
  bp.city,
  bp.business_hours,
  bp.business_hours_structured,
  bp.menu_preview,
  
  -- Derive count from JSONB length (no new column needed)
  jsonb_array_length(bp.menu_preview) as featured_items_count,
  
  -- Count approved offers for Lite tier (DISPLAY ONLY - badge showing "1 offer")
  -- CRITICAL: Use 'approved' status to match business_offers_chat_eligible logic
  -- DO NOT use business_offers_chat_eligible view for counting - this is raw table query
  (SELECT COUNT(*) 
   FROM business_offers 
   WHERE business_id = bp.id 
   AND status = 'approved' 
   AND (offer_end_date IS NULL OR offer_end_date >= NOW())
  ) as approved_offers_count
  
FROM business_profiles bp
WHERE
  bp.status = 'claimed_free'
  AND bp.business_tier = 'free_tier' -- Belt and braces: double-check tier
  AND bp.menu_preview IS NOT NULL
  AND jsonb_array_length(bp.menu_preview) >= 1
  AND bp.latitude IS NOT NULL
  AND bp.longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_lite_eligible IS
  'Tier 2: Claimed-free businesses with at least 1 featured item. Used by chat for text-only mentions below paid/trial (Tier 1). View returns full data; app layer renders as text (no carousel cards). Monetization: carousel cards are paid-only, free tier gets text mentions. Max 5 featured items allowed per business (enforced by DB constraint). Max 3 businesses shown in chat as text bullets.';

GRANT SELECT ON business_profiles_lite_eligible TO authenticated, anon, service_role;

-- ============================================================================
-- PART D: CREATE TIER 3 VIEW (Unclaimed Fallback Directory)
-- ============================================================================

-- Tier 3: Admin-curated fallback directory
-- Shows ONLY when Tier 1 AND Tier 2 are BOTH empty
-- Basic contact info + Google reviews only
-- Automatically excluded when business claims (status changes from unclaimed)
CREATE OR REPLACE VIEW public.business_profiles_ai_fallback_pool AS
SELECT
  id,
  business_name,
  display_category,
  google_primary_type,
  business_town,
  business_address,
  phone,
  website_url,
  google_place_id,
  google_reviews_highlights,  -- ✅ Verbatim Google review snippets (legal for unclaimed businesses)
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured,
  status  -- ✅ Include status so chat can verify it's unclaimed
FROM business_profiles
WHERE
  auto_imported = true
  AND status = 'unclaimed'
  AND business_tier = 'free_tier'
  AND admin_chat_fallback_approved = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_ai_fallback_pool IS
  'Tier 3: Admin-curated fallback directory for chat when Tier 1 AND Tier 2 are empty. NOT AI businesses - basic contact info + Google reviews only. Always requires disclaimer: I do not have confirmed menu information. Automatically excluded when business claims (status changes from unclaimed). Requires Google attribution: Ratings and reviews data provided by Google.';

GRANT SELECT ON business_profiles_ai_fallback_pool TO authenticated, anon, service_role;

-- ============================================================================
-- PART E: VERIFICATION QUERIES
-- ============================================================================

-- Check new columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
AND column_name IN ('claim_welcome_modal_shown', 'admin_chat_fallback_approved')
ORDER BY column_name;

-- Check constraint exists
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'menu_preview_max_5_items';

-- Check index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_bp_fallback_pool_city';

-- Check Tier 2 view exists and count eligible businesses
SELECT 
  city,
  COUNT(*) as lite_businesses,
  AVG(featured_items_count) as avg_featured_items,
  SUM(approved_offers_count) as total_offers
FROM business_profiles_lite_eligible
GROUP BY city
ORDER BY city;

-- Check Tier 3 view exists and count approved fallback businesses
SELECT 
  city,
  COUNT(*) as fallback_businesses
FROM business_profiles_ai_fallback_pool
GROUP BY city
ORDER BY city;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================

-- ✅ Added: claim_welcome_modal_shown column (tracks one-time modal)
-- ✅ Added: admin_chat_fallback_approved column (Tier 3 approval flag)
-- ✅ Added: menu_preview_max_5_items constraint (claimed_free only, rerunnable)
-- ✅ Created: business_profiles_lite_eligible view (Tier 2 - TEXT-ONLY mentions)
-- ✅ Created: business_profiles_ai_fallback_pool view (Tier 3 - TEXT-ONLY mentions)
-- ✅ Created: Partial index on city for Tier 3 queries (matches view filters exactly)

-- MONETIZATION ENFORCEMENT:
-- 💰 Carousel cards = PAID-ONLY (via business_profiles_chat_eligible)
-- 💰 Free tier = Text mentions only (clear upgrade incentive)

-- UNCHANGED:
-- ❌ business_profiles_chat_eligible (Tier 1 - paid/trial)
-- ❌ business_offers_chat_eligible (paid offers only)
-- ❌ Any existing views or tables

-- ============================================================================
-- IMPORTANT NOTES FOR DARRYL
-- ============================================================================

-- ✅ HARDENED BASED ON PEER REVIEW - SAFE TO RUN

-- Key improvements made:
-- 1. ✅ Constraint is CONDITIONAL on status='claimed_free' (won't limit paid tiers)
-- 2. ✅ Constraint uses DO block (rerunnable, won't fail if exists)
-- 3. ✅ Lite view checks BOTH status='claimed_free' AND business_tier='free_tier'
-- 4. ✅ Renamed active_offers_count → approved_offers_count (matches status logic)
-- 5. ✅ Partial index matches Tier 3 view filters exactly (future-proof performance)

-- Running instructions:
-- 1. Run each PART (A, B, C, D, E) separately and verify output
-- 2. PART B uses DO block so it's safe to rerun (won't error if constraint exists)
-- 3. PART E verification should show:
--    - 2 new columns in business_profiles
--    - 1 new constraint (menu_preview_max_5_items) - only applies to claimed_free
--    - 2 new views with row counts per city
--    - 1 partial index for Tier 3 queries (matches all view filters)
--
-- 4. No data is moved or changed - only filters/views/indexes added
-- 5. Safe to run on production (read-only views + additive columns)
-- 6. Constraint only applies to claimed_free status (paid tiers unlimited)
--
-- ============================================================================
