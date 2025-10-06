-- supabase/migrations/20250920300000_fix_3_table_architecture.sql

-- Fix the handle_new_user trigger to create entries in all 3 tables: business_profiles, business_subscriptions, knowledge_base

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  new_business_id UUID;
  trial_tier_id UUID;
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
      'bournemouth'
    )
    RETURNING id INTO new_business_id;
    
    RAISE LOG 'Successfully created business profile for user_id: %, business_id: %', NEW.id, new_business_id;
    
    -- 2. Get the trial tier ID (create if doesn't exist)
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
    
    -- 3. Create business subscription (financial data)
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
      NOW() + INTERVAL '120 days', -- 120-day free trial
      true,
      0,
      'trial',
      NOW()
    );
    
    RAISE LOG 'Successfully created business subscription for business_id: %', new_business_id;
    
    -- 4. Create basic knowledge base entry (AI-ready data)
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

-- Add a comment explaining the function
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates entries in all 3 tables: business_profiles (operational), business_subscriptions (financial), knowledge_base (AI-ready) when a new user signs up.';
