-- Migration: Add 'featured' plan option to profiles table
-- Description: Updates the plan check constraint to include 'featured' plan
-- Date: 2025-09-16 12:00:00 UTC

-- Drop the existing check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_plan_check;

-- Add the new check constraint with 'featured' included
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_plan_check 
CHECK (plan IN ('starter', 'featured', 'spotlight', 'pro'));

-- Update the comment to reflect the change
COMMENT ON COLUMN public.profiles.plan IS 'User subscription plan: starter (basic), featured (trial default), spotlight (premium), pro (enterprise)';
