-- =====================================================
-- QWIKKER SOCIAL WIZARD v1 MIGRATION
-- CREATION + EXPORT ONLY (NO PUBLISHING)
-- Date: 2026-02-04
-- =====================================================

-- IMPORTANT: This migration requires business_user_roles table
-- Run 20260204000000_create_business_user_roles.sql FIRST if not already run

-- Verify business_user_roles exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_user_roles'
  ) THEN
    RAISE EXCEPTION 'business_user_roles table does not exist. Run 20260204000000_create_business_user_roles.sql first.';
  END IF;
END $$;

-- Create social_posts table (drafts only, no publishing)
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  campaign_id uuid NULL, -- For grouping campaign packs (no separate campaigns table needed in v1)
  caption text NOT NULL,
  hashtags text[] DEFAULT '{}',
  media_url text NULL, -- Optional: stored composed image URL (Cloudinary)
  template_id text NULL, -- offer_card | event_card | menu_spotlight | general
  prompt_context jsonb DEFAULT '{}', -- {tone, goal, hook_tags, source_ids, model, timestamp}
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_social_posts_business_created 
  ON social_posts(business_id, created_at DESC);

CREATE INDEX idx_social_posts_campaign 
  ON social_posts(campaign_id) 
  WHERE campaign_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Use business_user_roles for multi-user access
-- This allows owners, managers, and staff to access posts based on their business membership
CREATE POLICY "business_members_can_access_social_posts"
ON social_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_user_roles
    WHERE business_id = social_posts.business_id
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_user_roles
    WHERE business_id = social_posts.business_id
      AND user_id = auth.uid()
  )
);

-- Table comments for documentation
COMMENT ON TABLE social_posts IS 'Social Wizard v1: Draft posts only (no publishing/scheduling). Users generate AI content, compose images, and export manually.';
COMMENT ON COLUMN social_posts.campaign_id IS 'Groups posts into campaign packs (Spotlight feature). No separate campaigns table needed in v1.';
COMMENT ON COLUMN social_posts.media_url IS 'Optional: URL of composed image if stored in Cloudinary. Primarily used for draft preview.';
COMMENT ON COLUMN social_posts.template_id IS 'Visual template used: offer_card | event_card | menu_spotlight | general';
COMMENT ON COLUMN social_posts.prompt_context IS 'AI generation context for traceability: tone, goal, hook_tags, source_ids, model used, timestamp';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Social Wizard v1 migration complete. social_posts table created with RLS using business_user_roles.';
END $$;
