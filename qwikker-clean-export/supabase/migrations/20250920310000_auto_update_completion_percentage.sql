-- Migration: Auto-update profile completion percentage
-- Description: Creates a trigger to automatically calculate and update profile_completion_percentage 
-- whenever any profile field is updated
-- Date: 2025-09-20 31:00:00 UTC

-- Create function to calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  provided_count INTEGER := 0;
  missing_count INTEGER := 0;
  total_count INTEGER;
  completion_percent INTEGER;
BEGIN
  -- Count provided fields (core business info from onboarding)
  IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_type IS NOT NULL AND NEW.business_type != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_category IS NOT NULL AND NEW.business_category != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_address IS NOT NULL AND NEW.business_address != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    provided_count := provided_count + 1;
  END IF;

  -- Count completion fields
  IF NEW.business_tagline IS NOT NULL AND NEW.business_tagline != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.business_description IS NOT NULL AND NEW.business_description != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.business_hours IS NOT NULL AND NEW.business_hours != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.logo IS NOT NULL AND NEW.logo != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.menu_url IS NOT NULL AND NEW.menu_url != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.business_images IS NOT NULL AND array_length(NEW.business_images, 1) > 0 THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.offer_name IS NOT NULL AND NEW.offer_name != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;

  -- Calculate total and percentage
  total_count := provided_count + missing_count;
  
  IF total_count > 0 THEN
    completion_percent := ROUND((provided_count::DECIMAL / total_count::DECIMAL) * 100);
  ELSE
    completion_percent := 0;
  END IF;

  -- Update the completion percentage
  NEW.profile_completion_percentage := completion_percent;
  
  -- Auto-update status based on completion
  IF completion_percent >= 80 AND NEW.status = 'incomplete' THEN
    NEW.status := 'pending_review';
  ELSIF completion_percent < 80 AND NEW.status = 'pending_review' THEN
    NEW.status := 'incomplete';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on business_profiles table
DROP TRIGGER IF EXISTS trigger_update_completion_percentage ON public.business_profiles;
CREATE TRIGGER trigger_update_completion_percentage
  BEFORE INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion();

-- Also create trigger on profiles table (in case it's still being used)
DROP TRIGGER IF EXISTS trigger_update_completion_percentage_profiles ON public.profiles;
CREATE TRIGGER trigger_update_completion_percentage_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion();

-- Update existing records to have correct completion percentages
UPDATE public.business_profiles 
SET updated_at = updated_at; -- This will trigger the function to recalculate

-- Add helpful comment
COMMENT ON FUNCTION calculate_profile_completion() IS 'Automatically calculates and updates profile_completion_percentage based on provided vs missing fields. Also auto-updates status when completion reaches 80%.';
