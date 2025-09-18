-- Migration: Add status field and business completion fields
-- Description: Adds status field for admin approval workflow and business completion tracking
-- Date: 2025-09-18 00:00:00 UTC

-- Add status field for admin approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'incomplete' 
CHECK (status IN ('incomplete', 'pending_review', 'approved', 'rejected'));

-- Add business hours field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_hours TEXT;

-- Add business tier field for user dashboard hierarchy
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_tier TEXT DEFAULT 'recommended'
CHECK (business_tier IN ('qwikker_picks', 'featured', 'recommended'));

-- Add business description fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_tagline TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_description TEXT;

-- Add business images array
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_images TEXT[];

-- Add menu preview items for quick display on user dashboard
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS menu_preview TEXT[];

-- Add rating and review fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add admin approval tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add profile completion percentage tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_business_tier ON public.profiles(business_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_at ON public.profiles(approved_at);

-- Add column comments for clarity
COMMENT ON COLUMN public.profiles.status IS 'Business approval status: incomplete (default), pending_review, approved, rejected';
COMMENT ON COLUMN public.profiles.business_hours IS 'Business opening hours (e.g., "Mon-Fri 9AM-5PM, Sat-Sun 10AM-4PM")';
COMMENT ON COLUMN public.profiles.business_tier IS 'Display tier on user dashboard for hierarchy';
COMMENT ON COLUMN public.profiles.business_tagline IS 'Short business tagline for cards (max 50 chars)';
COMMENT ON COLUMN public.profiles.business_description IS 'Full business description for detail pages';
COMMENT ON COLUMN public.profiles.business_images IS 'Array of business photo URLs from Cloudinary';
COMMENT ON COLUMN public.profiles.menu_preview IS 'Array of menu items for quick preview on cards';
COMMENT ON COLUMN public.profiles.rating IS 'Business rating from 0.0 to 5.0';
COMMENT ON COLUMN public.profiles.review_count IS 'Total number of reviews';
COMMENT ON COLUMN public.profiles.admin_notes IS 'Admin comments during approval process';
COMMENT ON COLUMN public.profiles.approved_by IS 'Admin user who approved this business';
COMMENT ON COLUMN public.profiles.approved_at IS 'Timestamp when business was approved';
COMMENT ON COLUMN public.profiles.profile_completion_percentage IS 'Percentage of required fields completed (0-100)';

-- Update existing profiles to have 'approved' status if they have business_name
-- This ensures existing businesses don't disappear from user dashboard
UPDATE public.profiles 
SET status = 'approved' 
WHERE business_name IS NOT NULL AND business_name != '';

-- Add helpful view for admin dashboard
CREATE OR REPLACE VIEW public.businesses_pending_review AS
SELECT 
  id,
  user_id,
  business_name,
  business_type,
  business_town,
  business_address,
  logo,
  offer_name,
  status,
  profile_completion_percentage,
  created_at,
  updated_at
FROM public.profiles
WHERE status = 'pending_review'
ORDER BY created_at ASC;

-- Add helpful view for user dashboard (approved businesses only)
CREATE OR REPLACE VIEW public.approved_businesses AS
SELECT 
  id,
  business_name,
  business_type,
  business_category,
  business_town,
  business_address,
  business_postcode,
  business_hours,
  business_tagline,
  business_description,
  business_images,
  business_tier,
  logo,
  website_url,
  instagram_handle,
  facebook_url,
  menu_preview,
  offer_name,
  offer_type,
  offer_value,
  offer_image,
  offer_terms,
  offer_start_date,
  offer_end_date,
  rating,
  review_count,
  created_at
FROM public.profiles
WHERE status = 'approved'
ORDER BY 
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'recommended' THEN 3
    ELSE 4
  END,
  rating DESC,
  created_at DESC;

-- Grant access to views
GRANT SELECT ON public.businesses_pending_review TO authenticated;
GRANT SELECT ON public.approved_businesses TO authenticated;
