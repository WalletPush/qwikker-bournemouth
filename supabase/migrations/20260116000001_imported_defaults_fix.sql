-- Migration: Fix imported/unclaimed business defaults
-- Description: Ensures imported businesses (auto_imported=true, owner_user_id IS NULL) 
--              never inherit paid/trial defaults and are properly normalized
-- Date: 2026-01-16 00:00:01 UTC

-- ============================================================================
-- STEP 1: Remove trial_expiry default (imports should never receive it automatically)
-- ============================================================================
ALTER TABLE public.business_profiles
  ALTER COLUMN trial_expiry DROP DEFAULT;

ALTER TABLE public.business_profiles
  ALTER COLUMN trial_expiry SET DEFAULT NULL;

COMMENT ON COLUMN public.business_profiles.trial_expiry IS 'Trial expiration timestamp. NULL for free/imported listings. Only set explicitly during signup or claim.';

-- ============================================================================
-- STEP 2: Extend plan CHECK constraint to allow "free" (if constraint exists)
-- ============================================================================
DO $$ 
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'business_profiles_plan_check'
  ) THEN
    ALTER TABLE public.business_profiles DROP CONSTRAINT business_profiles_plan_check;
    
    -- Recreate with 'free' included
    ALTER TABLE public.business_profiles ADD CONSTRAINT business_profiles_plan_check 
      CHECK (plan IN ('free', 'starter', 'featured', 'spotlight', 'pro'));
    
    RAISE NOTICE 'Updated business_profiles_plan_check constraint to include "free"';
  ELSE
    RAISE NOTICE 'No plan check constraint found on business_profiles (plan is text, no constraint needed)';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create trigger to normalize imported/unclaimed listings
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_imported_business_profiles()
RETURNS trigger AS $$
BEGIN
  -- Only normalize rows that are imported AND unclaimed
  IF (NEW.auto_imported = true AND NEW.owner_user_id IS NULL) THEN
    -- Force free plan (no paid/trial artifacts)
    NEW.plan := 'free';
    
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
    RAISE DEBUG 'Normalized imported business: % (auto_imported=%, owner_user_id=NULL)', 
      NEW.business_name, NEW.auto_imported;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.normalize_imported_business_profiles() IS 
  'Ensures imported/unclaimed businesses never inherit paid/trial defaults. Runs on INSERT/UPDATE.';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_normalize_imported_business_profiles ON public.business_profiles;

-- Create trigger (runs BEFORE INSERT/UPDATE)
CREATE TRIGGER trg_normalize_imported_business_profiles
  BEFORE INSERT OR UPDATE ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_imported_business_profiles();

COMMENT ON TRIGGER trg_normalize_imported_business_profiles ON public.business_profiles IS 
  'Normalizes imported/unclaimed businesses to free tier with no trial/billing artifacts';

-- ============================================================================
-- STEP 4: Add columns for richer Google type data (if not exists)
-- ============================================================================
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS google_primary_type text;

COMMENT ON COLUMN public.business_profiles.google_primary_type IS 
  'Primary place type from Google Places API (e.g. "nepalese_restaurant", "coffee_shop")';

-- Note: google_types already exists as text[] in most schemas
-- If it doesn't exist in yours, uncomment:
-- ALTER TABLE public.business_profiles
--   ADD COLUMN IF NOT EXISTS google_types text[];

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS business_postcode text;

COMMENT ON COLUMN public.business_profiles.business_postcode IS 
  'Postcode extracted from Google Places address components';

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================================================
-- SELECT business_name, plan, trial_expiry, auto_imported, owner_user_id, status
-- FROM public.business_profiles
-- WHERE auto_imported = true AND owner_user_id IS NULL
-- LIMIT 10;
