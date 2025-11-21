-- Migration: Prioritize Spotlight tier businesses in AI search results
-- Issue: David's Grill Shack (Spotlight) was showing AFTER Ember & Oak when both have kids menus
-- Fix: Sort by tier priority FIRST, then by similarity score

-- Drop existing function
DROP FUNCTION IF EXISTS search_knowledge_base(vector, text, float, int);

-- Recreate with tier-based prioritization
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
    bp.business_name,
    kb.title,
    kb.content,
    kb.knowledge_type,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity,
    bp.business_tier,
    -- Tier priority: Spotlight = 1 (highest), Featured = 2, Starter = 3, Free Trial = 4
    CASE 
      WHEN bp.business_tier = 'spotlight' THEN 1
      WHEN bp.business_tier = 'featured' THEN 2
      WHEN bp.business_tier = 'starter' THEN 3
      ELSE 4
    END AS tier_priority
  FROM knowledge_base kb
  LEFT JOIN business_profiles bp ON kb.business_id = bp.id
  WHERE 
    kb.city = target_city
    AND kb.status = 'active'
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  ORDER BY 
    -- 🎯 CRITICAL FIX: Sort by tier FIRST, then similarity
    tier_priority ASC,  -- Spotlight businesses first!
    similarity DESC     -- Then by relevance
  LIMIT match_count;
END;
$$;

-- Add comment explaining the fix
COMMENT ON FUNCTION search_knowledge_base IS 'Searches knowledge base with vector similarity, prioritizing Spotlight tier businesses first, then Featured, then others. This ensures premium businesses appear first in AI responses when relevance is similar.';

