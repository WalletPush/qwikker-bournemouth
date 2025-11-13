-- Migration: Fix business_subscriptions foreign key to reference business_profiles
-- This fixes the foreign key constraint to point to the correct table
-- Date: 2025-01-16

-- Step 1: Drop the old foreign key constraint (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_subscriptions_business_id_fkey'
        AND table_name = 'business_subscriptions'
    ) THEN
        ALTER TABLE public.business_subscriptions 
        DROP CONSTRAINT business_subscriptions_business_id_fkey;
    END IF;
END $$;

-- Step 2: Add the correct foreign key constraint pointing to business_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'business_subscriptions_business_id_fkey_fixed'
        AND table_name = 'business_subscriptions'
    ) THEN
        ALTER TABLE public.business_subscriptions 
        ADD CONSTRAINT business_subscriptions_business_id_fkey_fixed 
        FOREIGN KEY (business_id) 
        REFERENCES public.business_profiles(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id 
ON public.business_subscriptions(business_id);

-- Comment
COMMENT ON TABLE public.business_subscriptions IS 'Stores subscription and billing information for businesses. References business_profiles table.';

