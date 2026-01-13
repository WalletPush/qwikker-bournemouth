-- =====================================================
-- SMS NOTIFICATIONS (Verified-by-Real-Test Approach)
-- =====================================================
-- This migration extends franchise_crm_configs to support
-- SMS notifications via Twilio, using a simple "verified"
-- flag that's only set to TRUE after a successful real test.
--
-- Key principle: Claim form SMS opt-in only appears when:
-- sms_enabled = true AND sms_verified = true
--
-- This prevents "tacky promises" and ensures delivery works.
-- =====================================================

-- 1) Extend franchise_crm_configs with SMS fields
ALTER TABLE franchise_crm_configs
  -- Core settings
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_provider text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS sms_verified boolean NOT NULL DEFAULT false,
  
  -- Regional guidance (optional, for UI help text)
  ADD COLUMN IF NOT EXISTS sms_country_code text NULL, -- ISO2: 'GB','US','CA','AU'
  ADD COLUMN IF NOT EXISTS sms_default_calling_code text NULL, -- '+44', '+1', etc
  
  -- Twilio credentials (secrets)
  ADD COLUMN IF NOT EXISTS twilio_account_sid text NULL,
  ADD COLUMN IF NOT EXISTS twilio_auth_token text NULL,
  ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid text NULL,
  ADD COLUMN IF NOT EXISTS twilio_from_number text NULL, -- Alternative to messaging service
  
  -- Testing & diagnostics
  ADD COLUMN IF NOT EXISTS sms_test_mode boolean NOT NULL DEFAULT false, -- Force simulated even if verified
  ADD COLUMN IF NOT EXISTS sms_last_error text NULL,
  ADD COLUMN IF NOT EXISTS sms_last_verified_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS sms_updated_at timestamptz NOT NULL DEFAULT now();

-- 2) Add constraint: provider must be valid
ALTER TABLE franchise_crm_configs
  ADD CONSTRAINT sms_provider_valid 
  CHECK (sms_provider IN ('none', 'twilio'));

-- 3) Create sms_logs table for auditing and debugging
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  mode text NOT NULL, -- 'simulated' | 'real'
  to_e164 text NULL, -- Phone number (E.164 format)
  message text NOT NULL, -- SMS body
  template_name text NULL, -- e.g. 'CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'TEST'
  provider_message_id text NULL, -- Twilio SID if real
  status text NOT NULL, -- 'simulated' | 'sent' | 'failed'
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Add constraints to sms_logs
ALTER TABLE sms_logs
  ADD CONSTRAINT sms_logs_mode_valid 
  CHECK (mode IN ('simulated', 'real'));

ALTER TABLE sms_logs
  ADD CONSTRAINT sms_logs_status_valid 
  CHECK (status IN ('simulated', 'sent', 'failed'));

-- 5) Add index for performance (query logs by city)
CREATE INDEX IF NOT EXISTS idx_sms_logs_city_created 
  ON sms_logs(city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_logs_created 
  ON sms_logs(created_at DESC);

-- 6) Add index for phone lookup (if needed for deduplication)
CREATE INDEX IF NOT EXISTS idx_sms_logs_to_e164 
  ON sms_logs(to_e164);

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- To revert this migration:
-- 
-- DROP INDEX IF EXISTS idx_sms_logs_to_e164;
-- DROP INDEX IF EXISTS idx_sms_logs_created;
-- DROP INDEX IF EXISTS idx_sms_logs_city_created;
-- DROP TABLE IF EXISTS sms_logs;
-- 
-- ALTER TABLE franchise_crm_configs
--   DROP CONSTRAINT IF EXISTS sms_provider_valid,
--   DROP COLUMN IF EXISTS sms_enabled,
--   DROP COLUMN IF EXISTS sms_provider,
--   DROP COLUMN IF EXISTS sms_verified,
--   DROP COLUMN IF EXISTS sms_country_code,
--   DROP COLUMN IF EXISTS sms_default_calling_code,
--   DROP COLUMN IF EXISTS twilio_account_sid,
--   DROP COLUMN IF EXISTS twilio_auth_token,
--   DROP COLUMN IF EXISTS twilio_messaging_service_sid,
--   DROP COLUMN IF EXISTS twilio_from_number,
--   DROP COLUMN IF EXISTS sms_test_mode,
--   DROP COLUMN IF EXISTS sms_last_error,
--   DROP COLUMN IF EXISTS sms_last_verified_at,
--   DROP COLUMN IF EXISTS sms_updated_at;

