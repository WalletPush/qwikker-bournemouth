-- Migration: Make Trial Length Franchise-Aware
-- Date: 2025-01-07
-- Description: Change hardcoded 120-day trials to use franchise_crm_configs.founding_member_trial_days
-- Each franchise can now set their own trial length (default: 90 days)

-- ============================================
-- STEP 1: Create Helper Function
-- ============================================

-- Function to get trial days for a specific franchise
CREATE OR REPLACE FUNCTION get_franchise_trial_days(p_city TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_days INTEGER;
BEGIN
  -- Get trial days from franchise config
  SELECT COALESCE(founding_member_trial_days, 90)
  INTO v_trial_days
  FROM franchise_crm_configs
  WHERE city = p_city;
  
  -- If franchise not found, default to 90 days
  RETURN COALESCE(v_trial_days, 90);
END;
$$;

COMMENT ON FUNCTION get_franchise_trial_days(TEXT) IS 
  'Returns the trial length in days for a specific franchise city. Defaults to 90 if not configured.';

-- ============================================
-- STEP 2: Update handle_new_user Trigger
-- ============================================

-- This trigger runs when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  new_business_id UUID;
  trial_tier_id UUID;
  trial_days INTEGER;
BEGIN
  -- Add detailed logging for debugging
  RAISE LOG 'handle_new_user trigger called for user_id: %', NEW.id;
  RAISE LOG 'User email: %', NEW.email;
  
  BEGIN
    -- 1. Create business profile (operational data)
    INSERT INTO public.business_profiles (
      user_id, 
      email, 
      plan, 
      is_founder,
      status,
      profile_completion_percentage,
      business_tier,
      rating,
      review_count,
      city
    )
    VALUES (
      NEW.id,
      NEW.email,
      'starter',
      CASE WHEN NOW() < '2025-12-31 23:59:59+00'::timestamptz THEN true ELSE false END,
      'incomplete',
      0,
      'free_trial',
      0,
      0,
      'bournemouth' -- TODO: Make this dynamic based on subdomain/signup
    )
    RETURNING id INTO new_business_id;
    
    RAISE LOG 'Successfully created business profile for user_id: %, business_id: %', NEW.id, new_business_id;
    
    -- 2. Get the trial tier ID
    SELECT id INTO trial_tier_id 
    FROM public.subscription_tiers 
    WHERE tier_name = 'trial' 
    LIMIT 1;
    
    -- If trial tier doesn't exist, create it
    IF trial_tier_id IS NULL THEN
      INSERT INTO public.subscription_tiers (
        tier_name,
        tier_display_name,
        monthly_price,
        yearly_price,
        features
      )
      VALUES (
        'trial',
        'Free Trial',
        0,
        0,
        '{"max_offers": 1, "max_secret_items": 1, "analytics": false, "priority_support": false}'::jsonb
      )
      RETURNING id INTO trial_tier_id;
      
      RAISE LOG 'Created trial tier with id: %', trial_tier_id;
    END IF;
    
    -- 3. Get franchise-specific trial days (FRANCHISE-AWARE!)
    trial_days := get_franchise_trial_days('bournemouth'); -- TODO: Make city dynamic
    
    RAISE LOG 'Using trial length: % days for franchise: bournemouth', trial_days;
    
    -- 4. Create business subscription (financial data) with franchise trial length
    INSERT INTO public.business_subscriptions (
      business_id,
      tier_id,
      billing_cycle,
      free_trial_start_date,
      free_trial_end_date,
      is_in_free_trial,
      base_price,
      status,
      original_approval_date
    )
    VALUES (
      new_business_id,
      trial_tier_id,
      'monthly',
      NOW(),
      NOW() + (trial_days || ' days')::INTERVAL, -- FRANCHISE-AWARE TRIAL LENGTH!
      true,
      0,
      'trial',
      NOW()
    );
    
    RAISE LOG 'Successfully created business subscription for business_id: % with % day trial', new_business_id, trial_days;
    
    -- 5. Create basic knowledge base entry (AI-ready data)
    INSERT INTO public.knowledge_base (
      city,
      business_id,
      knowledge_type,
      title,
      content,
      tags,
      status,
      created_by
    )
    VALUES (
      'bournemouth',
      new_business_id,
      'custom_knowledge',
      'Basic Business Information',
      'New business registered: ' || NEW.email || '. Status: Incomplete profile, awaiting completion.',
      ARRAY['business', 'new_signup', 'incomplete'],
      'active',
      NULL -- System-generated, no specific admin
    );
    
    RAISE LOG 'Successfully created knowledge base entry for business_id: %', new_business_id;
    
  EXCEPTION
    WHEN others THEN
      -- Log the error details for debugging
      RAISE LOG 'Error in 3-table creation for user_id: %. Error: % %', NEW.id, SQLSTATE, SQLERRM;
      
      -- Re-raise the error to prevent the user creation from completing
      RAISE EXCEPTION 'Failed to create complete business setup: % %', SQLSTATE, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Creates entries in all 3 tables (business_profiles, business_subscriptions, knowledge_base) when a new user signs up. Trial length is franchise-specific.';

-- ============================================
-- STEP 3: Update Approval Trigger (if exists)
-- ============================================

-- Check if there's an approval trigger that also sets trial length
-- This would run when admin approves a business

CREATE OR REPLACE FUNCTION setup_free_trial_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  free_tier_id UUID;
  trial_start_date TIMESTAMP WITH TIME ZONE := NOW();
  trial_end_date TIMESTAMP WITH TIME ZONE;
  trial_days INTEGER;
  business_city TEXT;
BEGIN
  -- Only run when status changes to 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    BEGIN
      -- Get the business city
      SELECT city INTO business_city
      FROM business_profiles
      WHERE id = NEW.id;
      
      -- Get franchise-specific trial days
      trial_days := get_franchise_trial_days(COALESCE(business_city, 'bournemouth'));
      
      -- Calculate trial end date
      trial_end_date := NOW() + (trial_days || ' days')::INTERVAL;
      
      RAISE LOG 'Setting up trial for business in %: % days', business_city, trial_days;
      
      -- Get the free tier
      SELECT id INTO free_tier_id FROM public.subscription_tiers WHERE tier_name = 'free' LIMIT 1;
      
      -- Create free trial subscription (only if one doesn't exist)
      INSERT INTO public.business_subscriptions (
        business_id,
        tier_id,
        free_trial_start_date,
        free_trial_end_date,
        is_in_free_trial,
        status,
        billing_cycle,
        original_approval_date
      ) VALUES (
        NEW.id,
        free_tier_id,
        trial_start_date,
        trial_end_date,
        true,
        'trial',
        'monthly',
        NOW()
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

COMMENT ON FUNCTION setup_free_trial_on_approval() IS 
  'Automatically creates franchise-aware free trial subscription when business is approved';

-- Recreate the trigger (if it exists)
DROP TRIGGER IF EXISTS trigger_setup_free_trial_on_approval ON public.business_profiles;

CREATE TRIGGER trigger_setup_free_trial_on_approval
  AFTER UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_free_trial_on_approval();

-- ============================================
-- STEP 4: Set Default for Bournemouth
-- ============================================

-- Ensure Bournemouth has the correct trial days set
UPDATE franchise_crm_configs
SET founding_member_trial_days = 90
WHERE city = 'bournemouth'
AND (founding_member_trial_days IS NULL OR founding_member_trial_days = 120);

-- ============================================
-- VERIFICATION
-- ============================================

-- Query to verify franchise trial settings
DO $$
DECLARE
  v_trial_days INTEGER;
BEGIN
  v_trial_days := get_franchise_trial_days('bournemouth');
  RAISE NOTICE 'Bournemouth franchise trial length: % days', v_trial_days;
END $$;

