-- DEBUG: Check Social Wizard Sources
-- Run this in Supabase SQL Editor to see what data is available

-- 1. Find business ID (David's grill shack)
SELECT 
  id,
  business_name,
  plan as tier,
  city
FROM business_profiles
WHERE business_name ILIKE '%david%grill%'
  OR business_name ILIKE '%grill%shack%';

-- 2. Check offers for this business
-- Replace {BUSINESS_ID} with the ID from above
SELECT 
  id,
  offer_name,
  offer_value,
  status,
  offer_end_date
FROM business_offers
WHERE business_id = '{BUSINESS_ID}'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check events
SELECT 
  id,
  event_name,
  event_description,
  status,
  event_date
FROM business_events
WHERE business_id = '{BUSINESS_ID}'
ORDER BY event_date ASC
LIMIT 10;

-- 4. Check knowledge base entries
SELECT 
  id,
  title,
  metadata,
  LEFT(content, 100) as content_preview
FROM knowledge_base
WHERE business_id = '{BUSINESS_ID}'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Look for secret menu items specifically
SELECT 
  id,
  title,
  metadata->'is_secret' as is_secret_flag,
  metadata->'secret' as secret_flag,
  metadata->'type' as type_field,
  metadata->'name' as name_field,
  metadata
FROM knowledge_base
WHERE business_id = '{BUSINESS_ID}'
  AND (
    metadata->>'is_secret' = 'true'
    OR metadata->>'secret' = 'true'
    OR metadata->>'type' ILIKE '%secret%'
    OR title ILIKE '%secret%'
  );
