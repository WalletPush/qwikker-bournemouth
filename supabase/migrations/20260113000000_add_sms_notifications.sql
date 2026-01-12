-- ============================================================================
-- ADD SMS NOTIFICATIONS SUPPORT
-- Using Twilio Messaging Service SID (best practice)
-- ============================================================================

-- 1) Add SMS config to franchise_crm_configs (per city)
ALTER TABLE franchise_crm_configs
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_provider TEXT DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT,
  ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid TEXT;

-- Add comments for clarity
COMMENT ON COLUMN franchise_crm_configs.sms_enabled IS 'Whether SMS notifications are enabled for this city';
COMMENT ON COLUMN franchise_crm_configs.sms_provider IS 'SMS provider (currently only twilio)';
COMMENT ON COLUMN franchise_crm_configs.twilio_account_sid IS 'Twilio Account SID (starts with AC...)';
COMMENT ON COLUMN franchise_crm_configs.twilio_auth_token IS 'Twilio Auth Token (secret, never display after save)';
COMMENT ON COLUMN franchise_crm_configs.twilio_messaging_service_sid IS 'Twilio Messaging Service SID (starts with MG...) - preferred over raw phone number';

-- 2) Add SMS opt-in to claim_requests (consent moment)
ALTER TABLE claim_requests
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT,
  ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_consent_text_version TEXT;

-- Add comments
COMMENT ON COLUMN claim_requests.sms_opt_in IS 'User opted in to SMS notifications';
COMMENT ON COLUMN claim_requests.phone_e164 IS 'Phone number in E.164 format (e.g., +447123456789)';
COMMENT ON COLUMN claim_requests.sms_opt_in_at IS 'When user gave SMS consent';
COMMENT ON COLUMN claim_requests.sms_consent_text_version IS 'Version of consent text shown (for compliance)';

-- 3) Add index for phone lookups
CREATE INDEX IF NOT EXISTS idx_claim_requests_phone ON claim_requests(phone_e164) WHERE phone_e164 IS NOT NULL;

-- 4) Sanity check query
DO $$
BEGIN
  RAISE NOTICE '✅ SMS columns added successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Verify with:';
  RAISE NOTICE 'SELECT city, sms_enabled FROM franchise_crm_configs;';
END $$;

-- ============================================================================
-- VERIFICATION QUERY (run this separately to check)
-- ============================================================================

SELECT 
  city, 
  sms_enabled,
  CASE WHEN twilio_account_sid IS NULL THEN '❌ missing' ELSE '✅ set' END AS twilio_sid,
  CASE WHEN twilio_auth_token IS NULL THEN '❌ missing' ELSE '✅ set' END AS twilio_token,
  CASE WHEN twilio_messaging_service_sid IS NULL THEN '❌ missing' ELSE '✅ set' END AS twilio_msg_service
FROM franchise_crm_configs
ORDER BY city;

