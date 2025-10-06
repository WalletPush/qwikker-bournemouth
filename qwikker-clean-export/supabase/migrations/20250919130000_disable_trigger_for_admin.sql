-- Migration: Completely disable trigger for business onboarding
-- Description: The business onboarding creates users via admin API and then manually creates profiles
-- The trigger should not interfere with this process at all
-- Date: 2025-09-19 13:00:00 UTC

-- Completely disable the trigger - business onboarding handles profile creation manually
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function as well since we're not using it for business onboarding
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add comment explaining why we removed it
COMMENT ON SCHEMA public IS 'Business onboarding creates profiles manually via admin client - no trigger needed';
