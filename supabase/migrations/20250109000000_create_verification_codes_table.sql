-- Create verification_codes table for email/phone verification
-- This table stores temporary verification codes for various purposes

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('business_claim', 'password_reset', 'email_change')),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one active code per email per type
  UNIQUE(email, type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires ON verification_codes(expires_at);

-- RLS Policies (service role only for security)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (security-sensitive)
CREATE POLICY "Service role only" ON verification_codes
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to clean up expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW();
END;
$$;

-- Grant execute on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_verification_codes() TO service_role;

COMMENT ON TABLE verification_codes IS 'Temporary verification codes for email/phone verification in claim flow, password reset, etc.';

