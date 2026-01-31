-- Migration: Add claimed_free offer restrictions
-- Description: Updates offer limit trigger to enforce claimed_free restrictions (max 1 offer, count all non-deleted/rejected offers)
--              and adds edit_count column for tracking edits (enforced at API layer)
-- Date: 2026-01-28 00:00:00 UTC

-- Add edit_count column to business_offers
ALTER TABLE public.business_offers
ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.business_offers.edit_count IS
  'Tracks number of owner edits for claimed_free tier. Max 1 edit allowed. Admin updates do not increment this. Enforced at API layer.';

-- Update the check_offer_limit function to handle claimed_free status
CREATE OR REPLACE FUNCTION check_offer_limit()
RETURNS TRIGGER AS $$
DECLARE
  business_plan text;
  business_status text;
  current_offer_count integer;
  max_offers integer;
BEGIN
  -- Get business plan, status, and current offer count
  -- CRITICAL: Count all non-rejected offers (pending, approved, expired)
  -- Note: 'deleted' is not a valid status in business_offers schema
  SELECT 
    bp.subscription_plan,
    bp.status,
    COUNT(bo.id)
  INTO business_plan, business_status, current_offer_count
  FROM public.business_profiles bp
  LEFT JOIN public.business_offers bo 
    ON bp.id = bo.business_id 
    AND bo.status != 'rejected'  -- Count pending, approved, expired (prevent circumvention)
  WHERE bp.id = NEW.business_id
  GROUP BY bp.subscription_plan, bp.status;
  
  -- Handle claimed_free status (max 1 offer, regardless of plan)
  IF business_status = 'claimed_free' THEN
    max_offers := 1;
  ELSE
    -- Correct plan-based limits
    CASE business_plan
      WHEN 'starter' THEN max_offers := 3;
      WHEN 'featured' THEN max_offers := 5;
      WHEN 'spotlight' THEN max_offers := 999; -- Unlimited
      ELSE max_offers := 3; -- Default to starter
    END CASE;
  END IF;
  
  -- Check if adding this offer would exceed the limit
  IF current_offer_count >= max_offers THEN
    IF business_status = 'claimed_free' THEN
      RAISE EXCEPTION 'Offer limit exceeded. Free tier allows maximum 1 offer. Upgrade for more offers.';
    ELSE
      RAISE EXCEPTION 'Offer limit exceeded. % tier allows maximum % offer(s)', 
        business_plan, max_offers;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from previous migration, no need to recreate
-- The updated function will be used automatically

-- Add comment explaining the edit_count enforcement
COMMENT ON FUNCTION check_offer_limit() IS 
  'Enforces offer count limits based on business tier and status. 
   claimed_free: max 1 offer (any status except deleted/rejected).
   Starter: max 1 approved offer.
   Featured: max 3 approved offers.
   Spotlight: unlimited approved offers.
   Edit limit (1 edit for claimed_free) is enforced at API layer, not in DB.';
