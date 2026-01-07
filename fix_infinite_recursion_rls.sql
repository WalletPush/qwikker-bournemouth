-- FIX: Infinite recursion in city_admins RLS policy
-- The policy was querying city_admins while checking access to city_admins!

-- Drop the broken policy
DROP POLICY IF EXISTS "Admins can view own city records" ON public.city_admins;

-- Create fixed policy (simpler, no recursion)
CREATE POLICY "Admins can view own record" ON public.city_admins
  FOR SELECT
  USING (id = auth.uid());

-- Verify: This should return 0 errors now
SELECT * FROM business_subscriptions LIMIT 1;

