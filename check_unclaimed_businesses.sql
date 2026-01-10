-- Check how many unclaimed businesses exist
SELECT 
  COUNT(*) as total_unclaimed,
  COUNT(CASE WHEN auto_imported = true THEN 1 END) as auto_imported,
  COUNT(CASE WHEN auto_imported IS NULL OR auto_imported = false THEN 1 END) as manually_created
FROM business_profiles
WHERE status = 'unclaimed';

-- List all unclaimed businesses
SELECT 
  business_name,
  business_category,
  business_town,
  status,
  visibility,
  auto_imported,
  created_at
FROM business_profiles
WHERE status = 'unclaimed'
ORDER BY created_at DESC;

-- Also check pending claims (these are businesses that have been claimed but not yet approved)
SELECT 
  COUNT(*) as total_pending_claims
FROM business_profiles
WHERE status = 'pending_claim';

SELECT 
  business_name,
  business_category,
  status,
  owner_user_id,
  claimed_at
FROM business_profiles
WHERE status = 'pending_claim'
ORDER BY claimed_at DESC;
