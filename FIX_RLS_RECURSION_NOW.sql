-- =====================================================
-- FIX: Remove infinite recursion from business_user_roles
-- =====================================================

-- Drop the broken recursive policy
DROP POLICY IF EXISTS "owners_can_manage_roles" ON business_user_roles;

-- Keep the simple one (it's fine)
-- users_can_see_own_roles is already good - no changes needed

-- Add a simple ALL policy for users to access their own rows
CREATE POLICY "users_manage_own_roles"
ON business_user_roles
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed! Removed recursive policy. Users can now access their own roles.';
END $$;
