-- Migration: Create referrals system
-- Description: Creates referrals table and adds referral_code to profiles
-- Date: 2025-09-16 01:00:00 UTC

-- Add referral_code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by to profiles table to track who referred this user
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'credited', 'rejected')),
  reward_amount DECIMAL(10,2) DEFAULT 50.00,
  reward_currency TEXT DEFAULT 'GBP',
  conversion_date TIMESTAMPTZ DEFAULT NOW(),
  credited_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 8-character code: business name prefix + random
    code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.profiles 
    WHERE referral_code = code;
    
    -- Exit loop if code is unique
    IF exists_check = 0 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate referral codes for new profiles
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if referral_code is null
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new profiles
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Create function to handle referral tracking
CREATE OR REPLACE FUNCTION track_referral(referral_code_param TEXT, new_user_id UUID)
RETURNS VOID AS $$
DECLARE
  referrer_profile_id UUID;
BEGIN
  -- Find the referrer by referral code
  SELECT id INTO referrer_profile_id
  FROM public.profiles
  WHERE referral_code = referral_code_param;
  
  -- If referrer found and it's not self-referral
  IF referrer_profile_id IS NOT NULL AND referrer_profile_id != new_user_id THEN
    -- Update the new user's referred_by field
    UPDATE public.profiles
    SET referred_by = referrer_profile_id
    WHERE id = new_user_id;
    
    -- Create referral tracking record
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code,
      status,
      reward_amount
    ) VALUES (
      referrer_profile_id,
      new_user_id,
      referral_code_param,
      'pending',
      50.00
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (as referrer or referred)
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (
    referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR referred_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Users can insert referrals (handled by functions mainly)
CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (
    referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Only allow updates to certain fields by referrer
CREATE POLICY "Referrers can update their referrals" ON public.referrals
  FOR UPDATE USING (
    referrer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Add comments for documentation
COMMENT ON TABLE public.referrals IS 'Tracks referral relationships and rewards between users';
COMMENT ON COLUMN public.referrals.status IS 'Referral status: pending (signed up), approved (active user), credited (reward given), rejected';
COMMENT ON COLUMN public.referrals.reward_amount IS 'Amount of reward for successful referral';
COMMENT ON FUNCTION generate_referral_code() IS 'Generates unique 8-character referral codes';
COMMENT ON FUNCTION track_referral(TEXT, UUID) IS 'Creates referral tracking when new user signs up with referral code';
