-- Migration: Convert legacy tier assignments to proper subscription records
-- Description: Creates subscription records for businesses that have tiers but no subscriptions
-- Date: 2024-12-06

-- Step 1: Create subscriptions for businesses with tiers but no subscription records
INSERT INTO public.business_subscriptions (
  business_id,
  tier_id,
  billing_cycle,
  free_trial_start_date,
  free_trial_end_date,
  is_in_free_trial,
  subscription_start_date,
  current_period_start,
  current_period_end,
  base_price,
  status,
  upgraded_during_trial,
  original_approval_date,
  created_at,
  updated_at
)
SELECT 
  bp.id as business_id,
  st.id as tier_id,
  'monthly' as billing_cycle,
  
  -- Free trial dates: 90 days from approval (or created_at if no approval)
  COALESCE(bp.approved_at, bp.created_at) as free_trial_start_date,
  COALESCE(bp.approved_at, bp.created_at) + INTERVAL '90 days' as free_trial_end_date,
  
  -- Still in trial if less than 90 days since approval
  CASE 
    WHEN COALESCE(bp.approved_at, bp.created_at) + INTERVAL '90 days' > NOW() 
    THEN true 
    ELSE false 
  END as is_in_free_trial,
  
  -- Subscription start date (when approved or created)
  COALESCE(bp.approved_at, bp.created_at) as subscription_start_date,
  
  -- Current period (trial period for now)
  COALESCE(bp.approved_at, bp.created_at) as current_period_start,
  COALESCE(bp.approved_at, bp.created_at) + INTERVAL '90 days' as current_period_end,
  
  -- Base price from tier
  st.price_monthly as base_price,
  
  -- Status based on trial and tier
  CASE 
    WHEN COALESCE(bp.approved_at, bp.created_at) + INTERVAL '90 days' > NOW() THEN 'trial'
    WHEN bp.business_tier IN ('Spotlight', 'Featured', 'Starter') THEN 'active'
    ELSE 'trial'
  END as status,
  
  -- Not upgraded during trial yet
  false as upgraded_during_trial,
  
  -- Original approval date
  bp.approved_at as original_approval_date,
  
  NOW() as created_at,
  NOW() as updated_at

FROM public.business_profiles bp
JOIN public.subscription_tiers st ON (
  (bp.business_tier = 'Spotlight' AND st.tier_name = 'Spotlight') OR
  (bp.business_tier = 'Featured' AND st.tier_name = 'Featured') OR
  (bp.business_tier = 'Starter' AND st.tier_name = 'Starter') OR
  (bp.business_tier = 'Free Trial' AND st.tier_name = 'Starter')
)
WHERE 
  bp.business_tier IS NOT NULL 
  AND bp.business_tier != ''
  AND NOT EXISTS (
    -- Only create if no subscription exists
    SELECT 1 FROM public.business_subscriptions bs 
    WHERE bs.business_id = bp.id
  );

-- Step 2: Log the migration
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM public.business_subscriptions
  WHERE created_at >= NOW() - INTERVAL '5 seconds';
  
  RAISE NOTICE '✅ Migrated % businesses from legacy tiers to subscriptions', migrated_count;
END $$;

-- Step 3: Add helpful comment
COMMENT ON COLUMN business_profiles.business_tier IS 'LEGACY: Use business_subscriptions table instead. Kept for backward compatibility.';

