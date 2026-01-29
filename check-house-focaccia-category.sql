-- Check House of Focaccia category data
SELECT 
  business_name,
  business_category,
  display_category,
  system_category,
  google_primary_type,
  business_type
FROM business_profiles
WHERE business_name ILIKE '%house of focaccia%'
AND city = 'bournemouth';
