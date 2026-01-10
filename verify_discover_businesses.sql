-- Verify businesses are in database with correct status for Discover page

SELECT 
  business_name,
  status,
  visibility,
  auto_imported,
  business_town,
  business_category,
  business_type,
  CASE 
    WHEN status IN ('approved', 'unclaimed', 'claimed_free') THEN '✅ SHOULD SHOW'
    ELSE '❌ HIDDEN'
  END as discover_visibility
FROM business_profiles
WHERE city = 'bournemouth'
ORDER BY 
  CASE status
    WHEN 'unclaimed' THEN 1
    WHEN 'claimed_free' THEN 2
    WHEN 'approved' THEN 3
    ELSE 4
  END,
  created_at DESC;

