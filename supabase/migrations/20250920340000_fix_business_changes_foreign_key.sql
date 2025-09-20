-- Migration: Fix business_changes foreign key to reference business_profiles
-- Description: Update foreign key constraint to reference the correct table name
-- Date: 2025-09-20 34:00:00 UTC

-- Drop the existing foreign key constraint
ALTER TABLE public.business_changes 
DROP CONSTRAINT IF EXISTS business_changes_business_id_fkey;

-- Add the correct foreign key constraint to business_profiles
ALTER TABLE public.business_changes 
ADD CONSTRAINT business_changes_business_id_fkey 
FOREIGN KEY (business_id) REFERENCES public.business_profiles(id) ON DELETE CASCADE;

-- Update RLS policies to reference the correct table
DROP POLICY IF EXISTS "Users can view their own business changes" ON public.business_changes;
DROP POLICY IF EXISTS "Users can insert their own business changes" ON public.business_changes;

-- Recreate policies with correct table reference
CREATE POLICY "Users can view their own business changes" ON public.business_changes
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own business changes" ON public.business_changes
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

-- Update comment
COMMENT ON TABLE public.business_changes IS 'Tracks all business changes that require admin approval - references business_profiles table';
