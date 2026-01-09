-- ============================================================================
-- SMART FREE TIER MIGRATION
-- ============================================================================
-- This checks what exists and only applies what's needed
-- Safe to run multiple times (idempotent)
-- Date: January 8, 2026
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🚀 Starting Free Tier Migration...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: franchise_crm_configs (PROBABLY ALREADY EXISTS - SKIP IF SO)
-- ============================================================================

DO $$
BEGIN
  -- Check if columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'franchise_crm_configs' 
    AND column_name = 'google_places_api_key'
  ) THEN
    RAISE NOTICE '✅ Adding franchise_crm_configs columns...';
    
    ALTER TABLE franchise_crm_configs
    ADD COLUMN google_places_api_key TEXT,
    ADD COLUMN founding_member_enabled BOOLEAN DEFAULT true,
    ADD COLUMN founding_member_total_spots INTEGER DEFAULT 150,
    ADD COLUMN founding_member_trial_days INTEGER DEFAULT 90,
    ADD COLUMN founding_member_discount_percent INTEGER DEFAULT 20 
      CHECK (founding_member_discount_percent >= 0 AND founding_member_discount_percent <= 100);
    
    -- Set Bournemouth defaults
    UPDATE franchise_crm_configs
    SET 
      founding_member_enabled = true,
      founding_member_total_spots = 150,
      founding_member_trial_days = 90,
      founding_member_discount_percent = 20
    WHERE city = 'bournemouth';
    
  ELSE
    RAISE NOTICE '⏭️  franchise_crm_configs columns already exist, skipping...';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Add new columns to business_profiles
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Adding business_profiles columns...';
END $$;

-- Owner/Claimer tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Visibility control
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'ai_enabled';

-- Founding member tracking
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member BOOLEAN DEFAULT false;

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS founding_member_discount INTEGER DEFAULT 0 
  CHECK (founding_member_discount >= 0 AND founding_member_discount <= 100);

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
-- PART 3: Update business_profiles status constraint
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Updating status constraint to include free tier values...';
  
  -- Drop old constraint
  ALTER TABLE business_profiles DROP CONSTRAINT IF EXISTS business_profiles_status_check;
  
  -- Add new constraint with ALL status values
  ALTER TABLE business_profiles
  ADD CONSTRAINT business_profiles_status_check 
  CHECK (status IN (
    -- EXISTING (founding member flow)
    'incomplete',       -- Filling out profile
    'pending_review',   -- Submitted for review
    'approved',         -- Live on platform ✅ (your 9 businesses!)
    
    -- NEW (free tier flow)
    'unclaimed',        -- Google import, no owner
    'pending_claim',    -- Claim submitted, awaiting admin
    'claimed_free',     -- Claimed, free tier access
    'pending_upgrade',  -- Submitted for upgrade
    
    -- FUTURE
    'pending_update',   -- Edit pending approval
    'suspended',        -- Temporarily suspended
    'removed'           -- Removed from platform
  ));
  
  RAISE NOTICE '   Added status values: unclaimed, pending_claim, claimed_free, pending_upgrade';
END $$;

-- ============================================================================
-- PART 4: Add visibility constraint
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Adding visibility constraint...';
END $$;

ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_visibility_check;

ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_visibility_check
CHECK (visibility IN ('discover_only', 'ai_enabled'));

-- ============================================================================
-- PART 5: Add indexes for performance
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Creating indexes...';
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_google_place_id 
ON business_profiles(google_place_id) 
WHERE google_place_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_business_profiles_status 
ON business_profiles(status);

CREATE INDEX IF NOT EXISTS idx_business_profiles_visibility 
ON business_profiles(visibility);

