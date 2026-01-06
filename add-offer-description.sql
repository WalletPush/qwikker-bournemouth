-- Add offer_description column to business_offers and business_profiles
-- Run this in Supabase SQL Editor

-- Add to business_offers table
ALTER TABLE public.business_offers 
ADD COLUMN IF NOT EXISTS offer_description text;

-- Add to business_profiles for backward compatibility
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS offer_description text;

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_offers' 
  AND column_name IN ('offer_description', 'offer_terms')
ORDER BY column_name;


