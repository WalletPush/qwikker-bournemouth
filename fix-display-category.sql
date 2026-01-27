-- Fix display_category for imported businesses to match google_primary_type
-- This is what shows in the hero modal's "Category" section
-- Example: "night_club" -> "Night Club" (not "Bar / Wine Bar")

UPDATE business_profiles
SET display_category = INITCAP(REPLACE(google_primary_type, '_', ' '))
WHERE 
  auto_imported = true 
  AND status = 'unclaimed'
  AND google_primary_type IS NOT NULL;

-- Verify the changes
SELECT 
  business_name,
  google_primary_type,
  display_category as new_category,
  business_tagline
FROM business_profiles
WHERE 
  auto_imported = true 
  AND status = 'unclaimed'
  AND google_primary_type IS NOT NULL
ORDER BY business_name
LIMIT 20;
