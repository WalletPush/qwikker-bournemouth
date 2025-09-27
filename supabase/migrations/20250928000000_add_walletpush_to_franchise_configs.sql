-- Add WalletPush credentials to franchise configurations
-- This allows each franchise to have their own WalletPush API keys and template IDs

-- Add WalletPush columns to existing franchise_crm_configs table
ALTER TABLE franchise_crm_configs 
ADD COLUMN walletpush_api_key TEXT,
ADD COLUMN walletpush_template_id TEXT,
ADD COLUMN walletpush_endpoint_url TEXT;

-- Update Bournemouth with existing WalletPush credentials
UPDATE franchise_crm_configs 
SET 
  walletpush_api_key = 'YOUR_CURRENT_WALLETPUSH_API_KEY', -- Replace with actual key
  walletpush_template_id = 'YOUR_CURRENT_TEMPLATE_ID',    -- Replace with actual template ID
  walletpush_endpoint_url = 'https://app.walletpush.io/api/hl-endpoint/lkBldqzvQG4XkoSxkCq8'
WHERE city = 'bournemouth';

-- Update Calgary with placeholder (to be filled when franchise sets up)
UPDATE franchise_crm_configs 
SET 
  walletpush_api_key = 'PLACEHOLDER_CALGARY_WALLETPUSH_KEY',
  walletpush_template_id = 'PLACEHOLDER_CALGARY_TEMPLATE_ID', 
  walletpush_endpoint_url = 'PLACEHOLDER_CALGARY_ENDPOINT'
WHERE city = 'calgary';

-- Update London with placeholder (to be filled when franchise sets up)
UPDATE franchise_crm_configs 
SET 
  walletpush_api_key = 'PLACEHOLDER_LONDON_WALLETPUSH_KEY',
  walletpush_template_id = 'PLACEHOLDER_LONDON_TEMPLATE_ID',
  walletpush_endpoint_url = 'PLACEHOLDER_LONDON_ENDPOINT'
WHERE city = 'london';

-- Add comment explaining the new columns
COMMENT ON COLUMN franchise_crm_configs.walletpush_api_key IS 'WalletPush API key for this franchise';
COMMENT ON COLUMN franchise_crm_configs.walletpush_template_id IS 'WalletPush template ID for wallet passes';
COMMENT ON COLUMN franchise_crm_configs.walletpush_endpoint_url IS 'WalletPush HL endpoint URL for pass updates';
