-- Migration: Add policies for businesses to view their visits
-- Description: Allow businesses to see who visited their business profile
-- Date: 2025-09-26 17:00:00 UTC

-- Add policy for businesses to view visits to their own business
CREATE POLICY "Businesses can view their own visits" ON public.user_business_visits
  FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Add policy for service role to insert visits (for tracking)
CREATE POLICY "Service role can insert business visits" ON public.user_business_visits
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS anyway, but explicit policy is clearer

-- Update the user_members select policy to allow businesses to see visitor names
-- This is needed for the business visit tracking to show visitor names
CREATE POLICY "Businesses can view visitor details" ON public.user_members
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM public.user_business_visits
      WHERE business_id IN (
        SELECT id FROM public.business_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );
