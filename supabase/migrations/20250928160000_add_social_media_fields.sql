-- Add social media fields to business_profiles table if they don't exist
-- These are referenced in the profile forms and action items

-- Add website URL field
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add Instagram handle field  
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add Facebook URL field
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Create indexes for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_business_profiles_website_url ON business_profiles(website_url) WHERE website_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_profiles_instagram_handle ON business_profiles(instagram_handle) WHERE instagram_handle IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_profiles_facebook_url ON business_profiles(facebook_url) WHERE facebook_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN business_profiles.website_url IS 'Business website URL';
COMMENT ON COLUMN business_profiles.instagram_handle IS 'Instagram handle (without @)';
COMMENT ON COLUMN business_profiles.facebook_url IS 'Facebook page URL';

