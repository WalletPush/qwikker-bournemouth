-- Check if kids menu businesses are in the Knowledge Base
SELECT 
  business_name,
  content,
  LENGTH(content) as content_length
FROM 
  business_knowledge
WHERE 
  city = 'bournemouth'
  AND (
    LOWER(content) LIKE '%kids%menu%'
    OR LOWER(content) LIKE '%children%'
    OR LOWER(content) LIKE '%family%'
  )
ORDER BY 
  business_name;
