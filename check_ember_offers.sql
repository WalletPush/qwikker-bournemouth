-- Check Ember & Oak's offers and their status
SELECT 
  bp.business_name,
  bo.offer_name,
  bo.offer_value,
  bo.status,
  bo.created_at,
  bo.approved_at
FROM business_offers bo
JOIN business_profiles bp ON bo.business_id = bp.id
WHERE bp.business_name ILIKE '%ember%oak%'
ORDER BY bo.created_at DESC;
