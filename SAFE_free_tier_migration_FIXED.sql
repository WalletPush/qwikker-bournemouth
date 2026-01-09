-- ============================================================================
-- FREE TIER SYSTEM - SAFE MIGRATION (FIXED!)
-- ============================================================================
-- Purpose: Enable free tier system WITHOUT breaking existing founding member flow
-- Date: January 8, 2026
-- 
-- CRITICAL FIXES:
-- - EXTENDS existing status column (doesn't replace it!)
-- - KEEPS existing 'incomplete', 'approved' status values
-- - Safe defaults for ALL existing businesses
-- 
-- SAFE: Existing businesses stay as-is, no data loss
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add Google Places API key + founding member settings
-- ============================================================================

ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT,
ADD COLUMN IF NOT EXISTS founding_member_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS founding_member_total_spots INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS founding_member_trial_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS founding_member_discount_percent INTEGER DEFAULT 20 CHECK (founding_member_discount_percent >= 0 AND founding_member_discount_percent <= 100);

-- Set Bournemouth defaults
UPDATE franchise_crm_configs
SET 
  founding_member_enabled = COALESCE(founding_member_enabled, true),
  founding_member_total_spots = COALESCE(founding_member_total_spots, 150),
  founding_member_trial_days = COALESCE(founding_member_trial_days, 90),
  founding_member_discount_percent = COALESCE(founding_member_discount_percent, 20)
WHERE city = 'bournemouth';

-- ============================================================================
-- STEP 2: Add NEW columns to business_profiles (DON'T touch status yet!)
-- ============================================================================

-- Owner/Claimer tracking (new column)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Visibility control (new column)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled';

-- Founding member tracking (new columns)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0 CHECK (founding_member_discount >= 0 AND founding_member_discount <= 100);

-- Trial period tracking (new columns)
-- NOTE: These are DIFFERENT from business_subscriptions.free_trial_start_date!
-- These are for the old system or special promotions
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Google Places integration (new columns)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS auto_imported BOOLEAN DEFAULT false;

-- Claim timestamp (new column)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- STEP 3: EXTEND status constraint (don't replace!)
-- ============================================================================

-- Drop old constraint if it exists
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_status_check;

-- Add NEW constraint with ALL values (existing + new)
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_status_check 
CHECK (status IN (
  -- EXISTING VALUES (founding member flow - DO NOT REMOVE!)
  'incomplete',       -- Founding member filling out profile
  'pending_review',   -- Founding member submitted for review (might not exist yet, but adding for safety)
  'approved',         -- Live on platform (existing businesses!)
  
  -- NEW VALUES (free tier flow)
  'unclaimed',        -- Google import, no owner
  'pending_claim',    -- Claim submitted, awaiting admin approval
  'claimed_free',     -- Claimed, free tier, features locked
  'pending_upgrade',  -- Free tier submitted for upgrade review
  
  -- FUTURE VALUES (for flexibility)
  'pending_update',   -- Edit submitted, awaiting admin approval
  'suspended',        -- Temporarily suspended
  'removed'           -- Removed from platform
));

-- ============================================================================
-- STEP 4: Add visibility constraint
-- ============================================================================

ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_visibility_check;

ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_visibility_check
CHECK (visibility IN (
  'discover_only',  -- Free tier: Only in Discover, NOT in AI
  'ai_enabled'      -- Paid/Trial: Visible in AI recommendations
));

-- ============================================================================
-- STEP 5: Add indexes for performance
-- ============================================================================

-- Google Place ID unique (prevent duplicate imports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_google_place_id 
ON business_profiles(google_place_id) 
WHERE google_place_id IS NOT NULL;

-- Fast filtering by status
CREATE INDEX IF NOT EXISTS idx_business_profiles_status 
ON business_profiles(status);

-- Fast filtering by visibility (AI query exclusion)
CREATE INDEX IF NOT EXISTS idx_business_profiles_visibility 
ON business_profiles(visibility);

-- Fast lookup by owner
CREATE INDEX IF NOT EXISTS idx_business_profiles_owner_user_id 
ON business_profiles(owner_user_id);

-- Multi-tenant: status + city composite
CREATE INDEX IF NOT EXISTS idx_business_profiles_city_status 
ON business_profiles(city, status);

-- Founding member filtering
CREATE INDEX IF NOT EXISTS idx_business_profiles_founding_member 
ON business_profiles(founding_member) 
WHERE founding_member = true;

-- Auto-imported businesses
CREATE INDEX IF NOT EXISTS idx_business_profiles_auto_imported 
ON business_profiles(auto_imported) 
WHERE auto_imported = true;

-- ============================================================================
-- STEP 6: Backfill owner_user_id for existing businesses
-- ============================================================================

-- Link owner_user_id to user_id for existing businesses
UPDATE business_profiles
SET owner_user_id = user_id
WHERE owner_user_id IS NULL 
  AND user_id IS NOT NULL;

-- Set claimed_at for existing businesses (use created_at as approximation)
UPDATE business_profiles
SET claimed_at = created_at
WHERE claimed_at IS NULL 
  AND created_at IS NOT NULL;

-- ============================================================================
-- STEP 7: Create claim_requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS claim_requests (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
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
  
  -- Contact information
  business_email TEXT NOT NULL,
  business_website TEXT,
  
  -- Fraud prevention
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
  
  -- One active claim per business per user
  CONSTRAINT unique_active_claim UNIQUE (business_id, user_id, status)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_id ON claim_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_user_id ON claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_city ON claim_requests(city);
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_email ON claim_requests(business_email);
CREATE INDEX IF NOT EXISTS idx_claim_requests_city_status ON claim_requests(city, status);

-- Enable RLS
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own claims
DROP POLICY IF EXISTS "Users can view their own claims" ON claim_requests;
CREATE POLICY "Users can view their own claims"
  ON claim_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: Users can create claims
DROP POLICY IF EXISTS "Users can create claims" ON claim_requests;
CREATE POLICY "Users can create claims"
  ON claim_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: Admins can view claims for their city
DROP POLICY IF EXISTS "Admins can view claims for their city" ON claim_requests;
CREATE POLICY "Admins can view claims for their city"
  ON claim_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM city_admins
      WHERE city_admins.id = auth.uid()
      AND city_admins.city = claim_requests.city
    )
  );

-- RLS: Admins can update claims for their city
DROP POLICY IF EXISTS "Admins can update claims for their city" ON claim_requests;
CREATE POLICY "Admins can update claims for their city"
  ON claim_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM city_admins
      WHERE city_admins.id = auth.uid()
      AND city_admins.city = claim_requests.city
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_claim_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_claim_requests_timestamp ON claim_requests;
CREATE TRIGGER update_claim_requests_timestamp
  BEFORE UPDATE ON claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_claim_requests_updated_at();

-- ============================================================================
-- STEP 8: RLS for business_profiles (users can view claimed businesses)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their claimed businesses" ON business_profiles;
CREATE POLICY "Users can view their claimed businesses"
  ON business_profiles
  FOR SELECT
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- STEP 9: Helper functions
-- ============================================================================

-- Check if founding member spots are available
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
  SELECT 
    founding_member_enabled,
    founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  IF NOT v_enabled THEN
    RETURN false;
  END IF;
  
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city 
    AND status = 'approved'
    AND is_founding_member = true;
  
  RETURN v_claimed_spots < v_total_spots;
END;
$$;

-- Get founding member status (how many spots left)
CREATE OR REPLACE FUNCTION get_founding_member_status(p_city TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_total_spots INTEGER;
  v_claimed_spots INTEGER;
  v_available BOOLEAN;
  v_next_spot_number INTEGER;
BEGIN
  SELECT 
    founding_member_enabled,
    founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  IF NOT v_enabled THEN
    RETURN json_build_object(
      'enabled', false,
      'available', false,
      'spots_remaining', 0
    );
  END IF;
  
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city 
    AND status = 'approved'
    AND is_founding_member = true;
  
  v_available := v_claimed_spots < v_total_spots;
  
  IF v_available THEN
    v_next_spot_number := v_claimed_spots + 1;
  ELSE
    v_next_spot_number := NULL;
  END IF;
  
  RETURN json_build_object(
    'enabled', v_enabled,
    'available', v_available,
    'total_spots', v_total_spots,
    'claimed_spots', v_claimed_spots,
    'spots_remaining', v_total_spots - v_claimed_spots,
    'next_spot_number', v_next_spot_number
  );
END;
$$;

-- Calculate risk score for a claim
CREATE OR REPLACE FUNCTION calculate_claim_risk_score(
  p_user_id UUID,
  p_business_id UUID,
  p_business_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_risk_score INTEGER := 0;
  v_risk_level TEXT := 'low';
  v_email_domain TEXT;
  v_business_website TEXT;
  v_email_domain_match BOOLEAN := false;
  v_duplicate_claims INTEGER := 0;
  v_denied_claims INTEGER := 0;
  v_account_age_days INTEGER;
BEGIN
  v_email_domain := LOWER(SPLIT_PART(p_business_email, '@', 2));
  
  SELECT website INTO v_business_website
  FROM business_profiles
  WHERE id = p_business_id;
  
  IF v_business_website IS NOT NULL AND v_business_website ILIKE '%' || v_email_domain || '%' THEN
    v_email_domain_match := true;
  ELSE
    v_risk_score := v_risk_score + 20;
  END IF;
  
  SELECT COUNT(*) INTO v_duplicate_claims
  FROM claim_requests
  WHERE user_id = p_user_id
  AND status = 'pending';
  
  v_risk_score := v_risk_score + (v_duplicate_claims * 15);
  
  SELECT COUNT(*) INTO v_denied_claims
  FROM claim_requests
  WHERE user_id = p_user_id
  AND status = 'denied';
  
  v_risk_score := v_risk_score + (v_denied_claims * 25);
  
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_age_days
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_account_age_days < 1 THEN
    v_risk_score := v_risk_score + 30;
  ELSIF v_account_age_days < 7 THEN
    v_risk_score := v_risk_score + 15;
  END IF;
  
  IF v_risk_score >= 70 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 30 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;
  
  RETURN json_build_object(
    'risk_score', v_risk_score,
    'risk_level', v_risk_level,
    'email_domain_match', v_email_domain_match,
    'duplicate_claims_count', v_duplicate_claims,
    'denied_claims_count', v_denied_claims,
    'account_age_days', v_account_age_days
  );
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
  
  RETURN (v_status = 'unclaimed' AND v_owner_id IS NULL);
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check status values in use
SELECT 
  status,
  visibility,
  COUNT(*) as count
FROM business_profiles
GROUP BY status, visibility
ORDER BY count DESC;

-- Check franchise config
SELECT 
  city,
  founding_member_enabled,
  founding_member_total_spots,
  founding_member_trial_days
FROM franchise_crm_configs;

-- Check claim_requests table exists
SELECT COUNT(*) as claim_count FROM claim_requests;

-- ============================================================================
-- SUCCESS! ✅
-- ============================================================================
-- All existing businesses should still be status='approved' (or 'incomplete')
-- All existing businesses should have visibility='ai_enabled'
-- claim_requests table created
-- Founding member settings configured
-- ============================================================================


