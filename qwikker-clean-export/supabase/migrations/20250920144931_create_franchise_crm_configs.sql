-- Create franchise CRM configurations table
CREATE TABLE IF NOT EXISTS franchise_crm_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  
  -- GHL Integration
  ghl_webhook_url TEXT NOT NULL,
  ghl_update_webhook_url TEXT,
  
  -- Slack Integration  
  slack_webhook_url TEXT,
  slack_channel VARCHAR(100),
  
  -- Franchise Owner Details
  owner_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(100) NOT NULL,
  owner_phone VARCHAR(20),
  
  -- System Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Bournemouth (your existing configuration)
INSERT INTO franchise_crm_configs (
  city,
  display_name,
  subdomain,
  ghl_webhook_url,
  slack_webhook_url,
  owner_name,
  owner_email,
  timezone,
  status
) VALUES (
  'bournemouth',
  'Bournemouth',
  'bournemouth',
  'https://services.leadconnectorhq.com/hooks/IkBldqzvQG4XkoSxkCq8/webhook-trigger/582275ed-27fe-4374-808b-9f8403f820e3',
  'https://hooks.slack.com/services/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',
  'Qwikker Bournemouth',
  'bournemouth@qwikker.com',
  'Europe/London',
  'active'
);

-- Add some example franchise configurations (these would be real when franchises sign up)
INSERT INTO franchise_crm_configs (
  city,
  display_name,
  subdomain,
  ghl_webhook_url,
  owner_name,
  owner_email,
  timezone,
  status
) VALUES 
(
  'calgary',
  'Calgary',
  'calgary',
  'PLACEHOLDER_CALGARY_WEBHOOK_URL',
  'Calgary Franchise Owner',
  'calgary@qwikker.com',
  'America/Edmonton',
  'pending_setup'
),
(
  'london',
  'London',
  'london',
  'PLACEHOLDER_LONDON_WEBHOOK_URL',
  'London Franchise Owner',
  'london@qwikker.com',
  'Europe/London',
  'pending_setup'
);

-- Create RLS policies
ALTER TABLE franchise_crm_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write franchise configs (admin-only)
CREATE POLICY "franchise_crm_configs_admin_only" ON franchise_crm_configs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_franchise_crm_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_franchise_crm_configs_updated_at
  BEFORE UPDATE ON franchise_crm_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_franchise_crm_configs_updated_at();
