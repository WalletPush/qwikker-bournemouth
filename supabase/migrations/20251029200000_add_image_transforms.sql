-- Add business_image_transforms column to store image positioning data
-- This allows businesses to customize how their images are displayed in business cards

-- Add the new column
ALTER TABLE business_profiles 
ADD COLUMN business_image_transforms JSONB DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN business_profiles.business_image_transforms IS 'Array of image transform objects with x, y, and scale properties for positioning business images in cards';

-- Create an index for better performance when querying transforms
CREATE INDEX IF NOT EXISTS idx_business_profiles_image_transforms 
ON business_profiles USING GIN (business_image_transforms);
