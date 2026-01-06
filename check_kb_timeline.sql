-- Check when offers were added to KB vs when they were created
SELECT 
  'Knowledge Base Offers' as source,
  kb.title,
  kb.created_at as kb_created,
  bp.business_name
FROM knowledge_base kb
JOIN business_profiles bp ON kb.business_id = bp.id
WHERE kb.content ILIKE '%offer%'
ORDER BY kb.created_at DESC

UNION ALL

SELECT 
  'Approved Offers (business_offers table)',
  bo.offer_name,
  bo.approved_at,
  bp.business_name
FROM business_offers bo
JOIN business_profiles bp ON bo.business_id = bp.id
WHERE bo.status = 'approved'
ORDER BY bo.approved_at DESC;
