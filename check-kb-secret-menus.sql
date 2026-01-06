-- Check what secret menu items are actually in the knowledge base
SELECT 
  title,
  LEFT(content, 150) as content_preview,
  metadata->>'item_name' as item_name,
  metadata->>'item_price' as price
FROM knowledge_base
WHERE metadata->>'type' = 'secret_menu'
ORDER BY created_at DESC;
