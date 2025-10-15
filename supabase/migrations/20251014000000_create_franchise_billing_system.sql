-- Migration: Extend Franchise CRM Configs with Billing System
-- Description: Adds franchise-specific pricing, currency, Stripe integration, and customizable pricing cards
-- Date: 2025-10-14 00:00:00 UTC

-- ============================================================================
-- EXTEND EXISTING FRANCHISE_CRM_CONFIGS TABLE
-- ============================================================================

-- Add billing and currency columns
ALTER TABLE public.franchise_crm_configs 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP',
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(5) DEFAULT '£',
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.20, -- 20% VAT for UK
ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50) DEFAULT 'VAT',

-- Stripe Integration
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255), -- Stripe Connect Account ID
ADD COLUMN IF NOT EXISTS stripe_publishable_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_webhook_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,

-- Business Settings
ADD COLUMN IF NOT EXISTS business_registration VARCHAR(100), -- Company registration number
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),

-- WYSIWYG Pricing Card Customization (JSON for flexibility)
ADD COLUMN IF NOT EXISTS pricing_cards JSONB DEFAULT '{
  "starter": {
    "title": "Starter Plan",
    "subtitle": "Perfect for new businesses",
    "price": 29.99,
    "annual_price": 299.99,
    "features": [
      "1 Active Offer",
      "Basic Analytics", 
      "Email Support",
      "Mobile Wallet Integration"
    ],
    "cta_text": "Get Started",
    "popular": false,
    "color_scheme": "slate"
  },
  "featured": {
    "title": "Featured Business", 
    "subtitle": "Most popular choice",
    "price": 79.99,
    "annual_price": 799.99,
    "features": [
      "3 Active Offers",
      "Advanced Analytics",
      "Priority Support", 
      "Custom Branding",
      "Social Media Integration"
    ],
    "cta_text": "Go Featured",
    "popular": true,
    "color_scheme": "blue"
  },
  "spotlight": {
    "title": "Spotlight Premium",
    "subtitle": "Maximum visibility",
    "price": 149.99,
    "annual_price": 1499.99,
    "features": [
      "Unlimited Offers",
      "Premium Analytics",
      "24/7 Priority Support",
      "Full Custom Branding",
      "API Access",
      "Dedicated Account Manager"
    ],
    "cta_text": "Go Premium",
    "popular": false,
    "color_scheme": "gold"
  }
}'::jsonb,

-- Platform Revenue Share
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,4) DEFAULT 0.10; -- 10% platform fee

-- ============================================================================
-- FRANCHISE PRICING TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.franchise_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_city VARCHAR(50) REFERENCES public.franchise_crm_configs(city) ON DELETE CASCADE,
  
  -- Tier Configuration
  tier_name VARCHAR(50) NOT NULL, -- 'starter', 'featured', 'spotlight'
  tier_display_name VARCHAR(100) NOT NULL, -- 'Starter Plan', 'Featured Business', 'Spotlight Premium'
  
  -- Pricing (in local currency)
  monthly_price DECIMAL(10,2) NOT NULL,
  annual_price DECIMAL(10,2), -- Optional annual discount
  setup_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Features
  max_offers INTEGER DEFAULT 1,
  max_images INTEGER DEFAULT 3,
  max_menu_items INTEGER DEFAULT 10,
  includes_analytics BOOLEAN DEFAULT false,
  includes_priority_support BOOLEAN DEFAULT false,
  includes_custom_branding BOOLEAN DEFAULT false,
  
  -- Stripe Integration
  stripe_price_id_monthly VARCHAR(255), -- Stripe Price ID for monthly billing
  stripe_price_id_annual VARCHAR(255),  -- Stripe Price ID for annual billing
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique tier names per franchise
  UNIQUE(franchise_city, tier_name)
);

-- ============================================================================
-- FRANCHISE BILLING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.franchise_billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_city VARCHAR(50) REFERENCES public.franchise_crm_configs(city) ON DELETE CASCADE,
  
  -- Business Reference
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  
  -- Transaction Details
  transaction_type VARCHAR(50) NOT NULL, -- 'subscription', 'setup_fee', 'upgrade', 'refund'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Stripe Integration
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'card', 'bank_transfer', 'paypal'
  
  -- Metadata
  description TEXT,
  invoice_url TEXT,
  receipt_url TEXT,
  
  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES AND CONSTRAINTS
-- ============================================================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_franchise_pricing_tiers_city ON public.franchise_pricing_tiers(franchise_city);
CREATE INDEX IF NOT EXISTS idx_franchise_pricing_tiers_active ON public.franchise_pricing_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_franchise_billing_transactions_city ON public.franchise_billing_transactions(franchise_city);
CREATE INDEX IF NOT EXISTS idx_franchise_billing_transactions_business ON public.franchise_billing_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_franchise_billing_transactions_status ON public.franchise_billing_transactions(status);
CREATE INDEX IF NOT EXISTS idx_franchise_billing_transactions_date ON public.franchise_billing_transactions(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.franchise_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchise_billing_transactions ENABLE ROW LEVEL SECURITY;

-- Franchise pricing tiers policies
CREATE POLICY "Franchise admins can manage their pricing tiers"
ON public.franchise_pricing_tiers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.city_admins ca
    WHERE ca.id = auth.uid()
    AND ca.city = franchise_city
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.city_admins ca
    WHERE ca.id = auth.uid()
    AND ca.city = franchise_city
  )
);

