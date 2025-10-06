-- Migration: Fix the signup trigger to match actual table structure
-- Description: Corrects the handle_new_user function to only insert columns that exist
-- Date: 2025-09-19 11:00:00 UTC

-- Create a simple, working trigger function that only inserts required columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'handle_new_user trigger called for user_id: %, email: %', NEW.id, NEW.email;
  
  -- Insert only the essential columns that definitely exist and have proper defaults
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
  
  RAISE LOG 'Profile created successfully for user_id: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    -- Re-raise the exception so we can see what went wrong
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make sure permissions are correct
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a minimal profile when user signs up - only inserts essential columns with proper error handling';
