-- First, let's see what columns actually exist in user_offer_claims
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Let's also see a sample of what's in the table
SELECT * FROM public.user_offer_claims LIMIT 5;

-- Now let's add any missing columns that the application needs
-- Add offer_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'offer_id'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN offer_id text;
  END IF;
END $$;

-- Add offer_title if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'offer_title'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN offer_title text;
  END IF;
END $$;

-- Add business_name if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN business_name text;
  END IF;
END $$;

-- Add business_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN business_id text;
  END IF;
END $$;

-- Add wallet_pass_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'wallet_pass_id'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN wallet_pass_id text;
  END IF;
END $$;

-- Add status if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN status text DEFAULT 'claimed';
  END IF;
END $$;

-- Add claimed_at if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_offer_claims' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE public.user_offer_claims ADD COLUMN claimed_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Show the final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;

-- Test insert to make sure it works now
INSERT INTO public.user_offer_claims (
  offer_id,
  offer_title, 
  business_name,
  business_id,
  wallet_pass_id,
  status,
  claimed_at
) VALUES (
  'test-fix-123',
  'Test Fix Offer',
  'Test Business Fix', 
  'test-business-fix-123',
  'test-wallet-fix-123',
  'claimed',
  now()
);

-- Verify the test record was inserted
SELECT * FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';

-- Clean up test record
DELETE FROM public.user_offer_claims WHERE offer_id = 'test-fix-123';
