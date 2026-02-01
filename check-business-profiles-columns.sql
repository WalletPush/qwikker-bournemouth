-- Check what columns business_profiles has vs the views
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'business_profiles' 
  AND column_name IN ('business_tier', 'status', 'owner_user_id', 'subscription_tier', 'plan')
ORDER BY column_name;
