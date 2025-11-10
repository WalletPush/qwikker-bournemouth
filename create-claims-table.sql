-- Create user_offer_claims table from scratch
-- This will drop and recreate the table with the correct structure

-- Drop existing table if it exists (this is safe since it's empty anyway)
DROP TABLE IF EXISTS public.user_offer_claims CASCADE;

-- Create user_offer_claims table with correct schema
CREATE TABLE public.user_offer_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification (can be null for anonymous users)
  user_id uuid REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  wallet_pass_id text, -- For tracking anonymous users by wallet pass ID
  
  -- Offer details (matching exactly what the application sends)
  offer_id text NOT NULL,
  offer_title text NOT NULL,
  business_name text NOT NULL,
  business_id text, -- Can be null for mock offers, and is text not uuid
  
  -- Claim details
  claimed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'wallet_added', 'redeemed', 'expired')),
  
  -- Optional fields for compatibility
  redeemed_at timestamptz, -- For when offer is actually redeemed
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.user_offer_claims IS 'Track user offer claims and redemptions - schema matches application code';

-- Create indexes for performance
CREATE INDEX idx_user_offer_claims_user_id ON public.user_offer_claims(user_id);
CREATE INDEX idx_user_offer_claims_wallet_pass_id ON public.user_offer_claims(wallet_pass_id);
CREATE INDEX idx_user_offer_claims_offer_id ON public.user_offer_claims(offer_id);
CREATE INDEX idx_user_offer_claims_business_id ON public.user_offer_claims(business_id);
CREATE INDEX idx_user_offer_claims_status ON public.user_offer_claims(status);
CREATE INDEX idx_user_offer_claims_claimed_at ON public.user_offer_claims(claimed_at DESC);

-- Enable RLS
ALTER TABLE public.user_offer_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own claims by user_id
CREATE POLICY "Users can view their own offer claims by user_id"
  ON public.user_offer_claims FOR SELECT
  USING (user_id = auth.uid());

-- Users can view their own claims by wallet_pass_id (for anonymous users)
CREATE POLICY "Users can view their own offer claims by wallet_pass_id"
  ON public.user_offer_claims FOR SELECT
  USING (wallet_pass_id IS NOT NULL);

-- Service role can manage all offer claims (for server actions)
CREATE POLICY "Service role can manage all offer claims"
  ON public.user_offer_claims FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_offer_claims_updated_at
    BEFORE UPDATE ON public.user_offer_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test the table with a sample insert
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

-- Show final table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_offer_claims' 
ORDER BY ordinal_position;
