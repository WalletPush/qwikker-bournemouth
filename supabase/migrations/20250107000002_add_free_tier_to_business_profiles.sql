-- Migration: Add Free Tier Support to Business Profiles
-- Purpose: Add columns for claim flow, status tracking, and visibility control
-- Date: 2025-01-07
-- SAFETY: Uses safe defaults - existing businesses remain "claimed_paid" and "ai_enabled"
-- IMPORTANT: Does NOT modify existing subscription system (business_subscriptions, subscription_tiers)

-- ============================================================================
-- ROLLBACK PLAN (If something breaks, run these commands)
-- ============================================================================
/*
ALTER TABLE business_profiles DROP COLUMN IF EXISTS owner_user_id;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS status;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS visibility;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS founding_member;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS founding_member_discount;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS trial_start_date;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS trial_end_date;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS google_place_id;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS auto_imported;
ALTER TABLE business_profiles DROP COLUMN IF EXISTS claimed_at;
*/

-- ============================================================================
-- ADD NEW COLUMNS (With Safe Defaults)
-- ============================================================================

-- Owner/Claimer tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Business status (lifecycle tracking)
-- DEFAULT 'claimed_paid' means existing businesses stay approved/paid
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'claimed_paid';

-- Visibility control (Discover vs AI recommendations)
-- DEFAULT 'ai_enabled' means existing businesses stay in AI results
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled';

-- Founding member tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0 CHECK (founding_member_discount >= 0 AND founding_member_discount <= 100);

-- Trial period tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Google Places integration
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false;

-- Claim timestamp
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- ADD CONSTRAINTS (After columns exist)
-- ============================================================================

-- Status must be one of the valid lifecycle states
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_status_check;

ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_status_check 
CHECK (status IN (
  'unclaimed',        -- Google import, no owner
  'pending_claim',    -- Claim submitted, awaiting admin approval
  'claimed_free',     -- Claimed, free tier, features locked
  'pending_upgrade',  -- Submitted for upgrade, awaiting admin quality review
  'claimed_trial',    -- Free trial of Featured tier
  'claimed_paid',     -- Active paid subscription
  'pending_update'    -- Edit submitted, awaiting admin approval
));

-- Visibility must be one of the two modes
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_visibility_check;

ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_visibility_check
CHECK (visibility IN (
  'discover_only',  -- Visible in Discover listings only (free tier)
  'ai_enabled'      -- Visible in AI chat recommendations (paid tiers)
));

