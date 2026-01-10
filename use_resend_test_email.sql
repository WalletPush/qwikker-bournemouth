-- Temporarily use Resend's test email for local development
-- No domain verification needed!

UPDATE franchise_crm_configs
SET 
  resend_from_email = 'onboarding@resend.dev',
  resend_from_name = 'QWIKKER Test'
WHERE city = 'bournemouth';

-- Verify
SELECT 
  city,
  resend_from_email,
  resend_from_name,
  resend_api_key IS NOT NULL as has_api_key
FROM franchise_crm_configs
WHERE city = 'bournemouth';

