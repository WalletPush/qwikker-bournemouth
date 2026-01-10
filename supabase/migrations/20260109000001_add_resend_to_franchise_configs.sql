-- Add Resend email configuration to franchise CRM configs
-- Each franchise admin adds their own Resend API key and verified sender email

ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS resend_from_email TEXT,
ADD COLUMN IF NOT EXISTS resend_from_name TEXT DEFAULT 'QWIKKER';

-- Add comments
COMMENT ON COLUMN franchise_crm_configs.resend_api_key IS 'Resend API key for sending verification emails (added by franchise admin)';
COMMENT ON COLUMN franchise_crm_configs.resend_from_email IS 'Verified sender email in Resend (e.g., noreply@yourdomain.com)';
COMMENT ON COLUMN franchise_crm_configs.resend_from_name IS 'Display name for emails (e.g., "QWIKKER Bournemouth")';

-- Update Bournemouth with placeholder (admin needs to add real key)
UPDATE franchise_crm_configs
SET 
  resend_from_email = 'noreply@qwikker.com',
  resend_from_name = 'QWIKKER Bournemouth'
WHERE city = 'bournemouth';

-- Verify
SELECT 
  city,
  resend_api_key IS NOT NULL as has_resend_key,
  resend_from_email,
  resend_from_name
FROM franchise_crm_configs;

