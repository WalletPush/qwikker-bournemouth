-- Migration: Add Franchise-Paid API Service Fields
-- Purpose: Add fields for Resend, OpenAI, and Anthropic API keys that franchise owners manage
-- Date: 2025-11-17

-- Add new columns to franchise_crm_configs table for franchise-paid services
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS resend_from_email TEXT,
ADD COLUMN IF NOT EXISTS resend_from_name TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN franchise_crm_configs.resend_api_key IS 'Resend.com API key for transactional emails (paid by franchise owner)';
COMMENT ON COLUMN franchise_crm_configs.resend_from_email IS 'Email address to send from (must be verified in Resend)';
COMMENT ON COLUMN franchise_crm_configs.resend_from_name IS 'Display name for sent emails';
COMMENT ON COLUMN franchise_crm_configs.openai_api_key IS 'OpenAI API key for AI features (paid by franchise owner)';
COMMENT ON COLUMN franchise_crm_configs.anthropic_api_key IS 'Anthropic Claude API key for advanced AI features (optional, paid by franchise owner)';

-- Pre-populate Bournemouth row with placeholder values
-- NOTE: Admin should fill these in via the Setup page UI
INSERT INTO franchise_crm_configs (
  city,
  display_name,
  subdomain,
  owner_name,
  owner_email,
  resend_api_key,
  resend_from_email,
  resend_from_name,
  openai_api_key,
  anthropic_api_key,
  status,
  created_at,
  updated_at
)
VALUES (
  'bournemouth',
  'Bournemouth Qwikker',
  'bournemouth',
  'Qwikker Admin',
  'admin@bournemouth.qwikker.com',
  '', -- Will be filled via UI
  'hello@bournemouth.qwikker.com',
  'Bournemouth Qwikker',
  '', -- Will be filled via UI
  '', -- Will be filled via UI
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (city) DO UPDATE SET
  resend_from_email = EXCLUDED.resend_from_email,
  resend_from_name = EXCLUDED.resend_from_name,
  updated_at = NOW();

-- Update RLS policies if needed (these fields should be secure)
-- Note: Existing RLS policies should already restrict access to franchise admins only
