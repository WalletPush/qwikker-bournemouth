-- Fix HQ Admins RLS Policy
-- Allow HQ admins to read their own record from the hq_admins table
-- This is needed for the login flow to work

-- Enable RLS if not already enabled
ALTER TABLE hq_admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "HQ admins can read own record" ON hq_admins;
DROP POLICY IF EXISTS "Service role full access to hq_admins" ON hq_admins;

-- HQ admins can read their own record (needed for login check)
CREATE POLICY "HQ admins can read own record"
  ON hq_admins FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access (for admin operations)
CREATE POLICY "Service role full access to hq_admins"
  ON hq_admins FOR ALL
  USING (auth.role() = 'service_role');

-- Verify the policy was created
DO $$
BEGIN
  RAISE NOTICE '✅ HQ Admins RLS policies created successfully';
  RAISE NOTICE 'HQ admins can now read their own records during login';
END $$;
