-- =====================================================
-- FIX: Remove recursive RLS policies on business_user_roles
-- =====================================================

-- Drop the broken recursive policies
DROP POLICY IF EXISTS "users_can_see_own_roles" ON business_user_roles;
DROP POLICY IF EXISTS "owners_can_manage_roles" ON business_user_roles;

-- Create simple, non-recursive policies
-- Policy: Users can see their own roles (no recursion!)
CREATE POLICY "users_see_own_roles"
ON business_user_roles
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed business_user_roles RLS policies - no more recursion!';
END $$;
