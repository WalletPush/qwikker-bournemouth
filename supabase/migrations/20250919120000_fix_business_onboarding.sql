-- Migration: Fix business onboarding by disabling trigger for admin-created users
-- Description: Prevents the trigger from interfering with business onboarding profile creation
-- Date: 2025-09-19 12:00:00 UTC

-- Update the trigger function to NOT create a profile if it's being created by the admin client
-- The business onboarding uses admin.createUser() and then manually inserts the full profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'handle_new_user trigger called for user_id: %, email: %', NEW.id, NEW.email;
  
  -- Check if this user was created via admin API (has user_metadata indicating business signup)
  -- If so, skip the trigger as the profile will be created manually with full business data
  IF NEW.raw_user_meta_data ? 'first_name' AND NEW.raw_user_meta_data ? 'last_name' THEN
    RAISE LOG 'Skipping profile creation for admin-created user (business onboarding): %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Only create minimal profile for regular auth signups (not business onboarding)
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  
  RAISE LOG 'Minimal profile created for regular signup: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profiles for regular signups, but skips business onboarding users (they create profiles manually with full data)';
