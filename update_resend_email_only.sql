-- Safely update ONLY the resend_from_email for testing
-- This won't touch any other fields (Slack, GHL, etc)

UPDATE franchise_crm_configs
SET resend_from_email = 'onboarding@resend.dev'
WHERE city = 'bournemouth';

-- Verify (see what changed)
SELECT 
  city,
  resend_from_email,
  resend_from_name,
  resend_api_key IS NOT NULL as has_resend_key,
  slack_webhook_url IS NOT NULL as has_slack,
  ghl_webhook_url IS NOT NULL as has_ghl
FROM franchise_crm_configs
WHERE city = 'bournemouth';

