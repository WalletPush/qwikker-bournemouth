-- Clean up duplicate knowledge base entries more effectively
-- This handles different types of entries (business_info, menu, offers) for the same business

-- First, let's see what we're dealing with
SELECT 
  business_id,
  city,
  metadata->>'type' as entry_type,
  title,
  COUNT(*) as duplicate_count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM knowledge_base 
WHERE business_id IS NOT NULL
GROUP BY business_id, city, metadata->>'type', title
HAVING COUNT(*) > 1
ORDER BY business_id, entry_type;

-- Remove duplicates, keeping the most recent entry for each business_id + entry_type combination
WITH ranked_entries AS (
  SELECT 
    id,
    business_id,
    city,
    metadata->>'type' as entry_type,
    title,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY business_id, city, metadata->>'type'
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

-- Verify cleanup - this should show no duplicates
SELECT 
  business_id,
  city,
  metadata->>'type' as entry_type,
  COUNT(*) as entry_count
FROM knowledge_base 
WHERE business_id IS NOT NULL
GROUP BY business_id, city, metadata->>'type'
HAVING COUNT(*) > 1
ORDER BY business_id, entry_type;
