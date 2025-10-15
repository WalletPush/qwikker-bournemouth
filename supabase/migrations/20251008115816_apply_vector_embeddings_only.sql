-- Migration: Apply Vector Embeddings Only
-- Description: Safely adds pgvector extension and embedding column to existing knowledge_base table
-- Date: 2025-10-08 11:58:16 UTC

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to existing knowledge_base table (safe if already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE public.knowledge_base 
        ADD COLUMN embedding vector(1536);
    END IF;
END $$;

-- Add vector similarity index to knowledge_base (safe if already exists)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding 
ON public.knowledge_base USING HNSW (embedding vector_cosine_ops) 
WHERE embedding IS NOT NULL;

-- Create function for vector similarity search on knowledge_base (replace if exists)
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
  knowledge_type text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.business_id,
    COALESCE(bp.business_name, 'General Knowledge') as business_name,
    kb.knowledge_type,
    kb.title,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM public.knowledge_base kb
  LEFT JOIN public.business_profiles bp ON kb.business_id = bp.id
  WHERE kb.city = target_city
    AND kb.status = 'active'
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add helpful comments
COMMENT ON COLUMN public.knowledge_base.embedding IS 'OpenAI ada-002 vector embedding (1536 dimensions) for AI similarity search';
COMMENT ON FUNCTION search_knowledge_base IS 'Search knowledge base using vector similarity for AI chat responses';
