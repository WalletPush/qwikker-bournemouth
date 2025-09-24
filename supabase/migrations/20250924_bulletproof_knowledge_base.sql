-- Migration: Bulletproof Multi-City Knowledge Base
-- Description: Ensures perfect city isolation for knowledge base
-- Date: 2025-09-24

-- First, drop existing knowledge_base table and policies to start fresh
DROP TABLE IF EXISTS public.knowledge_base CASCADE;

-- Create bulletproof knowledge_base table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (city IN ('bournemouth', 'calgary', 'london', 'paris')),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE, -- NULL for general city knowledge
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('web_scrape', 'pdf_document', 'event', 'news_article', 'custom_knowledge')),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Extracted/processed text content
  source_url TEXT, -- Original URL for web scrapes
  file_url TEXT, -- File URL for PDFs or images
  metadata JSONB, -- Additional structured data (dates, categories, etc.)
  tags TEXT[], -- Searchable tags for categorization
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  created_by UUID REFERENCES public.city_admins(id), -- Admin who added this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CRITICAL: Ensure business belongs to same city as knowledge
  CONSTRAINT knowledge_city_business_match CHECK (
    business_id IS NULL OR 
    city = (SELECT city FROM public.business_profiles WHERE id = business_id)
  )
);

-- Add indexes for better performance
CREATE INDEX idx_knowledge_base_city ON public.knowledge_base(city);
CREATE INDEX idx_knowledge_base_business_id ON public.knowledge_base(business_id);
CREATE INDEX idx_knowledge_base_knowledge_type ON public.knowledge_base(knowledge_type);
CREATE INDEX idx_knowledge_base_status ON public.knowledge_base(status);
CREATE INDEX idx_knowledge_base_created_at ON public.knowledge_base(created_at DESC);
CREATE INDEX idx_knowledge_base_tags ON public.knowledge_base USING GIN (tags);

-- Full-text search index on content (city-scoped)
CREATE INDEX idx_knowledge_base_content_search ON public.knowledge_base USING GIN (to_tsvector('english', title || ' ' || content));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- BULLETPROOF RLS POLICIES

-- 1. REGULAR USERS: Can only see knowledge for their city
CREATE POLICY "Users can only view their city knowledge" ON public.knowledge_base
  FOR SELECT 
  TO authenticated
  USING (
    city = (
      SELECT city FROM public.app_users WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- 2. ADMINS: Can only manage knowledge for their assigned city
CREATE POLICY "Admins can only manage their city knowledge" ON public.knowledge_base
  FOR ALL 
  TO authenticated
  USING (
    -- Check if user is an admin for this specific city
    EXISTS (
      SELECT 1 FROM public.city_admins 
      WHERE id = auth.uid() 
      AND city = knowledge_base.city 
      AND is_active = true
    )
  );

-- 3. SERVICE ROLE: Full access (for server-side operations)
CREATE POLICY "Service role full access" ON public.knowledge_base
  FOR ALL 
  TO service_role
  USING (true);

-- Grant permissions
GRANT SELECT ON public.knowledge_base TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.knowledge_base IS 'Multi-city AI knowledge base with bulletproof city isolation';
COMMENT ON COLUMN public.knowledge_base.city IS 'City this knowledge belongs to - MUST match business city if business_id provided';
COMMENT ON COLUMN public.knowledge_base.business_id IS 'Business this knowledge is linked to, NULL for general city knowledge';
COMMENT ON CONSTRAINT knowledge_city_business_match ON public.knowledge_base IS 'Ensures knowledge city matches business city - prevents cross-city contamination';
