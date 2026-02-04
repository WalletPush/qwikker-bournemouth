-- Check the actual knowledge_base schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'knowledge_base' 
ORDER BY ordinal_position;

-- Check what's in there for a sample business
SELECT 
  id,
  business_id,
  title,
  metadata,
  LEFT(content, 100) as content_preview,
  created_at
FROM knowledge_base
WHERE business_id = (
  SELECT id FROM business_profiles WHERE business_name ILIKE '%david%' LIMIT 1
)
LIMIT 5;
