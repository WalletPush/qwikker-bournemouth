-- DEBUG REPORT: KB Search Flow for "kids menu" query
-- =============================================================================

-- SECTION 1: Verify KB rows for David's and Ember (as proven by user)
-- =============================================================================
SELECT 
  bp.business_name,
  bp.business_tier,
  bp.status AS business_status,
  kb.knowledge_type,
  kb.status AS kb_status,
  CASE 
    WHEN kb.content ILIKE '%kids menu%' THEN 'HAS kids menu'
    WHEN kb.content ILIKE '%kids%' THEN 'HAS kids (generic)'
    ELSE 'NO kids'
  END AS kids_check,
  LENGTH(kb.content) AS content_length,
  LEFT(kb.content, 100) AS content_preview
FROM knowledge_base kb
JOIN business_profiles bp ON kb.business_id = bp.id
WHERE bp.business_name IN ('David''s grill shack', 'Ember & Oak Bistro')
  AND bp.city = 'bournemouth'
  AND kb.status = 'active'
ORDER BY bp.business_name, kb.knowledge_type;

-- SECTION 2: Check if David's and Ember are in business_profiles_chat_eligible
-- =============================================================================
SELECT 
  business_name,
  effective_tier,
  tier_priority,
  rating,
  'IN TIER 1 VIEW' AS verdict
FROM business_profiles_chat_eligible
WHERE business_name IN ('David''s grill shack', 'Ember & Oak Bistro')
  AND city = 'bournemouth';

-- SECTION 3: Simulate what search_knowledge_base WOULD return for "kids menu"
-- (We can't actually run the RPC without an embedding, so we simulate the logic)
-- =============================================================================
SELECT 
  kb.id AS kb_id,
  kb.business_id,
  bce.business_name,
  kb.title AS kb_title,
  kb.knowledge_type,
  kb.status AS kb_status,
  bce.effective_tier,
  bce.tier_priority,
  CASE 
    WHEN kb.content ILIKE '%kids menu%' THEN '✅ MATCH'
    ELSE '❌ NO MATCH'
  END AS keyword_match
FROM knowledge_base kb
INNER JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id
WHERE kb.city = 'bournemouth'
  AND kb.status = 'active'
  AND kb.content ILIKE '%kids%'
ORDER BY bce.tier_priority ASC, kb.knowledge_type;

-- SECTION 4: Check if Triangle GYROSS is in any tier
-- =============================================================================
SELECT 'Triangle GYROSS in chat_eligible' AS check_name, COUNT(*) AS count
FROM business_profiles_chat_eligible
WHERE business_name ILIKE '%triangle%gyross%' AND city = 'bournemouth'
UNION ALL
SELECT 'Triangle GYROSS in lite_eligible', COUNT(*)
FROM business_profiles_lite_eligible
WHERE business_name ILIKE '%triangle%gyross%' AND city = 'bournemouth'
UNION ALL
SELECT 'Triangle GYROSS in fallback_pool', COUNT(*)
FROM business_profiles_ai_fallback_pool
WHERE business_name ILIKE '%triangle%gyross%' AND city = 'bournemouth';
