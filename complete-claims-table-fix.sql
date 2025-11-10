-- Complete fix for user_offer_claims table

-- Step 1: Add missing columns
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_id text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_title text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Step 2: Fix user_id column to allow NULL values for anonymous users
ALTER TABLE public.user_offer_claims ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Show the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Step 4: Test insert with the application's expected data structure
INSERT INTO public.user_offer_claims (
  offer_id,
  offer_title, 
  business_name,
  business_id,
  user_id,
  wallet_pass_id,
  status,
  claimed_at
) VALUES (
  'test-fix-123',
  'Test Fix Offer',
  'Test Business Fix', 
  gen_random_uuid(),  -- Generate a proper UUID for business_id
  null,               -- user_id can now be null for anonymous users
  'test-wallet-fix-123',
  'claimed',
  now()
);

-- Step 5: Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Step 6: Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Step 7: Show final table structure to confirm everything is ready
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
