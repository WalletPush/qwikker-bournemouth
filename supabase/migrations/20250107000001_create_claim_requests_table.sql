-- Migration: Create Claim Requests System
-- Purpose: Allow users to claim unclaimed business listings with fraud prevention
-- Date: 2025-01-07
-- Multi-Tenant: YES - claims are city/franchise-specific

-- ============================================================================
-- CLAIM REQUESTS TABLE
-- ============================================================================

CREATE TABLE claim_requests (
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
  
  -- Constraints
  -- One active claim per business per user (can't claim same business twice)
  CONSTRAINT unique_active_claim UNIQUE (business_id, user_id, status)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookups by business (check if already claimed)
CREATE INDEX idx_claim_requests_business_id ON claim_requests(business_id);

-- Fast lookups by user (check user's claim history)
CREATE INDEX idx_claim_requests_user_id ON claim_requests(user_id);

-- Fast lookups by status (admin approval queue)
CREATE INDEX idx_claim_requests_status ON claim_requests(status);

-- Multi-tenant: fast lookups by city
CREATE INDEX idx_claim_requests_city ON claim_requests(city);

-- Fast lookups by email for fraud detection
CREATE INDEX idx_claim_requests_business_email ON claim_requests(business_email);

-- Composite index for admin dashboard (city + status)
CREATE INDEX idx_claim_requests_city_status ON claim_requests(city, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view their own claims"
  ON claim_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create claims (insert)
CREATE POLICY "Users can create claims"
  ON claim_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all claims for their franchise
CREATE POLICY "Admins can view claims for their franchise"
  ON claim_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM franchise_crm_configs
      WHERE franchise_crm_configs.city = claim_requests.city
      AND (
        franchise_crm_configs.owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@qwikker.com'
      )
    )
  );

-- Admins can update claims for their franchise (approve/deny)
CREATE POLICY "Admins can update claims for their franchise"
  ON claim_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM franchise_crm_configs
      WHERE franchise_crm_configs.city = claim_requests.city
      AND (
        franchise_crm_configs.owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@qwikker.com'
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claim_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_claim_requests_timestamp
  BEFORE UPDATE ON claim_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_claim_requests_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate risk score for a claim
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
  v_result JSON;
BEGIN
  -- Extract email domain
  v_email_domain := LOWER(SPLIT_PART(p_business_email, '@', 2));
  
  -- Get business website domain for comparison
  SELECT website INTO v_business_website
  FROM business_profiles
  WHERE id = p_business_id;
  
  -- Check if email domain matches business website
  IF v_business_website IS NOT NULL AND v_business_website ILIKE '%' || v_email_domain || '%' THEN
    v_email_domain_match := true;
  ELSE
    v_risk_score := v_risk_score + 20; -- Email doesn't match website
  END IF;
  
  -- Check for duplicate claims from this user
  SELECT COUNT(*) INTO v_duplicate_claims
  FROM claim_requests
  WHERE user_id = p_user_id
  AND status = 'pending';
  
  v_risk_score := v_risk_score + (v_duplicate_claims * 15);
  
  -- Check for previously denied claims
  SELECT COUNT(*) INTO v_denied_claims
  FROM claim_requests
  WHERE user_id = p_user_id
  AND status = 'denied';
  
  v_risk_score := v_risk_score + (v_denied_claims * 25);
  
  -- Check account age
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_age_days
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_account_age_days < 1 THEN
    v_risk_score := v_risk_score + 30; -- Brand new account
  ELSIF v_account_age_days < 7 THEN
    v_risk_score := v_risk_score + 15; -- Very new account
  END IF;
  
  -- Determine risk level
  IF v_risk_score >= 70 THEN
    v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN
    v_risk_level := 'high';
  ELSIF v_risk_score >= 30 THEN
    v_risk_level := 'medium';
  ELSE
    v_risk_level := 'low';
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'risk_score', v_risk_score,
    'risk_level', v_risk_level,
    'email_domain_match', v_email_domain_match,
    'duplicate_claims_count', v_duplicate_claims,
    'denied_claims_count', v_denied_claims,
    'account_age_days', v_account_age_days
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION calculate_claim_risk_score(UUID, UUID, TEXT) IS 'Calculate fraud risk score for a business claim request';

-- Function to check if founding member spots are available for a city
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
  v_result JSON;
BEGIN
  -- Get franchise founding member settings
  SELECT 
    founding_member_enabled,
    founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  -- If not enabled, return early
  IF NOT v_enabled THEN
    RETURN json_build_object(
      'enabled', false,
      'available', false,
      'spots_remaining', 0,
      'next_spot_number', NULL
    );
  END IF;
  
  -- Count how many founding member spots have been claimed
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city 
    AND status = 'approved'
    AND is_founding_member = true;
  
  -- Determine if spots are available
  v_available := v_claimed_spots < v_total_spots;
  
  -- Calculate next spot number
  IF v_available THEN
    v_next_spot_number := v_claimed_spots + 1;
  ELSE
    v_next_spot_number := NULL;
  END IF;
  
  -- Build result JSON
  v_result := json_build_object(
    'enabled', v_enabled,
    'available', v_available,
    'total_spots', v_total_spots,
    'claimed_spots', v_claimed_spots,
    'spots_remaining', v_total_spots - v_claimed_spots,
    'next_spot_number', v_next_spot_number
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_founding_member_status(TEXT) IS 'Check founding member program availability for a city';

-- ============================================================================
-- COMMENTS
-- ============================================================================

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

