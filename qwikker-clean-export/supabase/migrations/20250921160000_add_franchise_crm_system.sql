-- Franchise CRM Integration System
-- Allows each franchise to use their own CRM while maintaining centralized data

-- Franchise CRM Configurations (per city)
CREATE TABLE franchise_crm_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL UNIQUE,
  franchise_owner_name TEXT,
  franchise_owner_email TEXT NOT NULL,
  franchise_owner_phone TEXT,
  
  -- CRM Integration Settings
  crm_type TEXT NOT NULL DEFAULT 'gohighlevel' CHECK (crm_type IN ('gohighlevel', 'hubspot', 'salesforce', 'pipedrive', 'other')),
  ghl_webhook_url TEXT,
  ghl_api_key TEXT,
  ghl_location_id TEXT,
  
  -- Slack Integration
  slack_webhook_url TEXT,
  slack_channel TEXT DEFAULT '#qwikker-signups',
  
  -- Other CRM Settings (JSON for flexibility)
  crm_settings JSONB DEFAULT '{}',
  
  -- Status and Control
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  
  -- Notes for setup/troubleshooting
  setup_notes TEXT,
  
  CONSTRAINT valid_crm_config CHECK (
    (crm_type = 'gohighlevel' AND ghl_webhook_url IS NOT NULL) OR
    (crm_type != 'gohighlevel' AND crm_settings IS NOT NULL)
  )
);

-- Franchise CRM Sync Logs (track all sync attempts)
CREATE TABLE franchise_crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Information
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Franchise Information
  franchise_city TEXT NOT NULL,
  franchise_owner TEXT NOT NULL,
  franchise_config_id UUID REFERENCES franchise_crm_configs(id) ON DELETE SET NULL,
  
  -- Sync Details
  sync_type TEXT DEFAULT 'business_signup' CHECK (sync_type IN ('business_signup', 'business_update', 'status_change', 'manual_sync')),
  sync_results JSONB NOT NULL, -- Array of service results
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Data Synced
  business_data JSONB,
  
  -- Success/Failure Tracking
  overall_success BOOLEAN GENERATED ALWAYS AS (
    (sync_results->0->>'status' = 'success') OR 
    (jsonb_array_length(sync_results) > 1 AND sync_results->1->>'status' = 'success')
  ) STORED,
  
  -- Error Details
  error_details TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced business profiles to track CRM sync status
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS last_crm_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS crm_sync_status TEXT DEFAULT 'pending' CHECK (crm_sync_status IN ('pending', 'synced', 'failed', 'disabled'));
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS crm_contact_id TEXT; -- Store CRM contact ID for updates

-- Create indexes for performance
CREATE INDEX idx_franchise_crm_configs_city ON franchise_crm_configs(city);
CREATE INDEX idx_franchise_crm_configs_active ON franchise_crm_configs(is_active);
CREATE INDEX idx_franchise_crm_sync_logs_city ON franchise_crm_sync_logs(franchise_city);
CREATE INDEX idx_franchise_crm_sync_logs_timestamp ON franchise_crm_sync_logs(sync_timestamp);
CREATE INDEX idx_franchise_crm_sync_logs_success ON franchise_crm_sync_logs(overall_success);
CREATE INDEX idx_business_profiles_crm_sync ON business_profiles(crm_sync_status);

