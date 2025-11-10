-- Fix user_offer_claims table - add missing business_name column
-- This should be run in your Supabase SQL editor

-- Check if business_name column exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' 
    AND column_name = 'business_name'
  ) THEN
    -- Add the missing column
    ALTER TABLE public.user_offer_claims 
    ADD COLUMN business_name text NOT NULL DEFAULT 'Unknown Business';
    
    -- Remove the default after adding (so future inserts must provide it)
    ALTER TABLE public.user_offer_claims 
    ALTER COLUMN business_name DROP DEFAULT;
    
    RAISE NOTICE 'Added business_name column to user_offer_claims table';
  ELSE
    RAISE NOTICE 'business_name column already exists in user_offer_claims table';
  END IF;
END $$;

-- Test the fix with a sample insert
INSERT INTO public.user_offer_claims (
  offer_id,
  offer_title, 
  business_name,
  business_id,
  user_id,
  wallet_pass_id,
  status
) VALUES (
  'test-fix-123',
  'Test Fix Offer',
  'Test Business Fix', 
  'test-business-fix-123',
  null,
  'test-wallet-fix-123',
  'claimed'
);

-- Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';
