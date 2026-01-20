-- Migration: KB Eligibility-Gated Search (Prevent Expired Trials/Free Tier Leakage)
-- Purpose: Update search_knowledge_base RPC to ONLY return KB entries for chat-eligible businesses
-- Date: 2026-01-20
-- CRITICAL: This is the final piece - prevents expired deals from showing via KB retrieval

-- ============================================================================
-- Drop existing function
-- ============================================================================

DROP FUNCTION IF EXISTS search_knowledge_base(vector, text, float, int);

-- ============================================================================
-- Create eligibility-gated search function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(1536),
  target_city text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  business_name text,
  title text,
  content text,
  knowledge_type text,
  similarity float,
  business_tier text,
  tier_priority int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.business_id,
    bce.business_name,
    kb.title,
    kb.content,
    kb.knowledge_type,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity,
    bce.effective_tier AS business_tier,  -- ✅ Use effective_tier from subscription-based view
    bce.tier_priority                     -- ✅ Use computed tier_priority
  FROM knowledge_base kb
  -- ============================================================================
  -- CRITICAL FIX: INNER JOIN with business_profiles_chat_eligible
  -- This ensures we ONLY return KB entries for businesses that are:
  -- - Approved + Subscribed (paid active OR trial active)
  -- - NOT expired trials, NOT unclaimed, NOT auto-imported, NOT free tier
  -- ============================================================================
  INNER JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id
  WHERE 
    kb.city = target_city
    AND kb.status = 'active'
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  
  UNION ALL
  
  -- ============================================================================
  -- Also include general city knowledge (business_id IS NULL)
  -- These are NOT business-specific (events, news, etc.)
  -- ============================================================================
  SELECT 
    kb.id,
    kb.business_id,
    NULL::text AS business_name,  -- No business for general knowledge
    kb.title,
    kb.content,
    kb.knowledge_type,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity,
    'general'::text AS business_tier,  -- Special tier for general knowledge
    999 AS tier_priority               -- Show after all businesses
  FROM knowledge_base kb
  WHERE 
    kb.city = target_city
    AND kb.status = 'active'
    AND kb.business_id IS NULL  -- General city knowledge only
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  
  ORDER BY 
    -- 🎯 CRITICAL: Sort by tier FIRST, then similarity
    tier_priority ASC,  -- Spotlight (1) → Featured/Trial (2) → Starter (3) → General (999)
    similarity DESC     -- Then by relevance within tier
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION search_knowledge_base IS 
  'ELIGIBILITY-GATED knowledge base search with vector similarity. ' ||
  'INNER JOINs business_profiles_chat_eligible to ensure ONLY KB entries for eligible businesses are returned. ' ||
  'Excludes: expired trials, unclaimed, auto-imported, free tier, unapproved businesses. ' ||
  'Also includes general city knowledge (business_id IS NULL). ' ||
  'Sorts by tier priority (spotlight→featured/trial→starter→general) then similarity. ' ||
  'This prevents expired deals and ineligible business info from appearing in AI chat.';

-- ============================================================================
-- Verification queries (run these to check the fix works)
-- ============================================================================

-- Test 1: Search should NOT return results for expired trial businesses
-- Generate a test embedding (you'll need to use actual embedding in real test)
-- SELECT * FROM search_knowledge_base(
--   '[0.1, 0.2, ... 1536 dims]'::vector,
--   'bournemouth',
--   0.5,
--   10
-- ) WHERE business_name IN ('Julie''s Sports Pub', 'Venezy Burgers');
-- Expected: 0 rows if those businesses have expired trials

-- Test 2: Count KB entries that would be excluded by eligibility
-- SELECT COUNT(*) AS excluded_kb_entries
-- FROM knowledge_base kb
-- LEFT JOIN business_profiles_chat_eligible bce ON kb.business_id = bce.id
-- WHERE kb.city = 'bournemouth'
--   AND kb.status = 'active'
--   AND kb.business_id IS NOT NULL  -- Only business-specific KB
--   AND bce.id IS NULL;  -- Business NOT in eligible view
-- Expected: > 0 (some KB entries are now excluded)

-- Test 3: Show which businesses have KB but are excluded
-- SELECT 
--   bp.business_name,
--   bp.status,
--   bp.auto_imported,
--   COUNT(kb.id) AS kb_entries_count,
--   CASE
--     WHEN bp.status IN ('unclaimed', 'pending_claim') THEN 'UNCLAIMED'
--     WHEN bp.status = 'claimed_free' THEN 'CLAIMED_FREE'
--     WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'NOT_CHAT_ELIGIBLE'
--     ELSE 'OTHER'
--   END AS exclusion_reason
-- FROM knowledge_base kb
-- JOIN business_profiles bp ON bp.id = kb.business_id
-- LEFT JOIN business_profiles_chat_eligible bce ON bce.id = bp.id
-- WHERE kb.city = 'bournemouth'
--   AND kb.status = 'active'
--   AND bce.id IS NULL  -- Not eligible
-- GROUP BY bp.business_name, bp.status, bp.auto_imported, bp.id
-- ORDER BY exclusion_reason, kb_entries_count DESC;

-- ============================================================================
-- OPTIONAL: Cleanup stale KB entries (DESTRUCTIVE - use with caution!)
-- ============================================================================

-- WARNING: This will permanently delete KB entries for ineligible businesses
-- Only run if you want to clean up the KB table to save space

-- DELETE FROM knowledge_base kb
-- WHERE kb.business_id IS NOT NULL
--   AND kb.business_id NOT IN (SELECT id FROM business_profiles_chat_eligible);

-- Instead, consider archiving them:
-- UPDATE knowledge_base kb
-- SET status = 'archived'
-- WHERE kb.business_id IS NOT NULL
--   AND kb.business_id NOT IN (SELECT id FROM business_profiles_chat_eligible);