CREATE INDEX IF NOT EXISTS idx_business_profiles_owner_user_id 
ON business_profiles(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_city_status 
ON business_profiles(city, status);

CREATE INDEX IF NOT EXISTS idx_business_profiles_founding_member 
ON business_profiles(founding_member) 
WHERE founding_member = true;

CREATE INDEX IF NOT EXISTS idx_business_profiles_auto_imported 
ON business_profiles(auto_imported) 
WHERE auto_imported = true;

-- ============================================================================
-- PART 6: Backfill data for existing businesses
-- ============================================================================

DO $$
DECLARE
  v_updated_owner INTEGER;
  v_updated_claimed INTEGER;
BEGIN
  RAISE NOTICE '✅ Backfilling data for existing businesses...';
  
  -- Link owner_user_id to user_id for founding member businesses
  -- (They CREATED their profiles, they OWN them, but didn't "claim" them)
  UPDATE business_profiles
  SET owner_user_id = user_id
  WHERE owner_user_id IS NULL 
    AND user_id IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_owner = ROW_COUNT;
  RAISE NOTICE '   Linked % businesses to their owners (founding members)', v_updated_owner;
  
  -- NOTE: claimed_at stays NULL for founding members (they created profiles, not claimed them)
  -- claimed_at is ONLY for businesses that were auto-imported and then claimed by an owner
END $$;

-- ============================================================================
-- PART 7: Create claim_requests table
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'claim_requests'
  ) THEN
    RAISE NOTICE '✅ Creating claim_requests table...';
    
    CREATE TABLE claim_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      city TEXT NOT NULL REFERENCES franchise_crm_configs(city) ON DELETE CASCADE,
      business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
      verification_method TEXT CHECK (verification_method IN ('email', 'manual')),
      verification_code TEXT,
      verification_code_expires_at TIMESTAMP WITH TIME ZONE,
      verification_completed_at TIMESTAMP WITH TIME ZONE,
      business_email TEXT NOT NULL,
      business_website TEXT,
      risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
      risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
      email_domain_match BOOLEAN DEFAULT false,
      duplicate_claims_count INTEGER DEFAULT 0,
      denied_claims_count INTEGER DEFAULT 0,
      is_founding_member BOOLEAN DEFAULT false,
      founding_member_spot_number INTEGER,
      admin_notes TEXT,
      reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      reviewed_at TIMESTAMP WITH TIME ZONE,
      denial_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_active_claim UNIQUE (business_id, user_id, status)
    );
    
    -- Indexes
    CREATE INDEX idx_claim_requests_business_id ON claim_requests(business_id);
    CREATE INDEX idx_claim_requests_user_id ON claim_requests(user_id);
    CREATE INDEX idx_claim_requests_status ON claim_requests(status);
    CREATE INDEX idx_claim_requests_city ON claim_requests(city);
    CREATE INDEX idx_claim_requests_business_email ON claim_requests(business_email);
    CREATE INDEX idx_claim_requests_city_status ON claim_requests(city, status);
    
    RAISE NOTICE '   Table and indexes created';
  ELSE
    RAISE NOTICE '⏭️  claim_requests table already exists, skipping...';
  END IF;
END $$;

-- ============================================================================
-- PART 8: RLS for claim_requests
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'claim_requests'
  ) THEN
    RAISE NOTICE '✅ Setting up RLS for claim_requests...';
    
    ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own claims" ON claim_requests;
    CREATE POLICY "Users can view their own claims"
      ON claim_requests FOR SELECT
      USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can create claims" ON claim_requests;
    CREATE POLICY "Users can create claims"
      ON claim_requests FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Admins can view claims for their city" ON claim_requests;
    CREATE POLICY "Admins can view claims for their city"
      ON claim_requests FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM city_admins
          WHERE city_admins.id = auth.uid()
          AND city_admins.city = claim_requests.city
        )
      );
    
    DROP POLICY IF EXISTS "Admins can update claims for their city" ON claim_requests;
    CREATE POLICY "Admins can update claims for their city"
      ON claim_requests FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM city_admins
          WHERE city_admins.id = auth.uid()
          AND city_admins.city = claim_requests.city
        )
      );
    
    RAISE NOTICE '   4 RLS policies created';
  END IF;
END $$;

-- ============================================================================
-- PART 9: RLS for business_profiles (users can view claimed businesses)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Adding RLS for claimed businesses...';
END $$;

