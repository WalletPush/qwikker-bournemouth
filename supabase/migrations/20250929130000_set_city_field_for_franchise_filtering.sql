-- Migration: Set city field for franchise filtering
-- Description: Sets the city field to the correct franchise value for existing businesses
-- Date: 2025-09-29 13:00:00 UTC
-- 
-- CLEAN APPROACH:
-- - city = franchise identifier ('bournemouth', 'calgary', 'paris') - for filtering
-- - business_town = actual town ('poole', 'christchurch', 'wimborne') - for display
-- - business_address = street address ('123 High Street') - for maps

-- Remove the restrictive CHECK constraint (still needed for franchise expansion)
ALTER TABLE public.business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_business_town_check;

-- Set city field to 'bournemouth' for all existing businesses in the Bournemouth franchise area
-- This allows franchise filtering while preserving actual town names for display
UPDATE public.business_profiles 
SET city = 'bournemouth'
WHERE city IS NULL OR city = ''
OR business_town IN ('bournemouth', 'poole', 'christchurch', 'wimborne', 'ferndown', 'ringwood', 'new_milton');

-- Ensure city field is not null for future records
ALTER TABLE public.business_profiles 
ALTER COLUMN city SET NOT NULL;

-- Add default value for new records (will be overridden by domain detection)
ALTER TABLE public.business_profiles 
ALTER COLUMN city SET DEFAULT 'bournemouth';

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM public.business_profiles WHERE city = 'bournemouth';
    RAISE NOTICE 'Set city field to bournemouth for % businesses', updated_count;
END $$;
