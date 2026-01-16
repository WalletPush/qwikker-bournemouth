-- Backfill: Normalize existing imported/unclaimed business profiles
-- Description: Fixes existing rows that were imported before the trigger was created
-- Date: 2026-01-16
-- SAFETY: This only affects rows where auto_imported=true AND owner_user_id IS NULL
-- Run this AFTER the migration 20260116000001_imported_defaults_fix.sql

-- ============================================================================
-- PREVIEW: Check how many rows will be affected
-- ============================================================================
-- Run this first to see what will change:
/*
SELECT 
  business_name,
  plan,
  trial_expiry,
  trial_start_date,
  status,
  owner_user_id,
  auto_imported,
  business_tagline,
  tagline_normalized
FROM public.business_profiles
WHERE auto_imported = true
  AND owner_user_id IS NULL;
*/

-- ============================================================================
-- BACKFILL: Normalize imported/unclaimed rows
-- ============================================================================
UPDATE public.business_profiles
SET
  -- Force free plan
  plan = 'free',
  
  -- Clear all trial/subscription fields
  trial_expiry = NULL,
  trial_start_date = NULL,
  trial_end_date = NULL,
  
  -- Clear all offer fields
  offer_start_date = NULL,
  offer_end_date = NULL,
  offer_name = NULL,
  offer_type = NULL,
  offer_value = NULL,
  offer_terms = NULL,
  offer_image = NULL,
  offer_description = NULL,
  offer_claim_amount = NULL,
  
  -- Clear all billing fields
  current_subscription_id = NULL,
  last_payment_date = NULL,
  next_billing_date = NULL,
  payment_method_on_file = false,
  
  -- Normalize tagline if present
  tagline_normalized = CASE
    WHEN business_tagline IS NOT NULL AND trim(business_tagline) != ''
    THEN lower(regexp_replace(trim(business_tagline), '\s+', ' ', 'g'))
    ELSE tagline_normalized
  END,
  
  -- Update timestamp
  updated_at = NOW()
  
WHERE auto_imported = true
  AND owner_user_id IS NULL;

-- ============================================================================
-- VERIFICATION: Check results
-- ============================================================================
-- Run this after the update to verify:
/*
SELECT 
  COUNT(*) as total_imported_unclaimed,
  COUNT(CASE WHEN plan = 'free' THEN 1 END) as free_plan_count,
  COUNT(CASE WHEN trial_expiry IS NULL THEN 1 END) as null_trial_count,
  COUNT(CASE WHEN tagline_normalized IS NOT NULL THEN 1 END) as normalized_taglines
FROM public.business_profiles
WHERE auto_imported = true
  AND owner_user_id IS NULL;
*/

-- ============================================================================
-- OPTIONAL: Verify specific business (e.g., Momos Bento Bar)
-- ============================================================================
/*
SELECT 
  business_name,
  plan,
  trial_expiry,
  status,
  visibility,
  business_tagline,
  tagline_normalized,
  google_primary_type,
  google_types,
  auto_imported,
  owner_user_id
FROM public.business_profiles
WHERE business_name ILIKE '%momos%bento%'
   OR business_name ILIKE '%nepalese%';
*/
