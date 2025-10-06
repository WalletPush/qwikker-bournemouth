-- Quick fix for knowledge_base table to fix approval system
-- Drop and recreate with correct foreign key

DROP TABLE IF EXISTS public.knowledge_base CASCADE;

-- Create bulletproof knowledge_base table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (city IN ('bournemouth', 'calgary', 'london', 'paris')),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('web_scrape', 'pdf_document', 'event', 'news_article', 'custom_knowledge')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  file_url TEXT,
  metadata JSONB,
  tags TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  created_by UUID REFERENCES public.city_admins(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure business belongs to same city as knowledge
  CONSTRAINT knowledge_city_business_match CHECK (
    business_id IS NULL OR 
    city = (SELECT city FROM public.business_profiles WHERE id = business_id)
  )
);

-- Add indexes
CREATE INDEX idx_knowledge_base_city ON public.knowledge_base(city);
CREATE INDEX idx_knowledge_base_business_id ON public.knowledge_base(business_id);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only view their city knowledge" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (city = (SELECT city FROM public.app_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Service role full access" ON public.knowledge_base
  FOR ALL TO service_role
  USING (true);

-- Grant permissions
GRANT SELECT ON public.knowledge_base TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;
