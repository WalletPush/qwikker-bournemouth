-- Temporarily use Resend test email for local testing
-- You can switch back to hello@bournemouth.qwikker.com once you verify the domain

UPDATE franchise_crm_configs
SET resend_from_email = 'onboarding@resend.dev'
WHERE city = 'bournemouth';

-- Verify the change
SELECT 
  resend_from_email as email_now,
  'onboarding@resend.dev' as test_email,
  'hello@bournemouth.qwikker.com' as production_email
FROM franchise_crm_configs
WHERE city = 'bournemouth';

-- NOTE: When you verify bournemouth.qwikker.com in Resend, change it back:
-- UPDATE franchise_crm_configs 
-- SET resend_from_email = 'hello@bournemouth.qwikker.com' 
-- WHERE city = 'bournemouth';

