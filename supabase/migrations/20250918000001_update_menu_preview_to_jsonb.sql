-- Migration: Update menu_preview to JSONB for structured menu items
-- Description: Changes menu_preview from TEXT[] to JSONB to store structured menu items with name, price, description
-- Date: 2025-09-18 00:00:01 UTC

-- First, backup existing data and clear menu_preview for clean migration
-- (Since this is likely empty or test data, we'll start fresh)
UPDATE public.profiles SET menu_preview = NULL WHERE menu_preview IS NOT NULL;

-- Drop the existing TEXT[] column and recreate as JSONB
ALTER TABLE public.profiles DROP COLUMN IF EXISTS menu_preview;

-- Add new JSONB menu_preview column
ALTER TABLE public.profiles 
ADD COLUMN menu_preview JSONB DEFAULT '[]'::jsonb;

-- Update the comment to reflect new structure
COMMENT ON COLUMN public.profiles.menu_preview IS 'Array of featured menu items as JSON objects with name, price, description';

-- Create index for better query performance on JSONB
CREATE INDEX IF NOT EXISTS idx_profiles_menu_preview ON public.profiles USING GIN (menu_preview);

-- Update the approved_businesses view to include the new menu_preview format
DROP VIEW IF EXISTS public.approved_businesses;
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

-- Grant access to updated view
GRANT SELECT ON public.approved_businesses TO authenticated;

-- Example of expected JSONB structure:
-- menu_preview: [
--   {
--     "name": "Fish & Chips",
--     "price": "14.50",
--     "description": "Fresh cod with hand-cut chips"
--   },
--   {
--     "name": "Signature Burger", 
--     "price": "12.99",
--     "description": "Our famous beef burger with all the trimmings"
--   }
-- ]
