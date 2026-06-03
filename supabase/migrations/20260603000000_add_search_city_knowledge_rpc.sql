-- Migration: Dedicated city-knowledge vector search RPC
-- Date: 2026-06-03
-- Purpose: City-level knowledge (knowledge_base rows where business_id IS NULL —
--   e.g. admin-uploaded festival/event PDFs) was unreachable by the AI concierge.
--
-- Root cause: the live vector `search_knowledge_base(query_embedding, target_city, ...)`
--   INNER JOINs business_profiles_chat_eligible, so it can ONLY return rows with a
--   matching (eligible) business_id. Rows with business_id IS NULL never match.
--   That shared function is also consumed by the business-recommendation path, so
--   adding a city branch there would let city rows occupy slots that the business
--   path then discards (post-filtered to business_id != null) — shrinking business
--   KB context in every city.
--
-- Fix: a SEPARATE, isolated function used ONLY for city knowledge. It reads strictly
--   `business_id IS NULL` rows, so it cannot affect or leak business/eligibility-gated
--   data, and it leaves `search_knowledge_base` byte-for-byte unchanged.
--
-- Consumed by: lib/ai/embeddings.ts -> searchCityKnowledge()

CREATE OR REPLACE FUNCTION public.search_city_knowledge(
  query_embedding vector,
  target_city text,
  match_threshold double precision DEFAULT 0.4,
  match_count integer DEFAULT 6
)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  title text,
  content text,
  knowledge_type text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    kb.id,
    kb.business_id,
    kb.title,
    kb.content,
    kb.knowledge_type,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity
  FROM public.knowledge_base kb
  WHERE kb.city = target_city
    AND kb.business_id IS NULL          -- city-level only; never touches business data
    AND kb.status = 'active'
    AND kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$function$;

COMMENT ON FUNCTION public.search_city_knowledge IS
  'Vector similarity search over CITY-LEVEL knowledge only (knowledge_base.business_id IS NULL). '
  'Isolated from search_knowledge_base so it cannot affect business recommendations or leak '
  'eligibility-gated business data. Used by the AI concierge for local/city facts (festivals, '
  'events, transport, areas, admin-uploaded PDFs).';
