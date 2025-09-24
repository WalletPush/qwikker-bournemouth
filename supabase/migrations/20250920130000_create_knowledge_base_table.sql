-- Migration: Create knowledge_base table for AI chat context
-- Description: Stores scraped content, PDFs, events, and custom knowledge linked to businesses or general city info
-- Date: 2025-09-20 13:00:00 UTC

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL, -- City this knowledge belongs to (bournemouth, calgary, etc.)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_city ON public.knowledge_base(city);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_business_id ON public.knowledge_base(business_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_knowledge_type ON public.knowledge_base(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON public.knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON public.knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON public.knowledge_base USING GIN (tags);

-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_search ON public.knowledge_base USING GIN (to_tsvector('english', title || ' ' || content));

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

-- RLS Policies
-- Authenticated users can view knowledge for their city
CREATE POLICY "Users can view knowledge for their city" ON public.knowledge_base
  FOR SELECT USING (
    city = (
      SELECT city FROM public.business_profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );

-- Only admins can insert/update/delete knowledge
CREATE POLICY "Admins can manage knowledge base" ON public.knowledge_base
  FOR ALL USING (
    -- This will be handled by server-side admin authentication
    true
  );

-- Grant permissions
GRANT SELECT ON public.knowledge_base TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;

-- Add comments
COMMENT ON TABLE public.knowledge_base IS 'AI knowledge base for business and city information';
COMMENT ON COLUMN public.knowledge_base.city IS 'City this knowledge belongs to (bournemouth, calgary, etc.)';
COMMENT ON COLUMN public.knowledge_base.business_id IS 'Business this knowledge is linked to, NULL for general city knowledge';
COMMENT ON COLUMN public.knowledge_base.knowledge_type IS 'Type of knowledge: web_scrape, pdf_document, event, news_article, custom_knowledge';
COMMENT ON COLUMN public.knowledge_base.content IS 'Extracted/processed text content for AI consumption';
COMMENT ON COLUMN public.knowledge_base.metadata IS 'Additional structured data (event dates, categories, etc.)';
COMMENT ON COLUMN public.knowledge_base.tags IS 'Searchable tags for categorization and filtering';