-- RLS Policies
ALTER TABLE franchise_crm_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_crm_sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin can manage all franchise CRM configs
CREATE POLICY "Admins can manage franchise CRM configs" ON franchise_crm_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Franchise owners can view their own config
CREATE POLICY "Franchise owners can view their CRM config" ON franchise_crm_configs
  FOR SELECT USING (
    franchise_owner_email = (
      SELECT email FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Admin can view all sync logs
CREATE POLICY "Admins can view all CRM sync logs" ON franchise_crm_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- System can insert sync logs
CREATE POLICY "System can insert CRM sync logs" ON franchise_crm_sync_logs
  FOR INSERT WITH CHECK (true);

-- Function to get franchise CRM config for a city
CREATE OR REPLACE FUNCTION get_franchise_crm_config(p_city TEXT)
RETURNS TABLE (
  id UUID,
  city TEXT,
  franchise_owner_email TEXT,
  crm_type TEXT,
  ghl_webhook_url TEXT,
  slack_webhook_url TEXT,
  is_active BOOLEAN,
  sync_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fcc.id,
    fcc.city,
    fcc.franchise_owner_email,
    fcc.crm_type,
    fcc.ghl_webhook_url,
    fcc.slack_webhook_url,
    fcc.is_active,
    fcc.sync_enabled
  FROM franchise_crm_configs fcc
  WHERE fcc.city = p_city 
    AND fcc.is_active = true 
    AND fcc.sync_enabled = true;
END;
$$;

-- Function to update business CRM sync status
CREATE OR REPLACE FUNCTION update_business_crm_sync_status(
  p_business_id UUID,
  p_status TEXT,
  p_crm_contact_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_profiles
  SET 
    crm_sync_status = p_status,
    last_crm_sync = NOW(),
    crm_contact_id = COALESCE(p_crm_contact_id, crm_contact_id)
  WHERE id = p_business_id;
END;
$$;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_franchise_crm_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_franchise_crm_configs_updated_at
  BEFORE UPDATE ON franchise_crm_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_franchise_crm_config_updated_at();

-- Insert default Bournemouth configuration (you can update this)
INSERT INTO franchise_crm_configs (
  city,
  franchise_owner_name,
  franchise_owner_email,
  crm_type,
  ghl_webhook_url,
  setup_notes
) VALUES (
  'bournemouth',
  'Qwikker HQ',
  'admin@qwikker.com',
  'gohighlevel',
  'https://hooks.leadconnectorhq.com/hook/YOUR_BOURNEMOUTH_WEBHOOK',
  'Default configuration for Bournemouth - update with actual webhook URL'
) ON CONFLICT (city) DO NOTHING;

-- View for franchise CRM management
CREATE VIEW franchise_crm_management_view AS
SELECT 
  fcc.id,
  fcc.city,
  fcc.franchise_owner_name,
  fcc.franchise_owner_email,
  fcc.crm_type,
  fcc.is_active,
  fcc.sync_enabled,
  fcc.created_at,
  fcc.updated_at,
  
  -- Business counts for this franchise
  COALESCE(business_counts.total_businesses, 0) as total_businesses,
  COALESCE(business_counts.synced_businesses, 0) as synced_businesses,
  COALESCE(business_counts.failed_syncs, 0) as failed_syncs,
  
  -- Recent sync stats
  COALESCE(recent_syncs.successful_syncs_24h, 0) as successful_syncs_24h,
  COALESCE(recent_syncs.failed_syncs_24h, 0) as failed_syncs_24h,
  recent_syncs.last_sync_at

FROM franchise_crm_configs fcc
LEFT JOIN (
  SELECT 
    city,
    COUNT(*) as total_businesses,
    COUNT(*) FILTER (WHERE crm_sync_status = 'synced') as synced_businesses,
    COUNT(*) FILTER (WHERE crm_sync_status = 'failed') as failed_syncs
  FROM business_profiles
  GROUP BY city
) business_counts ON fcc.city = business_counts.city
LEFT JOIN (
  SELECT 
    franchise_city,
    COUNT(*) FILTER (WHERE overall_success = true AND sync_timestamp > NOW() - INTERVAL '24 hours') as successful_syncs_24h,
    COUNT(*) FILTER (WHERE overall_success = false AND sync_timestamp > NOW() - INTERVAL '24 hours') as failed_syncs_24h,
    MAX(sync_timestamp) as last_sync_at
  FROM franchise_crm_sync_logs
  GROUP BY franchise_city
) recent_syncs ON fcc.city = recent_syncs.franchise_city
ORDER BY fcc.city;
