-- Migration: Simple fix for completion calculation
-- Description: Updates completion calculation to recognize business_hours_structured
-- Date: 2025-09-26 16:00:01 UTC

-- Update the trigger function to properly handle structured hours
CREATE OR REPLACE FUNCTION calculate_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  provided_count INTEGER := 0;
  total_required INTEGER := 8; -- Total required fields
  completion_percent INTEGER;
BEGIN
  -- Count provided REQUIRED fields only
  
  -- 1. Business name
  IF NEW.business_name IS NOT NULL AND NEW.business_name != '' THEN
    provided_count := provided_count + 1;
  END IF;
  
  -- 2. Business hours (check both formats)
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
  completion_percent := ROUND((provided_count::DECIMAL / total_required::DECIMAL) * 100);

  -- Update the completion percentage
  NEW.profile_completion_percentage := completion_percent;
  
  -- DON'T override manual status updates - only auto-promote when naturally complete
  -- This allows submitBusinessForReview to work properly
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
