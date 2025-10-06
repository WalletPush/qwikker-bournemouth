-- Migration: Fix completion percentage for universal business types
-- Description: Updates completion calculation to check structured hours and make menu optional
-- Date: 2025-09-20 33:00:00 UTC

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_profile_completion_percentage();

-- Create updated function with universal business type support
CREATE OR REPLACE FUNCTION calculate_profile_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
  provided_count INTEGER := 0;
  missing_count INTEGER := 0;
  total_count INTEGER;
  completion_percent INTEGER;
BEGIN
  -- Count provided core fields (from onboarding)
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

  -- Count REQUIRED completion fields for all business types
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
  
  -- Check both old and new business hours format
  IF (NEW.business_hours IS NOT NULL AND NEW.business_hours != '') OR 
     (NEW.business_hours_structured IS NOT NULL) THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.logo IS NOT NULL AND NEW.logo != '' THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  IF NEW.business_images IS NOT NULL AND array_length(NEW.business_images, 1) > 0 THEN
    provided_count := provided_count + 1;
  ELSE
    missing_count := missing_count + 1;
  END IF;
  
  -- OPTIONAL fields (don't count against completion for universal business types)
  -- These help with attractiveness but aren't required for gyms, salons, etc.
  IF NEW.menu_url IS NOT NULL AND NEW.menu_url != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.offer_name IS NOT NULL AND NEW.offer_name != '' THEN
    provided_count := provided_count + 1;
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_business_profiles_update_calculate_completion ON public.business_profiles;

CREATE TRIGGER on_business_profiles_update_calculate_completion
  BEFORE INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion_percentage();

-- Update existing records to recalculate completion percentages
UPDATE public.business_profiles 
SET profile_completion_percentage = 0 
WHERE profile_completion_percentage IS NULL;

-- Force recalculation for all existing records
UPDATE public.business_profiles 
SET updated_at = NOW();
