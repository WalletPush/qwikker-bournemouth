-- Add features column to business_profiles for granular feature control
-- This allows admins to unlock/lock individual features for any business regardless of tier

ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "social_wizard": false,
  "loyalty_cards": false,
  "analytics": false,
  "push_notifications": false
}'::jsonb;

-- Update existing Spotlight users to have all features enabled by default
UPDATE business_profiles
SET features = '{
  "social_wizard": true,
  "loyalty_cards": true,
  "analytics": true,
  "push_notifications": true
}'::jsonb
WHERE plan = 'spotlight';

-- Add index for faster feature lookups using GIN index for JSONB
CREATE INDEX IF NOT EXISTS idx_business_profiles_features ON business_profiles USING gin(features);

-- Add comment explaining the column
COMMENT ON COLUMN business_profiles.features IS 'Granular feature access control - allows admin to lock/unlock specific features regardless of tier. Overrides tier-based access.';

