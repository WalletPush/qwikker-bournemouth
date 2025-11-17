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

-- Update RLS policies if needed (these fields should be secure)
-- Note: Existing RLS policies should already restrict access to franchise admins only

