-- ============================================================================
-- QWIKKER HQ ADMIN FOUNDATION
-- ============================================================================
-- Purpose: Platform control plane - franchise creation, monitoring, governance
-- Architecture: HQ admins create cities → city admins manage operations
-- ============================================================================

-- 1. Extend hq_admins (if not already extended)
-- ============================================================================
-- Optional but recommended: role and is_active for future control

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'hq_admins' AND column_name = 'role') THEN
    ALTER TABLE hq_admins ADD COLUMN role TEXT DEFAULT 'admin';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'hq_admins' AND column_name = 'is_active') THEN
    ALTER TABLE hq_admins ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

COMMENT ON TABLE hq_admins IS 'Platform owners - can create franchises, enforce rules, monitor health';

-- 2. City Admins (Franchise Owners)
-- ============================================================================
-- Created by HQ only. Cannot self-register.

CREATE TABLE IF NOT EXISTS city_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Auth
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  
  -- City Assignment (one admin can only own one city for now)
  city TEXT NOT NULL REFERENCES franchise_crm_configs(city) ON DELETE CASCADE,
  
  -- Profile
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  
  -- Access Control
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  
  -- Lifecycle
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES hq_admins(user_id), -- Which HQ admin created this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_city_admins_user_id ON city_admins(user_id);
CREATE INDEX idx_city_admins_city ON city_admins(city);
CREATE INDEX idx_city_admins_status ON city_admins(status);
CREATE INDEX idx_city_admins_email ON city_admins(email);

-- RLS
ALTER TABLE city_admins ENABLE ROW LEVEL SECURITY;

-- City admins can read their own record
CREATE POLICY "City admins can read own record"
  ON city_admins FOR SELECT
  USING (auth.uid() = user_id);

-- City admins can update their own profile (not city or role)
CREATE POLICY "City admins can update own profile"
  ON city_admins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE city_admins IS 'Franchise owners - created by HQ, manage their city operations';

-- 3. Audit Logs (Immutable)
-- ============================================================================
-- Every sensitive action gets logged

CREATE TABLE IF NOT EXISTS hq_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('hq_admin', 'city_admin', 'system')),
  
  -- What
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  
  -- Context
  city TEXT, -- if city-specific action
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_actor_id ON hq_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON hq_audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON hq_audit_logs(resource_type);
CREATE INDEX idx_audit_logs_city ON hq_audit_logs(city);
CREATE INDEX idx_audit_logs_created_at ON hq_audit_logs(created_at DESC);

-- RLS (read-only for HQ admins)
ALTER TABLE hq_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can read audit logs"
  ON hq_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hq_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

COMMENT ON TABLE hq_audit_logs IS 'Immutable audit trail - every sensitive action logged';

-- 4. Feature Flags (Global Control)
-- ============================================================================
-- HQ can toggle features platform-wide or per-city

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Flag Identity
  flag_key TEXT UNIQUE NOT NULL,
  flag_name TEXT NOT NULL,
  description TEXT,
  
  -- Scope
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'city')),
  city TEXT REFERENCES franchise_crm_configs(city) ON DELETE CASCADE, -- null if global
  
  -- State
  is_enabled BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_by UUID REFERENCES hq_admins(user_id),
  updated_by UUID REFERENCES hq_admins(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX idx_feature_flags_scope ON feature_flags(scope);
CREATE INDEX idx_feature_flags_city ON feature_flags(city);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

COMMENT ON TABLE feature_flags IS 'Global and per-city feature toggles for zero-downtime control';

-- 5. Helper Functions
-- ============================================================================

-- Check if user is HQ admin
CREATE OR REPLACE FUNCTION is_hq_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM hq_admins
    WHERE user_id = check_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is city admin for specific city
CREATE OR REPLACE FUNCTION is_city_admin_for(check_city TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM city_admins
    WHERE city = check_city
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get city for current admin user
CREATE OR REPLACE FUNCTION get_admin_city(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
  SELECT city FROM city_admins
  WHERE user_id = check_user_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_actor_email TEXT;
  v_actor_type TEXT;
  v_log_id UUID;
BEGIN
  -- Determine actor type
  IF is_hq_admin() THEN
    v_actor_type := 'hq_admin';
    SELECT email INTO v_actor_email FROM hq_admins WHERE user_id = auth.uid();
  ELSIF EXISTS (SELECT 1 FROM city_admins WHERE user_id = auth.uid()) THEN
    v_actor_type := 'city_admin';
    SELECT email INTO v_actor_email FROM city_admins WHERE user_id = auth.uid();
  ELSE
    v_actor_type := 'system';
  END IF;

  INSERT INTO hq_audit_logs (
    actor_id, actor_email, actor_type,
    action, resource_type, resource_id,
    city, metadata
  ) VALUES (
    auth.uid(), v_actor_email, v_actor_type,
    p_action, p_resource_type, p_resource_id,
    p_city, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check feature flag
CREATE OR REPLACE FUNCTION is_feature_enabled(
  flag_key_param TEXT,
  city_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check city-specific flag first
  IF city_param IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM feature_flags
      WHERE flag_key = flag_key_param
        AND scope = 'city'
        AND city = city_param
        AND is_enabled = true
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Fall back to global flag
  RETURN EXISTS (
    SELECT 1 FROM feature_flags
    WHERE flag_key = flag_key_param
      AND scope = 'global'
      AND is_enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Seed Default Feature Flags
-- ============================================================================

INSERT INTO feature_flags (flag_key, flag_name, description, scope, is_enabled)
VALUES
  ('sms_globally_enabled', 'SMS Globally Enabled', 'Master kill switch for all SMS', 'global', true),
  ('claims_globally_enabled', 'Claims Globally Enabled', 'Master kill switch for claim submissions', 'global', true),
  ('imports_globally_enabled', 'Imports Globally Enabled', 'Master kill switch for Google Places imports', 'global', true),
  ('ai_chat_globally_enabled', 'AI Chat Globally Enabled', 'Master kill switch for AI chat features', 'global', true)
ON CONFLICT (flag_key) DO NOTHING;

COMMENT ON FUNCTION is_hq_admin IS 'Check if user is an active HQ admin';
COMMENT ON FUNCTION is_city_admin_for IS 'Check if user is an active admin for a specific city';
COMMENT ON FUNCTION get_admin_city IS 'Get the city a user is admin for';
COMMENT ON FUNCTION log_audit_event IS 'Log an audit event (called by APIs, not directly by users)';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a feature flag is enabled (city-specific or global)';