-- Public can view active pricing tiers for their city
CREATE POLICY "Public can view active pricing tiers"
ON public.franchise_pricing_tiers
FOR SELECT
USING (
  is_active = true
  AND franchise_city = COALESCE(
    current_setting('app.current_city', true),
    'bournemouth'
  )
);

-- Billing transactions policies
CREATE POLICY "Franchise admins can view their billing transactions"
ON public.franchise_billing_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.city_admins ca
    WHERE ca.id = auth.uid()
    AND ca.city = franchise_city
  )
);

CREATE POLICY "System can insert billing transactions"
ON public.franchise_billing_transactions
FOR INSERT
WITH CHECK (true); -- Service role handles this

-- ============================================================================
-- DEFAULT PRICING TIERS
-- ============================================================================

-- Insert default pricing for Bournemouth (GBP)
INSERT INTO public.franchise_pricing_tiers (
  franchise_city, tier_name, tier_display_name, 
  monthly_price, annual_price, setup_fee,
  max_offers, max_images, max_menu_items,
  includes_analytics, includes_priority_support, includes_custom_branding
) VALUES 
-- Starter Plan
('bournemouth', 'starter', 'Starter Plan', 29.99, 299.99, 0, 1, 3, 10, false, false, false),
-- Featured Plan  
('bournemouth', 'featured', 'Featured Business', 79.99, 799.99, 0, 3, 10, 25, true, true, false),
-- Spotlight Plan
('bournemouth', 'spotlight', 'Spotlight Premium', 149.99, 1499.99, 0, 999, 20, 50, true, true, true)

ON CONFLICT (franchise_city, tier_name) DO NOTHING;

-- Insert default pricing for Calgary (CAD)
INSERT INTO public.franchise_pricing_tiers (
  franchise_city, tier_name, tier_display_name, 
  monthly_price, annual_price, setup_fee,
  max_offers, max_images, max_menu_items,
  includes_analytics, includes_priority_support, includes_custom_branding
) VALUES 
-- Starter Plan (CAD pricing)
('calgary', 'starter', 'Starter Plan', 39.99, 399.99, 0, 1, 3, 10, false, false, false),
-- Featured Plan  
('calgary', 'featured', 'Featured Business', 99.99, 999.99, 0, 3, 10, 25, true, true, false),
-- Spotlight Plan
('calgary', 'spotlight', 'Spotlight Premium', 199.99, 1999.99, 0, 999, 20, 50, true, true, true)

ON CONFLICT (franchise_city, tier_name) DO NOTHING;

-- ============================================================================
-- UPDATE EXISTING FRANCHISE CONFIGS WITH BILLING INFO
-- ============================================================================

-- Update Bournemouth with GBP settings and custom pricing
UPDATE public.franchise_crm_configs 
SET 
  currency = 'GBP',
  currency_symbol = '£',
  tax_rate = 0.20,
  tax_name = 'VAT',
  business_address = 'Bournemouth, UK',
  billing_email = 'bournemouth@qwikker.com',
  platform_fee_percentage = 0.10,
  pricing_cards = '{
    "starter": {
      "title": "Starter Plan",
      "subtitle": "Perfect for Bournemouth businesses",
      "price": 29.99,
      "annual_price": 299.99,
      "features": ["1 Active Offer", "Basic Analytics", "Email Support", "Mobile Wallet Integration"],
      "cta_text": "Start Today",
      "popular": false,
      "color_scheme": "slate"
    },
    "featured": {
      "title": "Featured Business", 
      "subtitle": "Most popular in Bournemouth",
      "price": 79.99,
      "annual_price": 799.99,
      "features": ["3 Active Offers", "Advanced Analytics", "Priority Support", "Custom Branding", "Social Media Integration"],
      "cta_text": "Go Featured",
      "popular": true,
      "color_scheme": "blue"
    },
    "spotlight": {
      "title": "Spotlight Premium",
      "subtitle": "Maximum Bournemouth visibility",
      "price": 149.99,
      "annual_price": 1499.99,
      "features": ["Unlimited Offers", "Premium Analytics", "24/7 Priority Support", "Full Custom Branding", "API Access", "Dedicated Account Manager"],
      "cta_text": "Go Premium",
      "popular": false,
      "color_scheme": "gold"
    }
  }'::jsonb
WHERE city = 'bournemouth';

