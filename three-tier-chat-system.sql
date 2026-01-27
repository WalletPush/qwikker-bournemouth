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

-- Create index for fallback queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_fallback 
ON business_profiles(admin_chat_fallback_approved) 
WHERE admin_chat_fallback_approved = true;

-- ============================================================================
-- PART B: ADD DATABASE CONSTRAINT (PREVENT CHEATING)
-- ============================================================================

-- CRITICAL: Enforce max 5 featured items at database level
-- This prevents API/dev tool workarounds that bypass UI validation
-- Without this, claimed_free businesses could add 20 items via direct API calls
ALTER TABLE business_profiles 
ADD CONSTRAINT menu_preview_max_5_items 
CHECK (
  menu_preview IS NULL 
  OR jsonb_array_length(menu_preview) <= 5
);

COMMENT ON CONSTRAINT menu_preview_max_5_items ON business_profiles IS
  'Enforces max 5 featured items for claimed_free tier. Prevents API workarounds.';

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
  
  -- Count active offers for Lite tier (DISPLAY ONLY - badge showing "1 offer")
  -- CRITICAL: Use 'approved' status (NOT 'active') to match business_offers_chat_eligible logic
  -- DO NOT use business_offers_chat_eligible view for counting - this is raw table query
  (SELECT COUNT(*) 
   FROM business_offers 
   WHERE business_id = bp.id 
   AND status = 'approved' 
   AND (valid_until IS NULL OR valid_until >= NOW())
  ) as active_offers_count
  
FROM business_profiles bp
WHERE
  bp.status = 'claimed_free'
  AND bp.menu_preview IS NOT NULL
  AND jsonb_array_length(bp.menu_preview) >= 1
  AND bp.latitude IS NOT NULL
  AND bp.longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_lite_eligible IS
  'Tier 2: Claimed-free businesses with at least 1 featured item. ' ||
  'Shows in chat below paid/trial (Tier 1), above unclaimed fallback (Tier 3). ' ||
  'Max 5 featured items allowed per business (enforced by DB constraint). ' ||
  'Max 3 cards shown in chat with divider label: "More nearby (basic listings)".';

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
  latitude,
  longitude,
  rating,
  review_count,
  city,
  business_hours,
  business_hours_structured
FROM business_profiles
WHERE
  auto_imported = true
  AND status = 'unclaimed'
  AND business_tier = 'free_tier'
  AND admin_chat_fallback_approved = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

COMMENT ON VIEW business_profiles_ai_fallback_pool IS
  'Tier 3: Admin-curated fallback directory for chat when Tier 1 AND Tier 2 are empty. ' ||
  'NOT AI businesses - basic contact info + Google reviews only. ' ||
  'Always requires disclaimer: "I don''t have confirmed menu information..." ' ||
  'Automatically excluded when business claims (status changes from unclaimed). ' ||
  'Requires Google attribution: "Ratings and reviews data provided by Google"';

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

-- Check Tier 2 view exists and count eligible businesses
SELECT 
  city,
  COUNT(*) as lite_businesses,
  AVG(featured_items_count) as avg_featured_items,
  SUM(active_offers_count) as total_offers
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
-- ✅ Added: menu_preview_max_5_items constraint (prevents cheating)
-- ✅ Created: business_profiles_lite_eligible view (Tier 2)
-- ✅ Created: business_profiles_ai_fallback_pool view (Tier 3)
-- ✅ Created: Index on admin_chat_fallback_approved for fast queries

-- UNCHANGED:
-- ❌ business_profiles_chat_eligible (Tier 1 - paid/trial)
-- ❌ business_offers_chat_eligible (paid offers only)
-- ❌ Any existing views or tables

-- ============================================================================
-- IMPORTANT NOTES FOR DARRYL
-- ============================================================================

-- 1. Run each PART (A, B, C, D, E) separately and verify output
-- 2. PART B (constraint) might fail if existing data violates max 5 rule
--    If it fails, run this first to find violators:
--    
--    SELECT id, business_name, jsonb_array_length(menu_preview) as item_count
--    FROM business_profiles 
--    WHERE menu_preview IS NOT NULL 
--    AND jsonb_array_length(menu_preview) > 5;
--
--    Then manually trim those to 5 items before adding constraint
--
-- 3. PART E verification should show:
--    - 2 new columns in business_profiles
--    - 1 new constraint (menu_preview_max_5_items)
--    - 2 new views with row counts per city
--
-- 4. No data is moved or changed - only filters/views added
-- 5. Safe to run on production (read-only views + additive columns)
--
-- ============================================================================
