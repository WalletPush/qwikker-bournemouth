-- Check what's in Alexandra's Café KB content that matches "cocktails"
SELECT 
  id,
  business_id,
  knowledge_type,
  title,
  LEFT(content, 500) as content_preview,
  status,
  created_at
FROM knowledge_base
WHERE business_id IN (
  SELECT id FROM business_profiles 
  WHERE business_name ILIKE '%alexandra%' 
  AND city = 'bournemouth'
)
AND status = 'active'
ORDER BY created_at DESC;

-- Also check the business details
SELECT 
  id,
  business_name,
  system_category,
  display_category,
  business_tagline,
  google_verified_at
FROM business_profiles
WHERE business_name ILIKE '%alexandra%' 
AND city = 'bournemouth';
