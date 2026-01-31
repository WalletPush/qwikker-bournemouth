-- SAFE Migration: Add business_offers table for multiple offers
-- Description: Creates ONLY the business_offers table without touching existing data
-- This is safe because it only ADDS new functionality, doesn't change existing tables
-- Date: 2025-09-29 22:00:00 UTC

-- Create business_offers table for multiple offers per business
CREATE TABLE IF NOT EXISTS public.business_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Offer details
  offer_name text NOT NULL,
  offer_type text CHECK (offer_type IN (
    'discount', 'two_for_one', 'freebie', 'buy_x_get_y',
    'percentage_off', 'fixed_amount_off', 'other'
  )) NOT NULL,
  offer_value text NOT NULL, -- e.g., "20% off", "Buy 2 get 1 free"
  offer_claim_amount text CHECK (offer_claim_amount IN (
    'single', 'multiple', 'daily', 'weekly', 'monthly'
  )) DEFAULT 'multiple',
  offer_terms text,
  offer_start_date date,
  offer_end_date date,
  offer_image text, -- URL to uploaded offer image
  
  -- Status and approval
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  approved_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_reason text,
  
  -- Order and priority
  display_order integer DEFAULT 1, -- For ordering multiple offers
  is_featured boolean DEFAULT false, -- Highlight this offer
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE public.business_offers IS 'Multiple offers per business based on subscription tier limits';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_offers_business_id ON public.business_offers(business_id);
CREATE INDEX IF NOT EXISTS idx_business_offers_status ON public.business_offers(status);
CREATE INDEX IF NOT EXISTS idx_business_offers_approved_at ON public.business_offers(approved_at DESC);
CREATE INDEX IF NOT EXISTS idx_business_offers_display_order ON public.business_offers(business_id, display_order);

-- Enable RLS
ALTER TABLE public.business_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Businesses can view their own offers"
  ON public.business_offers FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can insert their own offers"
  ON public.business_offers FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Businesses can update their own pending offers"
  ON public.business_offers FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  );

CREATE POLICY "Public can view approved offers"
  ON public.business_offers FOR SELECT
  USING (status = 'approved');

-- Create function to check offer limits based on subscription tier
CREATE OR REPLACE FUNCTION check_offer_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_offer_count integer;
  business_plan text;
  max_offers integer;
BEGIN
  -- Get business plan and current offer count
  SELECT 
    bp.subscription_plan,
    COUNT(bo.id)
  INTO business_plan, current_offer_count
  FROM public.business_profiles bp
  LEFT JOIN public.business_offers bo ON bp.id = bo.business_id AND bo.status = 'approved'
  WHERE bp.id = NEW.business_id
  GROUP BY bp.subscription_plan;
  
  -- Set offer limits based on plan
  CASE business_plan
    WHEN 'starter' THEN max_offers := 3;
    WHEN 'featured' THEN max_offers := 5;
    WHEN 'spotlight' THEN max_offers := 999; -- Unlimited
    ELSE max_offers := 3; -- Default to starter
  END CASE;
  
  -- Check if adding this offer would exceed the limit
  IF current_offer_count >= max_offers THEN
    RAISE EXCEPTION 'Offer limit exceeded. % plan allows maximum % offers, you currently have %', 
      business_plan, max_offers, current_offer_count;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce offer limits
CREATE TRIGGER enforce_offer_limits
  BEFORE INSERT ON public.business_offers
  FOR EACH ROW
  EXECUTE FUNCTION check_offer_limit();

-- SAFE DATA MIGRATION: Copy existing offers to new table (only if they exist)
-- This preserves existing offers without touching the original table
INSERT INTO public.business_offers (
  business_id,
  offer_name,
  offer_type,
  offer_value,
  offer_claim_amount,
  offer_terms,
  offer_start_date,
  offer_end_date,
  offer_image,
  status,
  approved_at,
  created_at,
  updated_at
)
SELECT 
  id as business_id,
  offer_name,
  offer_type,
  offer_value,
  offer_claim_amount,
  offer_terms,
  offer_start_date,
  offer_end_date,
  offer_image,
  CASE 
    WHEN status = 'approved' THEN 'approved'
    ELSE 'pending'
  END as status,
  CASE 
    WHEN status = 'approved' THEN updated_at
    ELSE NULL
  END as approved_at,
  created_at,
  updated_at
FROM public.business_profiles
WHERE offer_name IS NOT NULL 
  AND offer_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.business_offers bo 
    WHERE bo.business_id = business_profiles.id 
    AND bo.offer_name = business_profiles.offer_name
  );

-- Create view for backward compatibility (doesn't change existing tables)
CREATE OR REPLACE VIEW public.business_profiles_with_offers AS
SELECT 
  bp.*,
  -- Get the first/primary offer for backward compatibility
  bo.offer_name as primary_offer_name,
  bo.offer_type as primary_offer_type,
  bo.offer_value as primary_offer_value,
  bo.offer_claim_amount as primary_offer_claim_amount,
  bo.offer_terms as primary_offer_terms,
  bo.offer_start_date as primary_offer_start_date,
  bo.offer_end_date as primary_offer_end_date,
  bo.offer_image as primary_offer_image,
  -- Count total approved offers
  COALESCE(offer_counts.total_offers, 0) as total_offers,
  COALESCE(offer_counts.active_offers, 0) as active_offers
FROM public.business_profiles bp
LEFT JOIN public.business_offers bo ON bp.id = bo.business_id 
  AND bo.status = 'approved'
  AND bo.display_order = 1
LEFT JOIN (
  SELECT 
    business_id,
    COUNT(*) as total_offers,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_offers
  FROM public.business_offers
  GROUP BY business_id
) offer_counts ON bp.id = offer_counts.business_id;

-- Add comment to view
COMMENT ON VIEW public.business_profiles_with_offers IS 'Backward compatible view showing business profiles with their primary offer and offer counts';

-- This migration is SAFE because:
-- 1. Only ADDS new table, doesn't modify existing tables
-- 2. Copies existing data without deleting it
-- 3. Creates backward compatibility view
-- 4. Existing code continues to work with business_profiles table
