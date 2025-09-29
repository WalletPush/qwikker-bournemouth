-- Migration: Remove business_town CHECK constraint for franchise expansion
-- Description: Removes the restrictive CHECK constraint on business_town to allow any franchise city
-- Date: 2025-09-29 12:00:00 UTC
-- 
-- CRITICAL: This constraint was blocking franchise expansion
-- Before: Only allowed 'bournemouth', 'poole', 'christchurch', etc.
-- After: Allows any city name for franchise expansion (calgary, london, paris, etc.)

-- Remove the restrictive CHECK constraint
ALTER TABLE public.business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_business_town_check;

-- Add a simple NOT NULL constraint instead (optional - keeps data quality)
-- ALTER TABLE public.business_profiles 
-- ALTER COLUMN business_town SET NOT NULL;

-- Update existing businesses to use consistent franchise city
-- This ensures all current Bournemouth franchise businesses use 'bournemouth'
UPDATE public.business_profiles 
SET business_town = 'bournemouth'
WHERE business_town IN ('poole', 'christchurch', 'wimborne', 'ferndown', 'ringwood', 'new_milton')
AND business_town IS NOT NULL;

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % businesses to use bournemouth franchise city', updated_count;
END $$;
