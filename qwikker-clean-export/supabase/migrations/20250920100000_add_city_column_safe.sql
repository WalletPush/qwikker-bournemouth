-- Migration: Add city column for franchise support (backward compatible)
-- Description: Safely adds city column with default value, won't affect existing functionality
-- Date: 2025-09-20 10:00:00 UTC

-- Add city column with default value (all existing data gets 'bournemouth')
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'bournemouth' NOT NULL;

-- Update any existing records that might not have city set
UPDATE public.profiles 
SET city = 'bournemouth' 
WHERE city IS NULL OR city = '';

-- Add index for better query performance when filtering by city
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);

-- Add helpful comment
COMMENT ON COLUMN public.profiles.city IS 'Franchise city for multi-location support (bournemouth, calgary, london, etc.)';

-- Update the approved_businesses view to include city
DROP VIEW IF EXISTS public.approved_businesses;
CREATE OR REPLACE VIEW public.approved_businesses AS
SELECT 
  id,
  user_id,
  city,
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
  status,
  created_at
FROM public.profiles
WHERE status = 'approved'
ORDER BY 
  city,
  CASE business_tier
    WHEN 'qwikker_picks' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'recommended' THEN 3
    ELSE 4
  END,
  rating DESC,
  created_at DESC;

-- Grant access to updated view
GRANT SELECT ON public.approved_businesses TO authenticated;

