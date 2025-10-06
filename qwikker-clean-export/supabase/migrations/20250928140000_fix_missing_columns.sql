-- Fix missing columns in business_profiles table
-- These are referenced in the code but don't exist in the database

-- Add slug column (used for URL-friendly business identifiers)
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create slugs for existing businesses based on business_name
UPDATE business_profiles 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL AND business_name IS NOT NULL;

-- Add approved_at column to business_changes table (referenced in code)
ALTER TABLE business_changes 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Create index on slug for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug ON business_profiles(slug);

-- Create index on business_town for franchise queries
CREATE INDEX IF NOT EXISTS idx_business_profiles_business_town ON business_profiles(business_town);

-- Update business_changes with approved_at for existing approved changes
UPDATE business_changes 
SET approved_at = updated_at 
WHERE status = 'approved' AND approved_at IS NULL;

