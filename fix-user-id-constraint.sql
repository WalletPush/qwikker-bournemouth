-- Fix user_id column to allow NULL values for anonymous users
ALTER TABLE public.user_offer_claims ALTER COLUMN user_id DROP NOT NULL;

-- Test insert with null user_id (for anonymous users)
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

-- Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
