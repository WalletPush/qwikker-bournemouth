-- =====================================================
-- CREATE business_user_roles TABLE
-- Multi-user business access (owners, managers, staff)
-- Date: 2026-02-04
-- Purpose: Future-proof access control for Social Wizard and other features
-- =====================================================

-- Create the business_user_roles table
CREATE TABLE IF NOT EXISTS business_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  -- Ensure one user can only have one role per business
  UNIQUE(business_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_user_roles_business_id 
  ON business_user_roles(business_id);

CREATE INDEX IF NOT EXISTS idx_business_user_roles_user_id 
  ON business_user_roles(user_id);

-- Enable RLS
ALTER TABLE business_user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own roles
CREATE POLICY "users_can_see_own_roles"
ON business_user_roles
FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Business owners can manage roles
CREATE POLICY "owners_can_manage_roles"
ON business_user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_user_roles bur
    WHERE bur.business_id = business_user_roles.business_id
      AND bur.user_id = auth.uid()
      AND bur.role = 'owner'
  )
);

-- Add comments
COMMENT ON TABLE business_user_roles IS 'Multi-user access control for businesses. Supports owner, manager, and staff roles.';
COMMENT ON COLUMN business_user_roles.role IS 'User role: owner (full access), manager (most features), staff (limited access)';

-- =====================================================
-- BACKFILL: Create owner entries for existing businesses
-- =====================================================

DO $$
DECLARE
  inserted_count INT;
BEGIN
  -- Insert owner roles for all businesses that have a user_id
  INSERT INTO business_user_roles (business_id, user_id, role)
  SELECT 
    id as business_id,
    user_id,
    'owner' as role
  FROM business_profiles
  WHERE user_id IS NOT NULL
  ON CONFLICT (business_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RAISE NOTICE 'Backfilled % owner roles from business_profiles', inserted_count;
END $$;

-- =====================================================
-- TRIGGER: Auto-create owner role for new businesses
-- =====================================================

CREATE OR REPLACE FUNCTION create_business_owner_role()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new business is created with a user_id, create owner role
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO business_user_roles (business_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_business_owner_role
AFTER INSERT ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION create_business_owner_role();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'business_user_roles table created successfully';
  RAISE NOTICE 'Existing businesses backfilled with owner roles';
  RAISE NOTICE 'Trigger installed for new businesses';
END $$;
