-- Migration: Fix user_offer_claims table schema to match application code
-- Description: Updates the user_offer_claims table to match what the application is trying to insert
-- Date: 2025-09-28 20:00:00 UTC

-- Drop existing table and recreate with correct schema
DROP TABLE IF EXISTS public.user_offer_claims CASCADE;

-- Create user_offer_claims table with correct schema
CREATE TABLE public.user_offer_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification (can be null for anonymous users)
  user_id uuid REFERENCES public.user_members(user_id) ON DELETE CASCADE,
  wallet_pass_id text, -- For tracking anonymous users by wallet pass ID
  
  -- Offer details (matching what the application sends)
  offer_id text NOT NULL,
  offer_title text NOT NULL,
  business_name text NOT NULL,
  business_id text, -- Can be null for mock offers
  
  -- Claim details
  claimed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed', 'wallet_added', 'redeemed', 'expired')),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.user_offer_claims IS 'Track user offer claims and redemptions with correct schema';

-- Create indexes
CREATE INDEX idx_user_offer_claims_user_id ON public.user_offer_claims(user_id);
CREATE INDEX idx_user_offer_claims_wallet_pass_id ON public.user_offer_claims(wallet_pass_id);
CREATE INDEX idx_user_offer_claims_offer_id ON public.user_offer_claims(offer_id);
CREATE INDEX idx_user_offer_claims_business_id ON public.user_offer_claims(business_id);
CREATE INDEX idx_user_offer_claims_status ON public.user_offer_claims(status);
CREATE INDEX idx_user_offer_claims_claimed_at ON public.user_offer_claims(claimed_at DESC);

-- Enable RLS
ALTER TABLE public.user_offer_claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own offer claims by user_id"
  ON public.user_offer_claims FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own offer claims by wallet_pass_id"
  ON public.user_offer_claims FOR SELECT
  USING (wallet_pass_id IS NOT NULL);

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
