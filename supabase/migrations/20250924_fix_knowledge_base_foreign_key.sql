-- Migration: Fix knowledge_base foreign key reference
-- Description: Update foreign key to reference business_profiles instead of profiles
-- Date: 2025-09-24

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.knowledge_base 
DROP CONSTRAINT IF EXISTS knowledge_base_business_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.knowledge_base 
ADD CONSTRAINT knowledge_base_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_profiles(id) ON DELETE CASCADE;

-- Update the RLS policy to reference the correct table
DROP POLICY IF EXISTS "Users can view knowledge for their city" ON public.knowledge_base;
CREATE POLICY "Users can view knowledge for their city" ON public.knowledge_base
  FOR SELECT USING (
    city = (
      SELECT city FROM public.business_profiles WHERE user_id = auth.uid() LIMIT 1
    )
  );
