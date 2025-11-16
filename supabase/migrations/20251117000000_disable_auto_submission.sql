-- CRITICAL FIX: Disable automatic submission to pending_review
-- Businesses MUST manually click "Submit for Review" button

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_profile_completion ON business_profiles;
DROP FUNCTION IF EXISTS calculate_profile_completion();

-- Recreate function WITHOUT auto-submission logic
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  total_required INTEGER := 8;
  provided_count INTEGER := 0;
  completion_percent INTEGER;
BEGIN
  -- Count provided required fields
  IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- Business hours - accept EITHER old text format OR new structured format
  IF (NEW.business_hours IS NOT NULL AND NEW.business_hours != '') OR 
     (NEW.business_hours_structured IS NOT NULL AND NEW.business_hours_structured::TEXT != '{}') THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_description IS NOT NULL AND NEW.business_description != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_tagline IS NOT NULL AND NEW.business_tagline != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_address IS NOT NULL AND NEW.business_address != '' AND
     NEW.business_town IS NOT NULL AND NEW.business_town != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_category IS NOT NULL AND NEW.business_category != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.logo IS NOT NULL AND NEW.logo != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  IF NEW.business_images IS NOT NULL AND 
     (
       (jsonb_typeof(NEW.business_images) = 'array' AND jsonb_array_length(NEW.business_images) > 0) OR
       (jsonb_typeof(NEW.business_images) = 'string' AND NEW.business_images::TEXT != '""' AND NEW.business_images::TEXT != '')
     ) THEN
    provided_count := provided_count + 1;
  END IF;

  -- Calculate percentage
  IF total_required > 0 THEN
    completion_percent := ROUND((provided_count::DECIMAL / total_required::DECIMAL) * 100);
  ELSE
    completion_percent := 0;
  END IF;

  -- Update the completion percentage
  NEW.profile_completion_percentage := completion_percent;
  
  -- ❌ REMOVED: Auto-update status based on completion
  -- Businesses MUST manually submit via the "Submit for Review" button
  -- This ensures explicit user action before submission to admin
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER update_profile_completion
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion();

COMMENT ON FUNCTION calculate_profile_completion() IS 'Calculates profile completion percentage. Does NOT auto-submit - users must click Submit for Review button.';

-- Log this critical change
DO $$
BEGIN
  RAISE NOTICE '🚨 CRITICAL: Auto-submission to pending_review has been DISABLED';
  RAISE NOTICE '✅ Businesses must now manually click "Submit for Review" button';
  RAISE NOTICE '📋 Profile completion percentage still calculated automatically';
END $$;

