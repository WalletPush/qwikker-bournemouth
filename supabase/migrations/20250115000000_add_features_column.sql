-- Add features column to business_profiles for granular feature control
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "social_wizard": false,
  "loyalty_cards": false,
  "analytics": false,
  "push_notifications": false
}'::jsonb;

-- Add trial management columns
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS free_trial_enabled BOOLEAN DEFAULT false;

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

-- Add comments
COMMENT ON COLUMN business_profiles.features IS 'Granular feature access control - allows admin to lock/unlock specific features regardless of tier';
COMMENT ON COLUMN business_profiles.trial_start_date IS 'Start date of free trial period';
COMMENT ON COLUMN business_profiles.trial_end_date IS 'End date of free trial period (90 days from start)';
COMMENT ON COLUMN business_profiles.free_trial_enabled IS 'Whether business is currently on free trial';

