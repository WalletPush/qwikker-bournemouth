-- Fix user_offer_claims table PROPERLY with real business relationships

-- Step 1: Add missing columns that the application needs
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_id text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS offer_title text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.user_offer_claims ADD COLUMN IF NOT EXISTS wallet_pass_id text;

-- Step 2: Remove NOT NULL constraints for columns we don't populate
ALTER TABLE public.user_offer_claims ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_name DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_type DROP NOT NULL;
ALTER TABLE public.user_offer_claims ALTER COLUMN offer_value DROP NOT NULL;

-- Step 3: Show current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Step 4: Show real offers we can test with
SELECT 
  bo.id as offer_id,
  bo.offer_name,
  bp.id as business_id,
  bp.business_name
FROM business_offers bo
JOIN business_profiles bp ON bo.business_id = bp.id
WHERE bo.status = 'approved'
LIMIT 3;

-- Step 5: Test with REAL data - pick one of the offers from above
-- Replace the UUIDs below with actual values from the query above
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
  '094ab1fe-de1a-4a38-90e2-7e492f8e81e2',  -- Real offer ID from Alexandra's Café
  '10% off breakfast',                        -- Real offer title
  'Alexandra''s Café',                        -- Real business name
  '376f2d16-161c-48da-9fa8-63f17cac0b51',    -- Real business ID
  null,                                       -- user_id null for anonymous
  'test-wallet-fix-123',                      -- test wallet ID
  'claimed',
  now()
);

-- Step 6: Verify the test record was inserted with real relationships
SELECT 
  uoc.*,
  bp.business_name as verified_business_name,
  bo.offer_name as verified_offer_name
FROM public.user_offer_claims uoc
LEFT JOIN business_profiles bp ON uoc.business_id = bp.id
LEFT JOIN business_offers bo ON uoc.offer_id = bo.id
WHERE uoc.offer_id = '094ab1fe-de1a-4a38-90e2-7e492f8e81e2';

-- Step 7: Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = '094ab1fe-de1a-4a38-90e2-7e492f8e81e2';

-- Step 8: Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
