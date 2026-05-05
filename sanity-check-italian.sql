-- ============================================================
-- SANITY CHECK: Italian businesses in Bournemouth
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. ALL businesses in Bournemouth with "italian" anywhere in their categories
SELECT 
  id,
  business_name,
  display_category,
  system_category,
  google_primary_type,
  city,
  status,
  latitude,
  longitude
FROM business_profiles
WHERE city = 'bournemouth'
  AND (
    LOWER(display_category) LIKE '%italian%'
    OR LOWER(system_category) LIKE '%italian%'
    OR LOWER(google_primary_type) LIKE '%italian%'
    OR LOWER(google_types::text) LIKE '%italian%'
  )
ORDER BY business_name;

-- 2. Check ALL categories for Bournemouth businesses (what categories actually exist?)
SELECT 
  business_name,
  display_category,
  system_category,
  google_primary_type
FROM business_profiles
WHERE city = 'bournemouth'
  AND status IN ('claimed', 'unclaimed')
ORDER BY business_name;

-- 3. Check if any KB content mentions "italian" for Bournemouth businesses
SELECT 
  kb.business_id,
  bp.business_name,
  bp.display_category,
  kb.title,
  LEFT(kb.content, 200) AS content_preview,
  kb.knowledge_type
FROM knowledge_base kb
JOIN business_profiles bp ON kb.business_id = bp.id
WHERE bp.city = 'bournemouth'
  AND LOWER(kb.content) LIKE '%italian%'
ORDER BY bp.business_name;

-- 4. Check what the chat-eligible view returns for Bournemouth (the EXACT data the AI sees)
SELECT 
  id,
  business_name,
  display_category,
  system_category,
  google_primary_type,
  effective_tier,
  latitude,
  longitude
FROM business_profiles_chat_eligible
WHERE city = 'bournemouth'
ORDER BY business_name;