-- Update Calgary with CAD settings and custom pricing
UPDATE public.franchise_crm_configs 
SET 
  currency = 'CAD',
  currency_symbol = '$',
  tax_rate = 0.05, -- 5% GST
  tax_name = 'GST',
  business_address = 'Calgary, AB, Canada',
  billing_email = 'calgary@qwikker.com',
  platform_fee_percentage = 0.12, -- Slightly higher for Canada
  pricing_cards = '{
    "starter": {
      "title": "Starter Plan",
      "subtitle": "Great for Calgary startups",
      "price": 39.99,
      "annual_price": 399.99,
      "features": ["1 Active Offer", "Basic Analytics", "Email Support", "Mobile Wallet Integration"],
      "cta_text": "Get Started",
      "popular": false,
      "color_scheme": "slate"
    },
    "featured": {
      "title": "Featured Business", 
      "subtitle": "Popular Calgary choice",
      "price": 99.99,
      "annual_price": 999.99,
      "features": ["3 Active Offers", "Advanced Analytics", "Priority Support", "Custom Branding", "Social Media Integration"],
      "cta_text": "Go Featured",
      "popular": true,
      "color_scheme": "blue"
    },
    "spotlight": {
      "title": "Spotlight Premium",
      "subtitle": "Dominate Calgary market",
      "price": 199.99,
      "annual_price": 1999.99,
      "features": ["Unlimited Offers", "Premium Analytics", "24/7 Priority Support", "Full Custom Branding", "API Access", "Dedicated Account Manager"],
      "cta_text": "Go Premium",
      "popular": false,
      "color_scheme": "gold"
    }
  }'::jsonb
WHERE city = 'calgary';

-- Update London with GBP settings and custom pricing
UPDATE public.franchise_crm_configs 
SET 
  currency = 'GBP',
  currency_symbol = '£',
  tax_rate = 0.20,
  tax_name = 'VAT',
  business_address = 'London, UK',
  billing_email = 'london@qwikker.com',
  platform_fee_percentage = 0.08, -- Lower fee for London
  pricing_cards = '{
    "starter": {
      "title": "London Starter",
      "subtitle": "Perfect for London businesses",
      "price": 35.99,
      "annual_price": 359.99,
      "features": ["1 Active Offer", "Basic Analytics", "Email Support", "Mobile Wallet Integration"],
      "cta_text": "Start in London",
      "popular": false,
      "color_scheme": "slate"
    },
    "featured": {
      "title": "London Featured", 
      "subtitle": "Stand out in London",
      "price": 89.99,
      "annual_price": 899.99,
      "features": ["3 Active Offers", "Advanced Analytics", "Priority Support", "Custom Branding", "Social Media Integration"],
      "cta_text": "Go Featured",
      "popular": true,
      "color_scheme": "blue"
    },
    "spotlight": {
      "title": "London Spotlight",
      "subtitle": "Premium London presence",
      "price": 169.99,
      "annual_price": 1699.99,
      "features": ["Unlimited Offers", "Premium Analytics", "24/7 Priority Support", "Full Custom Branding", "API Access", "Dedicated Account Manager"],
      "cta_text": "Go Premium",
      "popular": false,
      "color_scheme": "gold"
    }
  }'::jsonb
WHERE city = 'london';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to format currency for display
CREATE OR REPLACE FUNCTION format_franchise_currency(
  amount DECIMAL(10,2),
  franchise_city VARCHAR(50)
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get currency info for franchise
  SELECT currency_symbol, currency INTO config_record
  FROM public.franchise_crm_configs
  WHERE city = franchise_city;
  
  IF config_record IS NULL THEN
    RETURN '£' || amount::TEXT; -- Default to GBP
  END IF;
  
  -- Format based on currency
  CASE config_record.currency
    WHEN 'GBP' THEN
      RETURN config_record.currency_symbol || amount::TEXT;
    WHEN 'USD' THEN
      RETURN config_record.currency_symbol || amount::TEXT;
    WHEN 'CAD' THEN
      RETURN config_record.currency_symbol || amount::TEXT || ' CAD';
    WHEN 'EUR' THEN
      RETURN amount::TEXT || config_record.currency_symbol;
    ELSE
      RETURN config_record.currency_symbol || amount::TEXT;
  END CASE;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.franchise_pricing_tiers IS 'Franchise-specific pricing tiers with local currency and Stripe integration';
COMMENT ON TABLE public.franchise_billing_transactions IS 'Billing transaction history for franchise businesses';
COMMENT ON FUNCTION format_franchise_currency IS 'Formats currency amounts according to franchise locale';

-- Add comments to new columns
COMMENT ON COLUMN public.franchise_crm_configs.currency IS 'ISO 4217 currency code (GBP, USD, CAD, EUR)';
COMMENT ON COLUMN public.franchise_crm_configs.stripe_account_id IS 'Stripe Connect Account ID for this franchise';
COMMENT ON COLUMN public.franchise_crm_configs.tax_rate IS 'Local tax rate as decimal (0.20 = 20%)';
