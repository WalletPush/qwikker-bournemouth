-- Check if Ember & Oak's offers are in the knowledge base
SELECT 
  kb.title,
  kb.content,
  kb.created_at,
  bp.business_name
FROM knowledge_base kb
JOIN business_profiles bp ON kb.business_id = bp.id
WHERE bp.business_name ILIKE '%ember%oak%'
  AND kb.content ILIKE '%offer%'
ORDER BY kb.created_at DESC;
