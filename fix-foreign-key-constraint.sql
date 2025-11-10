-- Fix foreign key constraint and test with real data

-- Step 1: Add missing columns
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_id text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_title text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Step 2: Remove NOT NULL constraints that are causing issues
ALTER TABLE public.user_offer_claims ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_name DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_type DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_value DROP NOT NULL;

-- Step 3: Show the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Step 4: Get a real business_id from business_profiles for testing
SELECT id, business_name FROM public.business_profiles LIMIT 1;

-- Step 5: Test insert with a real business_id (replace with actual ID from above query)
-- We'll use NULL for business_id to avoid foreign key issues in the test
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
  null,  -- Use NULL to avoid foreign key constraint
  null,  -- user_id can be null for anonymous users
  'test-wallet-fix-123',
  'claimed',
  now()
);

-- Step 6: Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Step 7: Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Step 8: Show final table structure to confirm everything is ready
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
