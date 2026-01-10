-- Step 1: Rename the existing "free" tier to "trial" for the 90-day trial
UPDATE subscription_tiers
SET 
  tier_name = 'trial',
  tier_display_name = 'Free Trial'
WHERE tier_name = 'free';

-- Step 2: Add permanent "Free" tier to subscription_tiers table
-- This is for claimed_free businesses (free forever, not trial)
-- Only insert if it doesn't already exist
INSERT INTO subscription_tiers (
  id,
  tier_name,
  tier_display_name,
  monthly_price,
  yearly_price,
  features,
  is_active,
  created_at
)
SELECT 
  'b1a2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'free',
  'Free',
  0.00,
  0.00,
  '{
    "max_offers": 0,
    "dashboard_support": false,
    "direct_ai_booking": false,
    "push_notifications": false,
    "all_starter_features": false,
    "trial_days": 0,
    "description": "Free listing with basic visibility in Discover"
  }'::jsonb,
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_tiers WHERE tier_name = 'free'
);

-- Verify the changes
SELECT 
  tier_name,
  tier_display_name,
  monthly_price,
  yearly_price,
  is_active
FROM subscription_tiers
ORDER BY 
  CASE tier_name
    WHEN 'trial' THEN 1
    WHEN 'free' THEN 2
    WHEN 'starter' THEN 3
    WHEN 'featured' THEN 4
    WHEN 'spotlight' THEN 5
  END;

