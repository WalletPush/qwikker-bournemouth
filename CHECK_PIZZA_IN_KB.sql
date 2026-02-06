-- Check if David's or Ember & Oak have pizza in their KB content
-- DETAILED SEARCH: Show full content where pizza exists
SELECT 
  b.business_name,
  kb.title,
  kb.knowledge_type,
  CASE 
    WHEN kb.content ILIKE '%pizza%' OR kb.content ILIKE '%margherita%' THEN '✅ HAS PIZZA'
    ELSE '❌ NO PIZZA'
  END as has_pizza,
  -- Show FULL content if pizza found, otherwise just preview
  CASE 
    WHEN kb.content ILIKE '%pizza%' OR kb.content ILIKE '%margherita%' THEN kb.content
    ELSE LEFT(kb.content, 300)
  END as content
FROM business_profiles b
JOIN knowledge_base kb ON kb.business_id = b.id
WHERE 
  b.business_name IN ('David''s grill shack', 'Ember & Oak Bistro')
  AND kb.status = 'active'
ORDER BY 
  has_pizza DESC, -- Show pizza entries first
  b.business_name, 
  kb.title;
