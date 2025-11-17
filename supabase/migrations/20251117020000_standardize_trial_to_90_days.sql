-- Standardize free trial period to 90 days across the platform
-- Previously had inconsistent 120 days in trigger, 90 days in admin UI

-- Drop and recreate the trigger function with 90 days
DROP TRIGGER IF EXISTS trigger_setup_free_trial_on_approval ON public.profiles;
DROP FUNCTION IF EXISTS setup_free_trial_on_approval();

CREATE OR REPLACE FUNCTION setup_free_trial_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get the free tier
    DECLARE
      free_tier_id UUID;
      trial_start_date TIMESTAMP WITH TIME ZONE := NOW();
      trial_end_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '90 days'; -- Changed from 120 to 90
    BEGIN
      SELECT id INTO free_tier_id FROM public.subscription_tiers WHERE tier_name = 'free' LIMIT 1;
      
      -- Create free trial subscription
      INSERT INTO public.business_subscriptions (
        business_id,
        tier_id,
        free_trial_start_date,
        free_trial_end_date,
        is_in_free_trial,
        status,
        billing_cycle
      ) VALUES (
        NEW.id,
        free_tier_id,
        trial_start_date,
        trial_end_date,
        true,
        'trial',
        'monthly'
      )
      ON CONFLICT (business_id) DO NOTHING; -- Don't override if subscription already exists
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the approval
      RAISE WARNING 'Failed to create free trial subscription: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_setup_free_trial_on_approval
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_free_trial_on_approval();

-- Update the comment
COMMENT ON FUNCTION setup_free_trial_on_approval() IS 'Automatically creates 90-day free trial subscription when business is approved';

-- Update any references in comments
COMMENT ON COLUMN public.business_subscriptions.upgraded_during_trial IS 'True if business upgraded to paid plan during 90-day free trial';

