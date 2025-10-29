-- Clean up duplicate knowledge base entries
-- Keep only the most recent entry for each business

WITH ranked_entries AS (
  SELECT 
    id,
    business_id,
    city,
    title,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, city, title 
      ORDER BY created_at DESC
    ) as rn
  FROM knowledge_base
  WHERE business_id IS NOT NULL
)
DELETE FROM knowledge_base 
WHERE id IN (
  SELECT id 
  FROM ranked_entries 
  WHERE rn > 1
);

-- Show remaining entries after cleanup
SELECT 
  business_id,
  city,
  title,
  COUNT(*) as entry_count
FROM knowledge_base 
WHERE business_id IS NOT NULL
GROUP BY business_id, city, title
HAVING COUNT(*) > 1
ORDER BY business_id, title;