DROP POLICY IF EXISTS "Users can view their claimed businesses" ON business_profiles;
CREATE POLICY "Users can view their claimed businesses"
  ON business_profiles FOR SELECT
  USING (owner_user_id = auth.uid());

-- ============================================================================
-- PART 10: Triggers
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'claim_requests'
  ) THEN
    RAISE NOTICE '✅ Creating triggers...';
    
    CREATE OR REPLACE FUNCTION update_claim_requests_updated_at()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS update_claim_requests_timestamp ON claim_requests;
    CREATE TRIGGER update_claim_requests_timestamp
      BEFORE UPDATE ON claim_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_claim_requests_updated_at();
  END IF;
END $$;

-- ============================================================================
-- PART 11: Helper functions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Creating helper functions...';
END $$;

-- Check if founding member spots available
CREATE OR REPLACE FUNCTION is_founding_member_spot_available(p_city TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_total_spots INTEGER;
  v_claimed_spots INTEGER;
BEGIN
  SELECT founding_member_enabled, founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs WHERE city = p_city;
  
  IF NOT v_enabled THEN RETURN false; END IF;
  
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city AND status = 'approved' AND is_founding_member = true;
  
  RETURN v_claimed_spots < v_total_spots;
END;
$$;

-- Get founding member status
CREATE OR REPLACE FUNCTION get_founding_member_status(p_city TEXT)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_total_spots INTEGER;
  v_claimed_spots INTEGER;
BEGIN
  SELECT founding_member_enabled, founding_member_total_spots
  INTO v_enabled, v_total_spots
  FROM franchise_crm_configs WHERE city = p_city;
  
  IF NOT v_enabled THEN
    RETURN json_build_object('enabled', false, 'available', false, 'spots_remaining', 0);
  END IF;
  
  SELECT COUNT(*) INTO v_claimed_spots
  FROM claim_requests
  WHERE city = p_city AND status = 'approved' AND is_founding_member = true;
  
  RETURN json_build_object(
    'enabled', v_enabled,
    'available', v_claimed_spots < v_total_spots,
    'total_spots', v_total_spots,
    'claimed_spots', v_claimed_spots,
    'spots_remaining', v_total_spots - v_claimed_spots,
    'next_spot_number', CASE WHEN v_claimed_spots < v_total_spots THEN v_claimed_spots + 1 ELSE NULL END
  );
END;
$$;

-- Calculate claim risk score
CREATE OR REPLACE FUNCTION calculate_claim_risk_score(
  p_user_id UUID,
  p_business_id UUID,
  p_business_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
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
  
  SELECT website INTO v_business_website FROM business_profiles WHERE id = p_business_id;
  
  IF v_business_website IS NOT NULL AND v_business_website ILIKE '%' || v_email_domain || '%' THEN
    v_email_domain_match := true;
  ELSE
    v_risk_score := v_risk_score + 20;
  END IF;
  
  SELECT COUNT(*) INTO v_duplicate_claims FROM claim_requests
  WHERE user_id = p_user_id AND status = 'pending';
  v_risk_score := v_risk_score + (v_duplicate_claims * 15);
  
  SELECT COUNT(*) INTO v_denied_claims FROM claim_requests
  WHERE user_id = p_user_id AND status = 'denied';
  v_risk_score := v_risk_score + (v_denied_claims * 25);
  
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_account_age_days
  FROM auth.users WHERE id = p_user_id;
  
  IF v_account_age_days < 1 THEN v_risk_score := v_risk_score + 30;
  ELSIF v_account_age_days < 7 THEN v_risk_score := v_risk_score + 15;
  END IF;
  
  IF v_risk_score >= 70 THEN v_risk_level := 'critical';
  ELSIF v_risk_score >= 50 THEN v_risk_level := 'high';
  ELSIF v_risk_score >= 30 THEN v_risk_level := 'medium';
  ELSE v_risk_level := 'low';
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

-- Get pending claim businesses
CREATE OR REPLACE FUNCTION get_pending_claim_businesses(p_city TEXT)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  claim_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id, bp.business_name, bp.status, bp.created_at,
    COUNT(cr.id) as claim_count
  FROM business_profiles bp
  LEFT JOIN claim_requests cr ON cr.business_id = bp.id AND cr.status = 'pending'
  WHERE bp.city = p_city AND bp.status = 'pending_claim'
  GROUP BY bp.id, bp.business_name, bp.status, bp.created_at
  ORDER BY bp.created_at DESC;
END;
$$;

-- Check if business is claimable
CREATE OR REPLACE FUNCTION is_business_claimable(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
  v_owner_id UUID;
BEGIN
  SELECT status, owner_user_id INTO v_status, v_owner_id
  FROM business_profiles WHERE id = p_business_id;
  
  RETURN (v_status = 'unclaimed' AND v_owner_id IS NULL);
END;
$$;

-- ============================================================================
-- PART 10: Update search_knowledge_base function to respect visibility
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Updating search_knowledge_base function to filter by visibility...';
END $$;

-- Drop and recreate the function with visibility filter
DROP FUNCTION IF EXISTS search_knowledge_base(vector, text, float, int);

CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  target_city text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  business_name text,
  title text,
  content text,
  knowledge_type text,
  similarity float,
  business_tier text,
  tier_priority int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.business_id,
    bp.business_name,
    kb.title,
    kb.content,
    kb.knowledge_type,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity,
    bp.business_tier,
    -- Tier priority: Spotlight = 1 (highest), Featured = 2, Starter = 3, Free Trial = 4
    CASE 
      WHEN bp.business_tier = 'spotlight' THEN 1
      WHEN bp.business_tier = 'featured' THEN 2
      WHEN bp.business_tier = 'starter' THEN 3
      ELSE 4
    END AS tier_priority
  FROM knowledge_base kb
  LEFT JOIN business_profiles bp ON kb.business_id = bp.id
  WHERE 
    kb.city = target_city
    AND kb.status = 'active'
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
    -- 🔒 CRITICAL: Only include businesses with ai_enabled visibility (exclude free tier)
    AND (bp.visibility IS NULL OR bp.visibility = 'ai_enabled')
  ORDER BY 
    -- 🎯 Sort by tier FIRST, then similarity
    tier_priority ASC,  -- Spotlight businesses first!
    similarity DESC     -- Then by relevance
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION search_knowledge_base IS 'Searches knowledge base with vector similarity, prioritizing Spotlight tier businesses first. Excludes free-tier businesses (visibility=discover_only) from AI chat responses.';

DO $$
BEGIN
  RAISE NOTICE '   Function updated with visibility filter';
END $$;

-- ============================================================================
-- PART 11: Add trigger to auto-set owner_user_id for new businesses
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Creating trigger to auto-set owner_user_id for new businesses...';
END $$;

-- Create function for trigger
CREATE OR REPLACE FUNCTION auto_set_owner_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_user_id is NULL and user_id is NOT NULL (founding member onboarding)
  -- then set owner_user_id = user_id (they own their own listing)
  IF NEW.owner_user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.owner_user_id := NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_set_owner_user_id ON business_profiles;

CREATE TRIGGER trigger_auto_set_owner_user_id
  BEFORE INSERT ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_owner_user_id();

COMMENT ON FUNCTION auto_set_owner_user_id IS 'Automatically sets owner_user_id = user_id for businesses created via founding member onboarding flow (when user_id is provided at creation).';

DO $$
BEGIN
  RAISE NOTICE '   Trigger created - new businesses will auto-set owner_user_id';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Show results
SELECT 
  'business_profiles' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN visibility = 'ai_enabled' THEN 1 ELSE 0 END) as ai_enabled,
  SUM(CASE WHEN owner_user_id IS NOT NULL THEN 1 ELSE 0 END) as has_owner
FROM business_profiles
UNION ALL
SELECT 
  'claim_requests' as table_name,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
  NULL as has_owner
FROM claim_requests;

-- ============================================================================
-- SUCCESS! 🎉
-- ============================================================================
-- Your 9 businesses should all still be status='approved', visibility='ai_enabled'
-- claim_requests table created and ready
-- Free tier system is now active!
-- ============================================================================


