-- City Admins Table
-- Stores franchise admin users (one or more per city)
-- HQ creates these users, they cannot self-register

CREATE TABLE IF NOT EXISTS city_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  
  -- Which city/franchise this admin belongs to
  city TEXT NOT NULL REFERENCES franchise_crm_configs(city) ON DELETE CASCADE,
  
  -- Auth integration (links to Supabase Auth)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Admin metadata
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id), -- HQ admin who created this
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_city_admins_city ON city_admins(city);
CREATE INDEX idx_city_admins_email ON city_admins(email);
CREATE INDEX idx_city_admins_user_id ON city_admins(user_id);
CREATE INDEX idx_city_admins_status ON city_admins(status);

-- RLS Policies
ALTER TABLE city_admins ENABLE ROW LEVEL SECURITY;

-- City admins can read their own record
CREATE POLICY "City admins can read own record"
  ON city_admins
  FOR SELECT
  USING (auth.uid() = user_id);

-- City admins can update their own profile (not city or role)
CREATE POLICY "City admins can update own profile"
  ON city_admins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- HQ admins can do everything (we'll refine this when we build HQ admin table)
-- For now, service_role has full access

-- Function: Check if user is admin for a specific city
CREATE OR REPLACE FUNCTION is_city_admin_for(check_city TEXT, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM city_admins
    WHERE city = check_city
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get city for current admin user
CREATE OR REPLACE FUNCTION get_admin_city(check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
  SELECT city FROM city_admins
  WHERE user_id = check_user_id
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON TABLE city_admins IS 'Franchise admin users - created by HQ only, not self-registration';
COMMENT ON FUNCTION is_city_admin_for IS 'Check if a user is an active admin for a specific city';
COMMENT ON FUNCTION get_admin_city IS 'Get the city a user is admin for (returns first if multiple)';

