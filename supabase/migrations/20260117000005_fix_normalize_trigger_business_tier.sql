-- Migration: Fix normalize_imported_business_profiles trigger to set business_tier
-- Problem: Trigger sets plan='free' but doesn't set business_tier
-- Result: When claimed, business_tier stays as DB default (probably 'recommended')
-- Date: 2026-01-17

CREATE OR REPLACE FUNCTION public.normalize_imported_business_profiles()
RETURNS trigger AS $$
BEGIN
  -- Only normalize rows that are imported AND unclaimed
  IF (NEW.auto_imported = true AND NEW.owner_user_id IS NULL) THEN
    -- Force free plan (no paid/trial artifacts)
    NEW.plan := 'free';
    
    -- 🔒 CRITICAL: Force free_tier (prevents AI leakage)
    NEW.business_tier := 'free_tier';
    
    -- Clear all trial/subscription fields
    NEW.trial_expiry := NULL;
    NEW.trial_start_date := NULL;
    NEW.trial_end_date := NULL;
    
    -- Clear all offer fields
    NEW.offer_start_date := NULL;
    NEW.offer_end_date := NULL;
    NEW.offer_name := NULL;
    NEW.offer_type := NULL;
    NEW.offer_value := NULL;
    NEW.offer_terms := NULL;
    NEW.offer_image := NULL;
    NEW.offer_description := NULL;
    NEW.offer_claim_amount := NULL;
    
    -- Clear all billing fields
    NEW.current_subscription_id := NULL;
    NEW.last_payment_date := NULL;
    NEW.next_billing_date := NULL;
    NEW.payment_method_on_file := false;
    
    -- Ensure user_id is also NULL (belt-and-suspenders)
    NEW.user_id := NULL;
    
    -- Normalize tagline if present (helps unique index and display)
    IF NEW.business_tagline IS NOT NULL AND trim(NEW.business_tagline) != '' THEN
      NEW.tagline_normalized := lower(regexp_replace(trim(NEW.business_tagline), '\s+', ' ', 'g'));
    END IF;
    
    -- Log normalization (optional, remove if too noisy)
    RAISE DEBUG 'Normalized imported business: % (auto_imported=%, owner_user_id=NULL, business_tier=free_tier)', 
      NEW.business_name, NEW.auto_imported;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.normalize_imported_business_profiles() IS 
  'Ensures imported/unclaimed businesses never inherit paid/trial defaults. Sets business_tier=free_tier. Runs on INSERT/UPDATE.';

-- Verification query
/*
SELECT business_name, plan, business_tier, auto_imported, owner_user_id
FROM business_profiles
WHERE auto_imported = true
ORDER BY created_at DESC
LIMIT 10;
*/
