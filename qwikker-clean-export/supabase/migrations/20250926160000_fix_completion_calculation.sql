-- Migration: Fix profile completion calculation
-- Description: Updates the completion percentage calculation to match current requirements
-- Date: 2025-09-26 16:00:00 UTC

-- Update function to calculate completion percentage with correct required fields
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  provided_count INTEGER := 0;
  total_required INTEGER := 8; -- Total required fields
  completion_percent INTEGER;
BEGIN
  -- Count provided REQUIRED fields only
  
  -- 1. Business name (from onboarding)
  IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 2. Business hours (check both old and new format)
  IF (NEW.business_hours IS NOT NULL AND NEW.business_hours != '') 
     OR (NEW.business_hours_structured IS NOT NULL) THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 3. Business description
  IF NEW.business_description IS NOT NULL AND NEW.business_description != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 4. Business tagline
  IF NEW.business_tagline IS NOT NULL AND NEW.business_tagline != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 5. Business address
  IF NEW.business_address IS NOT NULL AND NEW.business_address != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 6. Business category
  IF NEW.business_category IS NOT NULL AND NEW.business_category != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 7. Business logo
  IF NEW.logo IS NOT NULL AND NEW.logo != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 8. Business images
  IF NEW.business_images IS NOT NULL AND array_length(NEW.business_images, 1) > 0 THEN
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
  
  -- FIXED: Auto-update status based on completion - ONLY for manual status changes
  -- Don't override manual status updates from submitBusinessForReview
  IF completion_percent >= 100 AND OLD.status = 'incomplete' AND NEW.status = 'incomplete' THEN
    NEW.status := 'pending_review';
  ELSIF completion_percent < 100 AND OLD.status = 'pending_review' AND NEW.status = 'pending_review' THEN
    NEW.status := 'incomplete';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_profile_completion ON business_profiles;
CREATE TRIGGER update_profile_completion
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_profile_completion();

COMMENT ON FUNCTION calculate_profile_completion() IS 'Calculates profile completion percentage based on 8 required fields: business_name, business_hours/business_hours_structured, business_description, business_tagline, business_address, business_category, logo, business_images';
