-- Check what cities are actually stored in business_profiles table
-- Shows count of businesses per city to verify franchise isolation

SELECT 
  city,
  COUNT(*) as business_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'unclaimed' THEN 1 END) as unclaimed_count,
  COUNT(CASE WHEN auto_imported = true THEN 1 END) as imported_count,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as claimed_count
FROM business_profiles
GROUP BY city
ORDER BY business_count DESC;

-- Also show sample businesses from each city
SELECT 
  city,
  business_name,
  business_town,
  status,
  auto_imported,
  created_at
FROM business_profiles
ORDER BY city, created_at DESC
LIMIT 20;
