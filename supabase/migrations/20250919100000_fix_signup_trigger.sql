-- Migration: Fix signup trigger for account creation
-- Description: Fixes the handle_new_user function to work with current table structure
-- Date: 2025-09-19 10:00:00 UTC

-- Drop and recreate the handle_new_user function with correct column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log the trigger execution for debugging
  RAISE LOG 'handle_new_user trigger called for user_id: %, email: %', NEW.id, NEW.email;
  
  -- Insert basic profile with only the columns that definitely exist
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name,
    plan,
    is_founder
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'starter',
    (CURRENT_DATE < '2025-12-31'::date)
  );
  
  RAISE LOG 'Profile created successfully for user_id: %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a basic profile when a new user signs up - fixed for current table structure';
