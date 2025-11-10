-- Add missing columns to user_offer_claims table to match application expectations

-- Add offer_id column (maps to the offer UUID)
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_id text;

-- Add offer_title column (maps to offer name/title)
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_title text;

-- Add business_name column (maps to business name)
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS business_name text;

-- Add wallet_pass_id column (for anonymous user tracking)
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Show the updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Test insert with the application's expected data structure
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
  null,               -- user_id can be null for anonymous users
  'test-wallet-fix-123',
  'claimed',
  now()
);

-- Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
