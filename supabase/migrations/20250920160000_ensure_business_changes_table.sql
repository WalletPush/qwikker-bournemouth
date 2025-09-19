-- Migration: Ensure business_changes table exists
-- Description: Creates the business_changes table if it doesn't exist (failsafe migration)
-- Date: 2025-09-20 16:00:00 UTC

-- Create business_changes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.business_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('offer', 'secret_menu', 'business_images', 'business_info', 'menu_url')),
  change_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.city_admins(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance (IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS idx_business_changes_business_id ON public.business_changes(business_id);
CREATE INDEX IF NOT EXISTS idx_business_changes_status ON public.business_changes(status);
CREATE INDEX IF NOT EXISTS idx_business_changes_change_type ON public.business_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_business_changes_submitted_at ON public.business_changes(submitted_at DESC);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_business_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_business_changes_updated_at ON public.business_changes;
CREATE TRIGGER update_business_changes_updated_at
  BEFORE UPDATE ON public.business_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_business_changes_updated_at();

-- Enable RLS
ALTER TABLE public.business_changes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own business changes" ON public.business_changes;
DROP POLICY IF EXISTS "Users can insert their own business changes" ON public.business_changes;
DROP POLICY IF EXISTS "Admins can update business changes" ON public.business_changes;

-- RLS Policies
-- Businesses can only see their own changes
CREATE POLICY "Users can view their own business changes" ON public.business_changes
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Businesses can only insert their own changes
CREATE POLICY "Users can insert their own business changes" ON public.business_changes
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Only admins can update changes (approve/reject)
CREATE POLICY "Admins can update business changes" ON public.business_changes
  FOR UPDATE USING (
    -- This will be handled by server-side admin authentication
    true
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.business_changes TO authenticated;
GRANT ALL ON public.business_changes TO service_role;

-- Add comments
COMMENT ON TABLE public.business_changes IS 'Tracks all business changes that require admin approval';
COMMENT ON COLUMN public.business_changes.change_type IS 'Type of change: offer, secret_menu, business_images, business_info, menu_url';
COMMENT ON COLUMN public.business_changes.change_data IS 'JSON data containing the proposed changes';
COMMENT ON COLUMN public.business_changes.status IS 'Current status: pending, approved, rejected';
COMMENT ON COLUMN public.business_changes.reviewed_by IS 'Admin who reviewed the change';
COMMENT ON COLUMN public.business_changes.admin_notes IS 'Optional notes from admin about the decision';
