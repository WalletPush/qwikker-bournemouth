-- Add features column to business_profiles for granular feature control
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "social_wizard": false,
  "loyalty_cards": false,
  "analytics": false,
  "push_notifications": false
}'::jsonb;

-- NOTE: Trial data is managed in business_subscriptions table, NOT in business_profiles
-- Do NOT add trial columns here

-- Update existing Spotlight users to have all features enabled
UPDATE business_profiles
SET features = '{
  "social_wizard": true,
  "loyalty_cards": true,
  "analytics": true,
  "push_notifications": true
}'::jsonb
WHERE plan = 'spotlight';

-- Add index for faster feature lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_features ON business_profiles USING gin(features);

-- Add comment
COMMENT ON COLUMN business_profiles.features IS 'Granular feature access control - allows admin to lock/unlock specific features regardless of tier';

