-- ============================================================================
-- FREE TIER SYSTEM - COMPLETE MIGRATION
-- ============================================================================
-- Purpose: Apply all 3 free tier migrations in correct order
-- Date: January 8, 2026
-- Run this file in Supabase SQL Editor to enable the free tier system
-- 
-- This will:
-- 1. Add Google Places API key + founding member settings to franchise configs
-- 2. Create claim_requests table for claim workflow
-- 3. Add status/visibility columns to business_profiles
--
-- SAFE: Uses safe defaults, existing businesses stay "claimed_paid" + "ai_enabled"
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Add franchise config columns
-- ============================================================================

-- Add new columns to franchise_crm_configs table
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT,
ADD COLUMN IF NOT EXISTS founding_member_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS founding_member_total_spots INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS founding_member_trial_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS founding_member_discount_percent INTEGER DEFAULT 20 CHECK (founding_member_discount_percent >= 0 AND founding_member_discount_percent <= 100);

-- Add comments
COMMENT ON COLUMN franchise_crm_configs.google_places_api_key IS 'Google Places API key for auto-importing businesses (paid by franchise owner). Cost: ~£0.075/business.';
COMMENT ON COLUMN franchise_crm_configs.founding_member_enabled IS 'Whether the founding member program is active for this franchise';
COMMENT ON COLUMN franchise_crm_configs.founding_member_total_spots IS 'Maximum number of founding member spots available (first X claims)';
COMMENT ON COLUMN franchise_crm_configs.founding_member_trial_days IS 'Length of free Featured tier trial for founding members (in days)';
COMMENT ON COLUMN franchise_crm_configs.founding_member_discount_percent IS 'Lifetime discount percentage for founding members who upgrade (0-100)';

-- Update Bournemouth with default founding member settings
UPDATE franchise_crm_configs
SET 
  founding_member_enabled = true,
  founding_member_total_spots = 150,
  founding_member_trial_days = 90,
  founding_member_discount_percent = 20
WHERE city = 'bournemouth';

-- ============================================================================
-- MIGRATION 2: Create claim_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_requests (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant: which city/franchise is this claim for?
  city TEXT NOT NULL REFERENCES franchise_crm_configs(city) ON DELETE CASCADE,
  
  -- Business being claimed
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- User making the claim
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Claim status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  
  -- Verification details
  verification_method TEXT CHECK (verification_method IN ('email', 'manual')),
  verification_code TEXT,
  verification_code_expires_at TIMESTAMP WITH TIME ZONE,
  verification_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contact information provided during claim
  business_email TEXT NOT NULL,
  business_website TEXT,
  
  -- Fraud prevention: Risk scoring
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  email_domain_match BOOLEAN DEFAULT false,
  duplicate_claims_count INTEGER DEFAULT 0,
  denied_claims_count INTEGER DEFAULT 0,
  
  -- Founding member tracking
  is_founding_member BOOLEAN DEFAULT false,
  founding_member_spot_number INTEGER,
  
  -- Admin review
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  denial_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints: One active claim per business per user
  CONSTRAINT unique_active_claim UNIQUE (business_id, user_id, status)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_id ON claim_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_user_id ON claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_city ON claim_requests(city);
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_email ON claim_requests(business_email);
CREATE INDEX IF NOT EXISTS idx_claim_requests_city_status ON claim_requests(city, status);

-- Enable RLS
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own claims" ON claim_requests;
CREATE POLICY "Users can view their own claims"
  ON claim_requests
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create claims" ON claim_requests;
CREATE POLICY "Users can create claims"
  ON claim_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE claim_requests IS 'Tracks business listing claim requests with fraud prevention and multi-tenant support';
COMMENT ON COLUMN claim_requests.city IS 'Franchise/city this claim belongs to (multi-tenant isolation)';
COMMENT ON COLUMN claim_requests.business_id IS 'The business listing being claimed';
COMMENT ON COLUMN claim_requests.user_id IS 'The user requesting to claim the business';
COMMENT ON COLUMN claim_requests.status IS 'Claim status: pending, approved, or denied';
COMMENT ON COLUMN claim_requests.verification_method IS 'How the claim was verified (email or manual admin approval)';
COMMENT ON COLUMN claim_requests.business_email IS 'Email provided by claimer (used for domain matching)';
COMMENT ON COLUMN claim_requests.risk_score IS 'Fraud risk score 0-100 (higher = more risky)';
COMMENT ON COLUMN claim_requests.is_founding_member IS 'Whether this claim qualifies for founding member benefits';
COMMENT ON COLUMN claim_requests.founding_member_spot_number IS 'Which founding member spot number (e.g. #47 of 150)';

-- ============================================================================
-- MIGRATION 3: Add free tier columns to business_profiles
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

-- Add constraints
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

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_status ON business_profiles(status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_visibility ON business_profiles(visibility);
CREATE INDEX IF NOT EXISTS idx_business_profiles_owner_user_id ON business_profiles(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city_status ON business_profiles(city, status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_founding_member ON business_profiles(founding_member) WHERE founding_member = true;
CREATE INDEX IF NOT EXISTS idx_business_profiles_auto_imported ON business_profiles(auto_imported) WHERE auto_imported = true;

-- RLS: Allow users to view businesses they own
DROP POLICY IF EXISTS "Users can view their claimed businesses" ON business_profiles;
CREATE POLICY "Users can view their claimed businesses"
  ON business_profiles
  FOR SELECT
  USING (owner_user_id = auth.uid());

-- Data migration: Set claimed_at for existing businesses
UPDATE business_profiles
SET claimed_at = created_at
WHERE claimed_at IS NULL 
  AND status = 'claimed_paid'
  AND created_at IS NOT NULL;

-- Link owner_user_id to user_id for existing businesses
UPDATE business_profiles
SET owner_user_id = user_id
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL;

-- Comments
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
-- HELPER FUNCTIONS
-- ============================================================================

-- Check founding member eligibility
CREATE OR REPLACE FUNCTION is_founding_member_spot_available(p_city TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_total_spots INTEGER;
  v_claimed_spots INTEGER;
BEGIN
  -- Get franchise founding member settings
  SELECT 
    founding_member_enabled,
    founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  -- If not enabled, return false
  IF NOT v_enabled THEN
    RETURN false;
  END IF;
  
  -- Count how many founding member spots have been claimed
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city 
    AND status = 'approved'
    AND is_founding_member = true;
  
  RETURN v_claimed_spots < v_total_spots;
END;
$$;

-- Get pending claim businesses for admin
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

-- Check if business is claimable
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

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this to verify the migration worked:
SELECT 
  'franchise_configs' as table_name,
  COUNT(*) as count,
  COUNT(google_places_api_key) as has_api_key,
  SUM(CASE WHEN founding_member_enabled THEN 1 ELSE 0 END) as fm_enabled
FROM franchise_crm_configs
UNION ALL
SELECT 
  'claim_requests' as table_name,
  COUNT(*) as count,
  NULL as has_api_key,
  NULL as fm_enabled
FROM claim_requests
UNION ALL
SELECT 
  'business_profiles' as table_name,
  COUNT(*) as count,
  SUM(CASE WHEN status = 'claimed_paid' THEN 1 ELSE 0 END) as has_api_key,
  SUM(CASE WHEN visibility = 'ai_enabled' THEN 1 ELSE 0 END) as fm_enabled
FROM business_profiles;

-- ============================================================================
-- DONE! 🎉
-- ============================================================================
-- Next steps:
-- 1. Check the query results above to verify everything worked
-- 2. Add your Google Places API key in the admin setup UI
-- 3. Start building the claim flow APIs
-- ============================================================================


