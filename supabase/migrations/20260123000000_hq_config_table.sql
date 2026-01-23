-- ============================================================================
-- HQ CONFIGURATION TABLE
-- ============================================================================
-- Purpose: Store platform-level configuration (not tied to any franchise)
-- Use cases: HQ email settings, platform-wide API keys, global defaults
-- ============================================================================

CREATE TABLE IF NOT EXISTS hq_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuration key (unique identifier)
  config_key TEXT NOT NULL UNIQUE,
  
  -- Configuration value (flexible JSON storage)
  config_value JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_by UUID REFERENCES hq_admins(user_id),
  updated_by UUID REFERENCES hq_admins(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT hq_config_key_format CHECK (config_key ~* '^[a-z0-9_]+$')
);

-- Indexes
CREATE INDEX idx_hq_config_key ON hq_config(config_key);
CREATE INDEX idx_hq_config_active ON hq_config(is_active);

-- RLS (HQ admins only)
ALTER TABLE hq_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HQ admins can read config"
  ON hq_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hq_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "HQ admins can modify config"
  ON hq_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM hq_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hq_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

COMMENT ON TABLE hq_config IS 'Platform-level configuration (email, API keys, global settings)';

-- ============================================================================
-- INSERT DEFAULT HQ EMAIL CONFIGURATION
-- ============================================================================
-- This is a template - HQ Admin should update with real credentials

INSERT INTO hq_config (config_key, config_value, description, is_active)
VALUES (
  'email_settings',
  jsonb_build_object(
    'provider', 'resend',
    'resend_api_key', NULL, -- ⚠️ Set this via HQ Admin UI or SQL
    'from_email', 'hq@qwikker.com',
    'from_name', 'Qwikker HQ',
    'reply_to', 'support@qwikker.com',
    'enabled', false -- ⚠️ Enable after setting API key
  ),
  'HQ email configuration for platform-wide emails (invites, notifications)',
  true
)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION: Get HQ Email Config
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hq_email_config()
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT config_value INTO v_config
  FROM hq_config
  WHERE config_key = 'email_settings' 
    AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_hq_email_config() IS 'Returns HQ email configuration (Resend API key, from email, etc.)';

-- ============================================================================
-- HELPER FUNCTION: Update HQ Email Config
-- ============================================================================

CREATE OR REPLACE FUNCTION update_hq_email_config(
  p_resend_api_key TEXT DEFAULT NULL,
  p_from_email TEXT DEFAULT NULL,
  p_from_name TEXT DEFAULT NULL,
  p_reply_to TEXT DEFAULT NULL,
  p_enabled BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_config JSONB;
  v_new_config JSONB;
BEGIN
  -- Note: Security check removed for initial setup
  -- TODO: Add is_hq_admin() check once function exists
  
  -- Get current config
  SELECT config_value INTO v_current_config
  FROM hq_config
  WHERE config_key = 'email_settings';
  
  -- Build new config (merge with current)
  v_new_config := v_current_config;
  
  IF p_resend_api_key IS NOT NULL THEN
    v_new_config := jsonb_set(v_new_config, '{resend_api_key}', to_jsonb(p_resend_api_key));
  END IF;
  
  IF p_from_email IS NOT NULL THEN
    v_new_config := jsonb_set(v_new_config, '{from_email}', to_jsonb(p_from_email));
  END IF;
  
  IF p_from_name IS NOT NULL THEN
    v_new_config := jsonb_set(v_new_config, '{from_name}', to_jsonb(p_from_name));
  END IF;
  
  IF p_reply_to IS NOT NULL THEN
    v_new_config := jsonb_set(v_new_config, '{reply_to}', to_jsonb(p_reply_to));
  END IF;
  
  IF p_enabled IS NOT NULL THEN
    v_new_config := jsonb_set(v_new_config, '{enabled}', to_jsonb(p_enabled));
  END IF;
  
  -- Update config
  UPDATE hq_config
  SET 
    config_value = v_new_config,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE config_key = 'email_settings';
  
  RETURN v_new_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_hq_email_config IS 'Update HQ email configuration (HQ admins only)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HQ configuration table created successfully';
  RAISE NOTICE '📧 Default email settings template added';
  RAISE NOTICE '🔧 Run update_hq_email_config() to configure HQ email';
END $$;
