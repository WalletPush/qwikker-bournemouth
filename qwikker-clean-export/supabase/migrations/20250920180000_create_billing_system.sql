-- Migration: Create comprehensive billing and subscription system
-- Description: Adds billing history, subscription tiers, free trial tracking, and CRM data
-- Date: 2025-09-20 18:00:00 UTC

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL, -- 'free', 'starter', 'growth', 'premium'
  tier_display_name TEXT NOT NULL, -- 'Free Trial', 'Starter Plan', etc.
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}', -- Features included in this tier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tiers (Qwikker's actual plans with real features)
INSERT INTO public.subscription_tiers (tier_name, tier_display_name, monthly_price, yearly_price, features) VALUES
('free', 'Free Trial', 0.00, 0.00, '{"trial_days": 120, "description": "120-day free trial of Featured plan"}'),
('starter', 'Starter', 29.00, 290.00, '{"ai_discovery_listings": true, "menu_service_indexing": true, "max_offers": 3, "social_media_welcome": true, "limited_secret_menu": true, "dashboard_support": true}'),
('featured', 'Featured', 59.00, 590.00, '{"all_starter_features": true, "priority_ai_placement": true, "advanced_menu_indexing": true, "max_offers": 5, "social_media_featuring": true, "full_secret_menu_club": true}'),
('spotlight', 'Spotlight', 89.00, 890.00, '{"all_featured_features": true, "white_label_loyalty": true, "advanced_ai_insights": true, "push_notifications": true, "analytics_qr_stands": true, "direct_ai_booking": true}')
ON CONFLICT DO NOTHING;

-- Create business_subscriptions table
CREATE TABLE IF NOT EXISTS public.business_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.subscription_tiers(id),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
  
  -- Free trial tracking
  free_trial_start_date TIMESTAMP WITH TIME ZONE,
  free_trial_end_date TIMESTAMP WITH TIME ZONE,
  is_in_free_trial BOOLEAN DEFAULT false,
  
  -- Subscription dates
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Pricing and discounts
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  discounted_price DECIMAL(10,2), -- Final price after discounts
  lifetime_discount_percent INTEGER DEFAULT 0, -- 20% lifetime discount for trial upgrades
  has_lifetime_discount BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended')) DEFAULT 'trial',
  
  -- Metadata
  upgraded_during_trial BOOLEAN DEFAULT false,
  original_approval_date TIMESTAMP WITH TIME ZONE, -- When business was first approved
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing_history table
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.business_subscriptions(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GBP',
  payment_method TEXT, -- 'card', 'bank_transfer', 'paypal', etc.
  
  -- Billing period
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  
  -- Status and metadata
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')) DEFAULT 'pending',
  payment_date TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  external_payment_id TEXT, -- Stripe/PayPal transaction ID
  
  -- Invoice details
  invoice_number TEXT,
  invoice_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add billing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES public.business_subscriptions(id),
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address JSONB, -- {"line1": "", "city": "", "postcode": "", "country": ""}
ADD COLUMN IF NOT EXISTS payment_method_on_file BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_business_id ON public.business_subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subscriptions_status ON public.business_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_business_id ON public.billing_history(business_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_payment_date ON public.billing_history(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_subscription ON public.profiles(current_subscription_id);

-- Create function to automatically set free trial dates when business is approved
CREATE OR REPLACE FUNCTION setup_free_trial_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'approved'
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    -- Get the free tier
    DECLARE
      free_tier_id UUID;
      trial_start_date TIMESTAMP WITH TIME ZONE := NOW();
      trial_end_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '120 days';
    BEGIN
      SELECT id INTO free_tier_id FROM public.subscription_tiers WHERE tier_name = 'free' LIMIT 1;
      
      -- Create free trial subscription
      INSERT INTO public.business_subscriptions (
        business_id,
        tier_id,
        free_trial_start_date,
        free_trial_end_date,
        is_in_free_trial,
        original_approval_date,
        status,
        base_price,
        discounted_price
      ) VALUES (
        NEW.id,
        free_tier_id,
        trial_start_date,
        trial_end_date,
        true,
        trial_start_date,
        'trial',
        0.00,
        0.00
      );
      
      -- Update profile with subscription reference
      UPDATE public.profiles 
      SET current_subscription_id = (
        SELECT id FROM public.business_subscriptions 
        WHERE business_id = NEW.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ),
      next_billing_date = trial_end_date
      WHERE id = NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic free trial setup
CREATE TRIGGER trigger_setup_free_trial_on_approval
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION setup_free_trial_on_approval();

-- Create function to update subscription updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription updates
CREATE TRIGGER update_business_subscriptions_updated_at
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Enable RLS on new tables
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_tiers (public read)
CREATE POLICY "Anyone can read subscription tiers" ON public.subscription_tiers
FOR SELECT USING (true);

-- RLS Policies for business_subscriptions
CREATE POLICY "Admins can manage all subscriptions" ON public.business_subscriptions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.city_admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.city_admins WHERE id = auth.uid())
);

CREATE POLICY "Business owners can read their subscription" ON public.business_subscriptions
FOR SELECT USING (
  business_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for billing_history
CREATE POLICY "Admins can manage all billing history" ON public.billing_history
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.city_admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.city_admins WHERE id = auth.uid())
);

CREATE POLICY "Business owners can read their billing history" ON public.billing_history
FOR SELECT USING (
  business_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Grant permissions
GRANT SELECT ON public.subscription_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_history TO service_role;
GRANT SELECT ON public.business_subscriptions TO authenticated;
GRANT SELECT ON public.billing_history TO authenticated;

-- Comments
COMMENT ON TABLE public.subscription_tiers IS 'Available subscription tiers and their pricing/features';
COMMENT ON TABLE public.business_subscriptions IS 'Individual business subscription records with trial and billing info';
COMMENT ON TABLE public.billing_history IS 'Payment history and invoice records for businesses';
COMMENT ON COLUMN public.business_subscriptions.lifetime_discount_percent IS '20% lifetime discount for businesses that upgrade during free trial';
COMMENT ON COLUMN public.business_subscriptions.upgraded_during_trial IS 'True if business upgraded to paid plan during 120-day free trial';
COMMENT ON FUNCTION setup_free_trial_on_approval() IS 'Automatically creates 120-day free trial subscription when business is approved';
