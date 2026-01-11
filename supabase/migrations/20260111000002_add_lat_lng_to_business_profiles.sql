-- Add latitude and longitude to business_profiles for distance calculations and maps
-- This is simpler than using a separate business_locations table

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create an index for location-based queries (e.g., finding nearby businesses)
CREATE INDEX IF NOT EXISTS idx_business_profiles_location 
ON business_profiles (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a comment explaining these columns
COMMENT ON COLUMN business_profiles.latitude IS 'Latitude coordinate from Google Places API (for distance calculations and maps)';
COMMENT ON COLUMN business_profiles.longitude IS 'Longitude coordinate from Google Places API (for distance calculations and maps)';

