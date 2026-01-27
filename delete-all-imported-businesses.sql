-- Delete all auto-imported test businesses
-- This is safe - only removes businesses imported via the import tool
-- Does NOT delete manually created businesses

-- First, check what will be deleted
SELECT 
  business_name,
  display_category,
  city,
  status,
  created_at
FROM business_profiles
WHERE auto_imported = true
ORDER BY city, business_name;

-- Uncomment the line below to actually delete them
-- DELETE FROM business_profiles WHERE auto_imported = true;

-- After deletion, verify they're gone
-- SELECT COUNT(*) as remaining_imported FROM business_profiles WHERE auto_imported = true;
