-- Fix AI-generated taglines for imported businesses
-- Replace with simple "Category • Location" format using google_primary_type
-- Example: "Night club • Bournemouth" instead of "Relaxed vibes and great pours"

UPDATE business_profiles
SET business_tagline = CONCAT(
  -- Format google_primary_type: "night_club" -> "Night club"
  INITCAP(REPLACE(google_primary_type, '_', ' ')),
  ' • ', 
  business_town
),
tagline_source = 'generated'
WHERE 
  auto_imported = true 
  AND status = 'unclaimed'
  AND google_primary_type IS NOT NULL
  AND business_town IS NOT NULL;

-- Show updated records
SELECT 
  business_name,
  display_category,
  business_town,
  business_tagline,
  google_primary_type
FROM business_profiles
WHERE 
  auto_imported = true 
  AND status = 'unclaimed'
ORDER BY business_name
LIMIT 20;
