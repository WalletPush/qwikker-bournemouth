-- ==========================================
-- OPTIONAL: ADD TRIGGER TO KEEP display_category IN SYNC
-- ==========================================
-- This ensures display_category is always derived from system_category
-- unless explicitly set by an admin

-- ⚠️ Only run after:
-- 1. Phase 1 deployed
-- 2. Phase 2 deployed
-- 3. Code updated
-- 4. 003_normalize_display_categories.sql run (optional)

-- Create a function to sync display_category from system_category
CREATE OR REPLACE FUNCTION sync_display_category()
RETURNS TRIGGER AS $$
DECLARE
  default_label TEXT;
BEGIN
  -- Mapping from system_category to default display_category
  default_label := CASE NEW.system_category
    WHEN 'restaurant' THEN 'Restaurant'
    WHEN 'cafe' THEN 'Cafe / Coffee Shop'
    WHEN 'bar' THEN 'Bar / Pub'
    WHEN 'dessert' THEN 'Dessert / Ice Cream'
    WHEN 'takeaway' THEN 'Takeaway / Street Food'
    WHEN 'salon' THEN 'Salon / Spa'
    WHEN 'barber' THEN 'Hairdresser / Barber'
    WHEN 'tattoo' THEN 'Tattoo / Piercing'
    WHEN 'retail' THEN 'Retail'
    WHEN 'fitness' THEN 'Fitness / Gym'
    WHEN 'sports' THEN 'Sports / Outdoors'
    WHEN 'hotel' THEN 'Hotel / BnB'
    WHEN 'venue' THEN 'Venue / Event Space'
    WHEN 'entertainment' THEN 'Entertainment / Attractions'
    WHEN 'professional' THEN 'Professional Services'
    ELSE 'Other'
  END;

  -- Only auto-set display_category if:
  -- 1. It's NULL (new insert)
  -- 2. OR system_category changed and display_category wasn't explicitly set
  IF NEW.display_category IS NULL THEN
    NEW.display_category := default_label;
  ELSIF TG_OP = 'UPDATE' AND OLD.system_category IS DISTINCT FROM NEW.system_category THEN
    -- System category changed - update display_category unless it was manually customized
    -- (We consider it "manually customized" if it doesn't match the old default label)
    IF OLD.display_category = CASE OLD.system_category
      WHEN 'restaurant' THEN 'Restaurant'
      WHEN 'cafe' THEN 'Cafe / Coffee Shop'
      WHEN 'bar' THEN 'Bar / Pub'
      WHEN 'dessert' THEN 'Dessert / Ice Cream'
      WHEN 'takeaway' THEN 'Takeaway / Street Food'
      WHEN 'salon' THEN 'Salon / Spa'
      WHEN 'barber' THEN 'Hairdresser / Barber'
      WHEN 'tattoo' THEN 'Tattoo / Piercing'
      WHEN 'retail' THEN 'Retail'
      WHEN 'fitness' THEN 'Fitness / Gym'
      WHEN 'sports' THEN 'Sports / Outdoors'
      WHEN 'hotel' THEN 'Hotel / BnB'
      WHEN 'venue' THEN 'Venue / Event Space'
      WHEN 'entertainment' THEN 'Entertainment / Attractions'
      WHEN 'professional' THEN 'Professional Services'
      ELSE 'Other'
    END THEN
      -- It was using the default, so update it
      NEW.display_category := default_label;
    END IF;
    -- Otherwise, keep the custom display_category
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS sync_display_category_trigger ON business_profiles;

CREATE TRIGGER sync_display_category_trigger
  BEFORE INSERT OR UPDATE OF system_category
  ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_display_category();

-- Test the trigger (optional)
-- This should auto-set display_category to 'Restaurant'
-- INSERT INTO business_profiles (business_name, system_category, ...) VALUES ('Test Restaurant', 'restaurant', ...);

RAISE NOTICE '✅ Trigger created: display_category will auto-sync from system_category on INSERT/UPDATE';
RAISE NOTICE '   Admins can still manually override display_category if needed';