-- Google Place ID should be unique (prevent duplicate imports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_google_place_id 
ON business_profiles(google_place_id) 
WHERE google_place_id IS NOT NULL;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast filtering by status (admin queues)
CREATE INDEX IF NOT EXISTS idx_business_profiles_status 
ON business_profiles(status);

-- Fast filtering by visibility (AI query exclusion)
CREATE INDEX IF NOT EXISTS idx_business_profiles_visibility 
ON business_profiles(visibility);

-- Fast lookup by owner (user's claimed businesses)
CREATE INDEX IF NOT EXISTS idx_business_profiles_owner_user_id 
ON business_profiles(owner_user_id);

-- Multi-tenant: status + city composite (admin dashboard queries)
CREATE INDEX IF NOT EXISTS idx_business_profiles_city_status 
ON business_profiles(city, status);

-- Founding member filtering
CREATE INDEX IF NOT EXISTS idx_business_profiles_founding_member 
ON business_profiles(founding_member) 
WHERE founding_member = true;

-- Auto-imported businesses (for import tracking)
CREATE INDEX IF NOT EXISTS idx_business_profiles_auto_imported 
ON business_profiles(auto_imported) 
WHERE auto_imported = true;

-- ============================================================================
-- UPDATE RLS POLICIES (Extend existing)
-- ============================================================================

-- Note: We're NOT replacing existing RLS policies, just ensuring they work with new columns
-- Existing policies on business_profiles should continue to work

-- Allow users to view businesses they own (for claimed businesses)
DROP POLICY IF EXISTS "Users can view their claimed businesses" ON business_profiles;
CREATE POLICY "Users can view their claimed businesses"
  ON business_profiles
  FOR SELECT
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get businesses pending claim approval (for admin)
CREATE OR REPLACE FUNCTION get_pending_claim_businesses(p_city TEXT)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  claim_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id as business_id,
    bp.business_name,
    bp.status,
    bp.created_at,
    COUNT(cr.id) as claim_count
  FROM business_profiles bp
  LEFT JOIN claim_requests cr ON cr.business_id = bp.id AND cr.status = 'pending'
  WHERE bp.city = p_city
    AND bp.status = 'pending_claim'
  GROUP BY bp.id, bp.business_name, bp.status, bp.created_at
  ORDER BY bp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_pending_claim_businesses(TEXT) IS 'Get businesses with pending claim requests for admin review';

-- Function to check if business is claimable
CREATE OR REPLACE FUNCTION is_business_claimable(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_owner_id UUID;
BEGIN
  SELECT status, owner_user_id 
  INTO v_status, v_owner_id
  FROM business_profiles
  WHERE id = p_business_id;
  
  -- Business is claimable if it's unclaimed and has no owner
  RETURN (v_status = 'unclaimed' AND v_owner_id IS NULL);
END;
$$;

COMMENT ON FUNCTION is_business_claimable(UUID) IS 'Check if a business can be claimed (unclaimed status, no owner)';

-- ============================================================================
-- DATA MIGRATION (Safe backfill for existing businesses)
-- ============================================================================

-- Set claimed_at for existing businesses that don't have it
-- This uses created_at as a reasonable approximation
UPDATE business_profiles
SET claimed_at = created_at
WHERE claimed_at IS NULL 
  AND status = 'claimed_paid'
  AND created_at IS NOT NULL;

-- Link owner_user_id to user_id for existing businesses
-- ONLY if user_id exists and owner_user_id is NULL
UPDATE business_profiles
SET owner_user_id = user_id
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON COLUMN business_profiles.owner_user_id IS 'User who claimed/owns this business (NULL for unclaimed)';
COMMENT ON COLUMN business_profiles.status IS 'Business lifecycle status (unclaimed → pending_claim → claimed_free → pending_upgrade → claimed_trial/paid)';
COMMENT ON COLUMN business_profiles.visibility IS 'Where business appears: discover_only (free) or ai_enabled (paid)';
COMMENT ON COLUMN business_profiles.founding_member IS 'Whether business claimed during founding member program';
COMMENT ON COLUMN business_profiles.founding_member_discount IS 'Lifetime discount percentage for founding members (0-100)';
COMMENT ON COLUMN business_profiles.trial_start_date IS 'When free trial started (for founding members or promotions)';
COMMENT ON COLUMN business_profiles.trial_end_date IS 'When free trial ends';
COMMENT ON COLUMN business_profiles.google_place_id IS 'Google Places API place_id (unique, for deduplication)';
COMMENT ON COLUMN business_profiles.auto_imported IS 'Whether business was auto-imported from Google Places';
COMMENT ON COLUMN business_profiles.claimed_at IS 'When business was claimed by owner';

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- ============================================================================

/*
-- Check column exists and defaults are correct
SELECT 
  status,
  visibility,
  COUNT(*) as count
FROM business_profiles
GROUP BY status, visibility;

-- Should see existing businesses with status='claimed_paid' and visibility='ai_enabled'

-- Check indexes created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'business_profiles' 
  AND indexname LIKE '%status%' 
   OR indexname LIKE '%visibility%'
   OR indexname LIKE '%owner_user_id%';

-- Check constraints applied
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'business_profiles'::regclass
  AND conname LIKE '%status%' 
   OR conname LIKE '%visibility%';
*/

