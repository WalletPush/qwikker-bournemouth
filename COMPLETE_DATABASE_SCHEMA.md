# QWIKKER Database Schema Overview

Generated from 83 migration files
================================================================================

## Tables Found: 43


### app_users
--------------------------------------------------------------------------------

**Modified in 3 migration(s):**

- 20250928170000_add_ghl_contact_id_to_app_users.sql
```sql
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT;
```

- 20250928180000_add_first_last_name_to_app_users.sql
```sql
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;
```

- 20250928190000_add_pass_type_id_to_app_users.sql
```sql
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS pass_type_identifier TEXT;
```

### billing_history
--------------------------------------------------------------------------------

**Created in:** 20250920180000_create_billing_system.sql

```sql
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
```

### business_changes
--------------------------------------------------------------------------------

**Created in:** 20250920120000_create_business_changes_table.sql

```sql
CREATE TABLE IF NOT EXISTS public.business_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('offer', 'secret_menu', 'business_images', 'business_info', 'menu_url')),
  change_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.city_admins(id),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Modified in 1 migration(s):**

- 20250928140000_fix_missing_columns.sql
```sql
ALTER TABLE business_changes 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
```

### business_events
--------------------------------------------------------------------------------

**Created in:** 20251110000000_create_business_events_system.sql

```sql
CREATE TABLE IF NOT EXISTS public.business_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Event details
  event_name text NOT NULL,
  event_type text CHECK (event_type IN (
    'live_music', 'workshop', 'tasting', 'special_occasion',
    'sports_viewing', 'quiz_night', 'comedy', 'open_mic',
    'themed_night', 'holiday_event', 'class', 'other'
  )) NOT NULL,
  event_description text NOT NULL,
  event_short_description text, -- Brief summary for cards/lists
  
  -- Timing
  event_date date NOT NULL,
  event_start_time time,
  event_end_time time,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern IN (
    'daily', 'weekly', 'biweekly', 'monthly', 'first_friday', 'last_saturday', null
  )),
  recurrence_end_date date,
  
  -- Booking/Registration
  requires_booking boolean DEFAULT false,
  booking_url text,
  booking_phone text,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  price_info text, -- "Free", "£10 per person", "£5-15 sliding scale"
  
  -- Media
  event_image text, -- URL to uploaded event image/poster
  
  -- Location (if different from business address)
  custom_location text,
  custom_address text,
  
  -- Status and approval
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  approved_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejected_reason text,
  cancellation_reason text,
  
  -- Display
  is_featured boolean DEFAULT false, -- Highlight this event
  display_order integer DEFAULT 1,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### business_locations
--------------------------------------------------------------------------------

**Created in:** 20250921140000_create_universal_qr_system.sql

```sql
CREATE TABLE business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address_full TEXT,
  city TEXT,
  postcode TEXT,
  location_accuracy TEXT CHECK (location_accuracy IN ('exact', 'approximate', 'city_center')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(business_id)
);
```

### business_offers
--------------------------------------------------------------------------------

**Created in:** 20250929200000_create_multiple_offers_system.sql

```sql
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
```

### business_profiles
--------------------------------------------------------------------------------

**Modified in 12 migration(s):**

- 20250115000000_add_features_column.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "social_wizard": false,
  "loyalty_cards": false,
  "analytics": false,
  "push_notifications": false
}'::jsonb;
```

- 20250921000000_add_ghl_sync_fields.sql
```sql
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS last_ghl_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS referral_source TEXT,
ADD COLUMN IF NOT EXISTS goals TEXT;
```

- 20250921160000_add_franchise_crm_system.sql
```sql
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS last_crm_sync TIMESTAMP WITH TIME ZONE;
```

- 20250921160000_add_franchise_crm_system.sql
```sql
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS crm_sync_status TEXT DEFAULT 'pending' CHECK (crm_sync_status IN ('pending', 'synced', 'failed', 'disabled'));
```

- 20250921160000_add_franchise_crm_system.sql
```sql
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS crm_contact_id TEXT;
```

- 20250928140000_fix_missing_columns.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS slug TEXT;
```

- 20250928160000_add_social_media_fields.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS website_url TEXT;
```

- 20250928160000_add_social_media_fields.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
```

- 20250928160000_add_social_media_fields.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS facebook_url TEXT;
```

- 20251029200000_add_image_transforms.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN business_image_transforms JSONB DEFAULT NULL;
```

- 20251029231235_add_image_transforms.sql
```sql
ALTER TABLE business_profiles 
        ADD COLUMN business_image_transforms JSONB DEFAULT NULL;
```

- 20251117010000_add_features_column_to_business_profiles.sql
```sql
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{
  "social_wizard": false,
  "loyalty_cards": false,
  "analytics": false,
  "push_notifications": false
}'::jsonb;
```

### business_qr_allocations
--------------------------------------------------------------------------------

**Created in:** 20250921131000_create_mass_qr_system.sql

```sql
CREATE TABLE business_qr_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  qr_code_id UUID REFERENCES qr_code_inventory(id) ON DELETE CASCADE,
  allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  allocated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL, -- admin who allocated
  promo_pack_batch TEXT, -- which promo pack batch this came from
  allocation_notes TEXT, -- notes about why this QR was allocated
  
  UNIQUE(qr_code_id) -- Each QR can only be allocated to one business
);
```

### business_qr_assignments
--------------------------------------------------------------------------------

**Created in:** 20250921140000_create_universal_qr_system.sql

```sql
CREATE TABLE business_qr_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  qr_type TEXT NOT NULL CHECK (qr_type IN ('explore', 'offers', 'secret')),
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assignment_notes TEXT,
  
  -- One business can have multiple QR types, but each type only once
  UNIQUE(business_id, qr_type)
);
```

### business_subscriptions
--------------------------------------------------------------------------------

**Created in:** 20250920180000_create_billing_system.sql

```sql
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
```

### city_admins
--------------------------------------------------------------------------------

**Created in:** 20250920110000_create_city_admins_table.sql

```sql
CREATE TABLE IF NOT EXISTS public.city_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL CHECK (city IN ('bournemouth', 'calgary', 'london', 'paris')),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### dedicated_qr_analytics
--------------------------------------------------------------------------------

**Created in:** 20250921150000_add_dedicated_qr_system.sql

```sql
CREATE TABLE dedicated_qr_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedicated_qr_id UUID REFERENCES dedicated_qr_codes(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Scan details
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID, -- if user is logged in
  session_id TEXT, -- anonymous session tracking
  
  -- Technical details
  user_agent TEXT,
  ip_address INET,
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  browser TEXT,
  operating_system TEXT,
  
  -- Location details
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_accuracy INTEGER, -- meters
  scan_location_type TEXT CHECK (scan_location_type IN ('in_venue', 'nearby', 'remote', 'social_media', 'unknown')),
  
  -- Engagement tracking
  time_on_page INTEGER, -- seconds
  pages_visited INTEGER,
  actions_taken JSONB, -- Array of actions: view_menu, claim_offer, etc.
  conversion_value DECIMAL(10,2), -- estimated value if conversion tracked
  
  -- Attribution
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### dedicated_qr_codes
--------------------------------------------------------------------------------

**Created in:** 20250921150000_add_dedicated_qr_system.sql

```sql
CREATE TABLE dedicated_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  qr_code_id TEXT NOT NULL UNIQUE, -- e.g., 'jerry-burgers-offers-001'
  qr_type TEXT NOT NULL CHECK (qr_type IN ('explore', 'offers', 'secret')),
  business_tier TEXT NOT NULL CHECK (business_tier = 'spotlight'),
  
  -- QR Code Design & Branding
  qr_design_type TEXT DEFAULT 'standard' CHECK (qr_design_type IN ('standard', 'logo_overlay', 'custom_design')),
  logo_url TEXT, -- Business logo for overlay
  custom_design_url TEXT, -- Custom QR design if uploaded
  background_color TEXT DEFAULT '#000000',
  foreground_color TEXT DEFAULT '#00d083',
  
  -- QR Code Physical Info
  print_format TEXT, -- '3x3 Window Sticker', '4x6 Table Tent', etc.
  print_quantity INTEGER DEFAULT 1,
  print_status TEXT DEFAULT 'not_printed' CHECK (print_status IN ('not_printed', 'print_ready', 'printed', 'distributed')),
  
  -- URLs and Routing
  direct_url TEXT NOT NULL, -- Direct URL this QR points to
  fallback_url TEXT, -- Fallback if direct routing fails
  
  -- Metadata
  generated_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Ensure one active QR per business per type
  UNIQUE(business_id, qr_type, is_active) DEFERRABLE INITIALLY DEFERRED
);
```

### franchise_billing_transactions
--------------------------------------------------------------------------------

**Created in:** 20251014000000_create_franchise_billing_system.sql

```sql
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
```

### franchise_crm_configs
--------------------------------------------------------------------------------

**Created in:** 20250920144931_create_franchise_crm_configs.sql

```sql
CREATE TABLE IF NOT EXISTS franchise_crm_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  subdomain VARCHAR(50) UNIQUE NOT NULL,
  
  -- GHL Integration
  ghl_webhook_url TEXT NOT NULL,
  ghl_update_webhook_url TEXT,
  
  -- Slack Integration  
  slack_webhook_url TEXT,
  slack_channel VARCHAR(100),
  
  -- Franchise Owner Details
  owner_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(100) NOT NULL,
  owner_phone VARCHAR(20),
  
  -- System Settings
  timezone VARCHAR(50) DEFAULT 'UTC',
  status VARCHAR(20) DEFAULT 'active',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Modified in 3 migration(s):**

- 20250928000000_add_walletpush_to_franchise_configs.sql
```sql
ALTER TABLE franchise_crm_configs 
ADD COLUMN walletpush_api_key TEXT,
ADD COLUMN walletpush_template_id TEXT,
ADD COLUMN walletpush_endpoint_url TEXT;
```

- 20251014000000_create_franchise_billing_system.sql
```sql
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
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,4) DEFAULT 0.10;
```

- 20251117030000_add_franchise_api_services.sql
```sql
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS resend_api_key TEXT,
ADD COLUMN IF NOT EXISTS resend_from_email TEXT,
ADD COLUMN IF NOT EXISTS resend_from_name TEXT,
ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;
```

### franchise_crm_sync_logs
--------------------------------------------------------------------------------

**Created in:** 20250921160000_add_franchise_crm_system.sql

```sql
CREATE TABLE franchise_crm_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Information
  business_name TEXT NOT NULL,
  business_email TEXT NOT NULL,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Franchise Information
  franchise_city TEXT NOT NULL,
  franchise_owner TEXT NOT NULL,
  franchise_config_id UUID REFERENCES franchise_crm_configs(id) ON DELETE SET NULL,
  
  -- Sync Details
  sync_type TEXT DEFAULT 'business_signup' CHECK (sync_type IN ('business_signup', 'business_update', 'status_change', 'manual_sync')),
  sync_results JSONB NOT NULL, -- Array of service results
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Data Synced
  business_data JSONB,
  
  -- Success/Failure Tracking
  overall_success BOOLEAN GENERATED ALWAYS AS (
    (sync_results->0->>'status' = 'success') OR 
    (jsonb_array_length(sync_results) > 1 AND sync_results->1->>'status' = 'success')
  ) STORED,
  
  -- Error Details
  error_details TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### franchise_pricing_tiers
--------------------------------------------------------------------------------

**Created in:** 20251014000000_create_franchise_billing_system.sql

```sql
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
```

### franchise_territories
--------------------------------------------------------------------------------

**Created in:** 20250928150000_create_franchise_geography_system.sql

```sql
CREATE TABLE IF NOT EXISTS franchise_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Franchise identification
  franchise_code TEXT UNIQUE NOT NULL, -- 'bournemouth', 'calgary', 'london'
  franchise_name TEXT NOT NULL, -- 'Bournemouth & Poole', 'Calgary Metro', 'Greater London'
  
  -- Geographic boundaries
  country TEXT NOT NULL, -- 'UK', 'Canada', 'France'
  region TEXT, -- 'Dorset', 'Alberta', 'England'
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  launch_date DATE,
  
  -- Contact & settings
  primary_contact_email TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'GBP'
);
```

### geographic_areas
--------------------------------------------------------------------------------

**Created in:** 20250928150000_create_franchise_geography_system.sql

```sql
CREATE TABLE IF NOT EXISTS geographic_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Geographic identification
  area_name TEXT NOT NULL, -- 'Bournemouth', 'Christchurch', 'Poole', 'Beltline', 'Kensington'
  area_type TEXT NOT NULL, -- 'city', 'neighborhood', 'district', 'borough'
  
  -- Franchise relationship
  franchise_territory_id UUID REFERENCES franchise_territories(id) ON DELETE CASCADE,
  
  -- Geographic data
  country TEXT NOT NULL,
  region TEXT,
  postal_code_prefix TEXT, -- 'BH', 'T2', 'SW1'
  
  -- Google Places integration
  google_place_id TEXT, -- For Google Places API integration
  google_types TEXT[], -- ['locality', 'political'] from Google Places
  
  -- Coordinates (for future geofencing)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Status
  is_active BOOLEAN DEFAULT true
);
```

### intent_queue
--------------------------------------------------------------------------------

**Created in:** 20250921120000_create_qr_code_system.sql

```sql
CREATE TABLE intent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL, -- email, phone, or temporary session ID
  intent_type TEXT NOT NULL CHECK (intent_type IN ('explore', 'offers', 'secret_menu', 'general')),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  target_content_id UUID, -- specific offer or secret menu item
  qr_code_id UUID REFERENCES qr_code_templates(id) ON DELETE CASCADE,
  payload JSONB, -- additional data for the intent
  is_processed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### knowledge_base
--------------------------------------------------------------------------------

**Created in:** 20250920130000_create_knowledge_base_table.sql

```sql
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL, -- City this knowledge belongs to (bournemouth, calgary, etc.)
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE, -- NULL for general city knowledge
  knowledge_type TEXT NOT NULL CHECK (knowledge_type IN ('web_scrape', 'pdf_document', 'event', 'news_article', 'custom_knowledge')),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Extracted/processed text content
  source_url TEXT, -- Original URL for web scrapes
  file_url TEXT, -- File URL for PDFs or images
  metadata JSONB, -- Additional structured data (dates, categories, etc.)
  tags TEXT[], -- Searchable tags for categorization
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
  created_by UUID REFERENCES public.city_admins(id), -- Admin who added this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Modified in 2 migration(s):**

- 20251008000000_enable_vector_embeddings.sql
```sql
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(1536);
```

- 20251008115816_apply_vector_embeddings_only.sql
```sql
ALTER TABLE public.knowledge_base 
        ADD COLUMN embedding vector(1536);
```

### menus
--------------------------------------------------------------------------------

**Created in:** 20251029183542_create_multiple_menus_system.sql

```sql
create table if not exists public.menus (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.business_profiles(id) on delete cascade not null,
  
  -- Menu information
  menu_name text not null, -- e.g., "Main Menu", "Drinks Menu", "Desserts", "Specials"
  menu_type text not null check (menu_type in (
    'main_menu', 'drinks', 'desserts', 'specials', 'breakfast', 
    'lunch', 'dinner', 'wine_list', 'cocktails', 'services', 'other'
  )),
  menu_url text not null, -- cloudinary url to the PDF file
  
  -- Approval workflow
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  admin_notes text, -- admin feedback during review
  approved_by uuid references auth.users(id), -- admin who approved
  approved_at timestamp with time zone,
  
  -- Metadata
  file_size bigint, -- file size in bytes for tracking
  original_filename text, -- original filename when uploaded
  uploaded_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### points_transactions
--------------------------------------------------------------------------------

**Created in:** 20250920191000_create_user_activity_tables.sql

```sql
create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  
  -- Transaction details
  type text not null check (type in ('earned', 'spent')),
  amount integer not null check (amount > 0),
  reason text not null check (reason in (
    'business_visit', 'secret_unlock', 'offer_redeem', 'friend_referral',
    'review_write', 'photo_share', 'chat_engagement', 'daily_login',
    'badge_unlock', 'streak_bonus', 'first_visit', 'social_share'
  )),
  description text not null,
  
  -- Related item (business, offer, etc.)
  related_item_type text check (related_item_type in ('business', 'offer', 'secret_item', 'badge')),
  related_item_id text,
  related_item_name text,
  
  -- Metadata
  created_at timestamptz not null default now()
);
```

### profiles
--------------------------------------------------------------------------------

**Created in:** 20250915180000_create_profiles_table.sql

```sql
create table if not exists public.profiles (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Personal information
  first_name text,
  last_name text,
  email text, -- copied from auth.users on creation
  phone text,
  
  -- Marketing and goals
  referral_source text check (referral_source in (
    'google_search', 'social_media', 'word_of_mouth', 
    'advertising', 'partner_referral', 'other'
  )),
  goals text check (goals in (
    'increase_customers', 'improve_marketing', 'boost_sales',
    'build_brand_awareness', 'customer_retention', 'expand_business', 'other'
  )),
  notes text,
  
  -- Business information
  business_name text,
  business_type text check (business_type in (
    'bar', 'cafe', 'restaurant', 'salon', 'spa', 'gym', 
    'retail_shop', 'hotel', 'service_business', 'other'
  )),
  business_category text,
  business_address text,
  business_town text check (business_town in (
    'bournemouth', 'poole', 'christchurch', 'wimborne',
    'ferndown', 'ringwood', 'new_milton', 'other'
  )),
  business_postcode text,
  
  -- Online presence
  website_url text,
  instagram_handle text,
  facebook_url text,
  logo text, -- url to uploaded logo file
  
  -- Offer data
  offer_name text,
  offer_type text check (offer_type in (
    'discount', 'two_for_one', 'freebie', 'buy_x_get_y',
    'percentage_off', 'fixed_amount_off', 'other'
  )),
  offer_value text, -- e.g., "20% off", "Buy 2 get 1 free"
  offer_claim_amount text check (offer_claim_amount in (
    'first_10', 'first_25', 'first_50', 'first_100', 'unlimited', 'custom'
  )),
  offer_start_date date,
  offer_end_date date,
  offer_terms text,
  offer_image text, -- url to uploaded offer image file
  
  -- Plan and billing
  plan text not null default 'starter' check (plan in ('starter', 'spotlight', 'pro')),
  trial_expiry timestamptz default (now() + interval '120 days'), -- 120 days trial from signup
  is_founder boolean not null default false, -- gets 20% lifetime discount if signed up before cutoff
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Modified in 21 migration(s):**

- 20250915210000_add_missing_profile_columns.sql
```sql
alter table public.profiles 
add column if not exists menu_url text;
```

- 20250915210000_add_missing_profile_columns.sql
```sql
alter table public.profiles 
add column if not exists additional_notes text;
```

- 20250916010000_create_referrals_system.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
```

- 20250916010000_create_referrals_system.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'incomplete' 
CHECK (status IN ('incomplete', 'pending_review', 'approved', 'rejected'));
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_hours TEXT;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_tier TEXT DEFAULT 'recommended'
CHECK (business_tier IN ('qwikker_picks', 'featured', 'recommended'));
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_tagline TEXT;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_description TEXT;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_images TEXT[];
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS menu_preview TEXT[];
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0.0;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

- 20250918000000_add_status_and_business_fields.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;
```

- 20250918000001_update_menu_preview_to_jsonb.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN menu_preview JSONB DEFAULT '[]'::jsonb;
```

- 20250920100000_add_city_column_safe.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'bournemouth' NOT NULL;
```

- 20250920170000_restructure_business_hours.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_hours_structured JSONB;
```

- 20250920180000_create_billing_system.sql
```sql
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES public.business_subscriptions(id),
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address JSONB, -- {"line1": "", "city": "", "postcode": "", "country": ""}
ADD COLUMN IF NOT EXISTS payment_method_on_file BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP WITH TIME ZONE;
```

### push_subscriptions
--------------------------------------------------------------------------------

**Created in:** 20250921010000_create_push_subscriptions_table.sql

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### qr_code_analytics
--------------------------------------------------------------------------------

**Created in:** 20250921120000_create_qr_code_system.sql

```sql
CREATE TABLE qr_code_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_code_templates(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID, -- if user is logged in
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  city TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  conversion_type TEXT, -- 'new_user', 'existing_user', 'bounce'
  target_reached BOOLEAN DEFAULT false, -- did they reach the intended content?
  session_duration INTEGER, -- seconds spent on site after scan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### qr_code_assignments
--------------------------------------------------------------------------------

**Created in:** 20250921120000_create_qr_code_system.sql

```sql
CREATE TABLE qr_code_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_code_templates(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL, -- admin who assigned it
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('explore', 'offers', 'secret_menu', 'general')),
  target_content_id UUID, -- optional: specific offer_id or secret_menu_id
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- optional expiry
  notes TEXT, -- admin notes about the assignment
  
  -- Ensure one QR code can only be assigned to one business at a time (per type)
  UNIQUE(qr_code_id, assignment_type)
);
```

### qr_code_inventory
--------------------------------------------------------------------------------

**Created in:** 20250921131000_create_mass_qr_system.sql

```sql
CREATE TABLE qr_code_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT NOT NULL UNIQUE, -- e.g., 'WIN001', 'OFF001', 'SEC001'
  qr_type TEXT NOT NULL CHECK (qr_type IN ('window_sticker', 'offers', 'secret_menu')),
  city TEXT NOT NULL DEFAULT 'bournemouth',
  print_batch TEXT, -- e.g., 'BATCH_2024_01', for tracking print runs
  physical_format TEXT, -- e.g., 'Window Sticker 3x3"', 'Table Tent', 'Flyer'
  is_distributed BOOLEAN DEFAULT false, -- Has this QR been given to a business?
  is_assigned BOOLEAN DEFAULT false, -- Has this QR been assigned in admin?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  distributed_at TIMESTAMP WITH TIME ZONE, -- When given to business
  notes TEXT -- Admin notes about this QR code
);
```

### qr_code_scans
--------------------------------------------------------------------------------

**Created in:** 20250928120000_create_real_qr_system.sql

```sql
CREATE TABLE IF NOT EXISTS public.qr_code_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- QR Code Reference
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE NOT NULL,
  qr_code TEXT NOT NULL, -- Denormalized for faster queries
  
  -- Scan Details
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  user_agent TEXT,
  ip_address INET,
  city TEXT,
  
  -- User Information (if available)
  user_id UUID REFERENCES public.user_members(id) ON DELETE SET NULL,
  wallet_pass_id TEXT,
  
  -- Scan Context
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Geographic Data
  country TEXT,
  region TEXT,
  
  -- Device Information
  device_type TEXT, -- mobile, desktop, tablet
  browser TEXT,
  os TEXT
);
```

### qr_code_templates
--------------------------------------------------------------------------------

**Created in:** 20250921120000_create_qr_code_system.sql

```sql
CREATE TABLE qr_code_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name TEXT NOT NULL UNIQUE, -- e.g., 'explore-bournemouth-001', 'offers-table-tent-002'
  qr_type TEXT NOT NULL CHECK (qr_type IN ('explore', 'offers', 'secret_menu', 'general')),
  city TEXT NOT NULL DEFAULT 'bournemouth',
  physical_location TEXT, -- e.g., 'Table Tent', 'Window Sticker', 'Flyer'
  base_url TEXT NOT NULL, -- e.g., 'https://bournemouth.qwikker.com/intent/'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Modified in 6 migration(s):**

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN qr_category TEXT CHECK (qr_category IN ('qwikker-marketing', 'static-business', 'dynamic-business'));
```

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN qr_subtype TEXT;
```

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN business_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL;
```

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN business_name TEXT;
```

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN logo_url TEXT;
```

- 20250921130000_update_qr_code_system.sql
```sql
ALTER TABLE qr_code_templates 
ADD COLUMN qr_code_url TEXT;
```

### qr_codes
--------------------------------------------------------------------------------

**Created in:** 20250928120000_create_real_qr_system.sql

```sql
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- QR Code Identity
  qr_code TEXT UNIQUE NOT NULL, -- The actual QR code identifier (e.g., QWK-MKT-001)
  qr_type TEXT NOT NULL CHECK (qr_type IN ('marketing', 'business_static', 'business_dynamic')),
  
  -- QR Code Details
  name TEXT NOT NULL, -- Human readable name
  description TEXT,
  category TEXT NOT NULL, -- flyers, leaflets, window_stickers, offers, secret_menus, etc.
  
  -- Target Configuration
  current_target_url TEXT NOT NULL, -- Where this QR currently redirects
  default_target_url TEXT NOT NULL, -- Fallback URL
  
  -- Business Association (for business QR codes)
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  
  -- Print Information
  printed_at TIMESTAMP WITH TIME ZONE,
  print_batch_id TEXT,
  physical_location TEXT, -- Where this QR is physically placed
  
  -- Analytics
  total_scans INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMP WITH TIME ZONE
);
```

### qr_print_orders
--------------------------------------------------------------------------------

**Created in:** 20250921150000_add_dedicated_qr_system.sql

```sql
CREATE TABLE qr_print_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('initial_set', 'replacement', 'additional')),
  
  -- QR Codes in this order
  qr_codes JSONB NOT NULL, -- Array of QR code IDs and their print specs
  
  -- Print specifications
  total_quantity INTEGER NOT NULL,
  print_format_breakdown JSONB, -- Count per format type
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Order status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'printing', 'completed', 'cancelled')),
  ordered_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery info
  delivery_address TEXT,
  delivery_instructions TEXT,
  tracking_number TEXT,
  
  notes TEXT
);
```

### referrals
--------------------------------------------------------------------------------

**Created in:** 20250916010000_create_referrals_system.sql

```sql
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'credited', 'rejected')),
  reward_amount DECIMAL(10,2) DEFAULT 10.00,
  reward_currency TEXT DEFAULT 'GBP',
  conversion_date TIMESTAMPTZ DEFAULT NOW(),
  credited_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### short_urls
--------------------------------------------------------------------------------

**Created in:** 20250927120000_create_short_urls.sql

```sql
CREATE TABLE IF NOT EXISTS short_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_id VARCHAR(10) UNIQUE NOT NULL,
    target_url TEXT NOT NULL,
    user_id VARCHAR(255), -- wallet_pass_id from user_members
    url_type VARCHAR(50) NOT NULL, -- 'offers', 'chat', 'dashboard'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);
```

### subscription_tiers
--------------------------------------------------------------------------------

**Created in:** 20250920180000_create_billing_system.sql

```sql
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
```

### universal_qr_analytics
--------------------------------------------------------------------------------

**Created in:** 20250921140000_create_universal_qr_system.sql

```sql
CREATE TABLE universal_qr_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_type TEXT NOT NULL CHECK (qr_type IN ('explore', 'offers', 'secret')),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE, -- null if no business selected
  user_id UUID, -- if user is logged in
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  location_lat DECIMAL(10, 8), -- GPS coordinates if available
  location_lng DECIMAL(11, 8),
  city TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet')),
  routing_method TEXT CHECK (routing_method IN ('gps_auto', 'business_selection', 'single_option', 'no_business')),
  scan_result TEXT CHECK (scan_result IN ('business_found', 'business_selected', 'no_business_available', 'error')),
  session_duration INTEGER, -- seconds spent after scan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### url_clicks
--------------------------------------------------------------------------------

**Created in:** 20250927120000_create_short_urls.sql

```sql
CREATE TABLE IF NOT EXISTS url_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    short_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(255),
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    ip_address VARCHAR(45),
    FOREIGN KEY (short_id) REFERENCES short_urls(short_id)
);
```

### user_business_visits
--------------------------------------------------------------------------------

**Created in:** 20250920191000_create_user_activity_tables.sql

```sql
create table if not exists public.user_business_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Visit details
  visit_date timestamptz not null default now(),
  points_earned integer default 0,
  is_first_visit boolean not null default false,
  
  -- Optional data
  review_rating integer check (review_rating between 1 and 5),
  review_text text,
  photos_shared text[] default array[]::text[], -- URLs to uploaded photos
  
  -- Metadata
  created_at timestamptz not null default now()
);
```

### user_members
--------------------------------------------------------------------------------

**Created in:** 20250920190000_create_user_members_table.sql

```sql
create table if not exists public.user_members (
  -- Primary identification
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  
  -- Basic profile information
  name text,
  email text, -- copied from auth.users on creation
  phone text,
  joined_date timestamptz not null default now(),
  
  -- Location and preferences
  city text not null default 'bournemouth' check (city in (
    'bournemouth', 'poole', 'christchurch', 'wimborne',
    'ferndown', 'ringwood', 'new_milton', 'other'
  )),
  preferred_categories text[] default array[]::text[], -- ['Restaurant', 'Cafe', 'Bar']
  dietary_restrictions text[] default array[]::text[], -- ['vegetarian', 'vegan', 'gluten_free', 'halal']
  preferred_radius_miles integer default 3 check (preferred_radius_miles > 0),
  
  -- Gamification system
  total_points integer not null default 0,
  level integer not null default 1,
  experience_points integer not null default 0,
  tier text not null default 'explorer' check (tier in ('explorer', 'insider', 'legend')),
  
  -- User statistics (JSONB for flexibility)
  stats jsonb not null default '{
    "businessesVisited": 0,
    "secretItemsUnlocked": 0,
    "offersRedeemed": 0,
    "friendsReferred": 0,
    "reviewsWritten": 0,
    "photosShared": 0,
    "chatMessages": 0,
    "streakDays": 0
  }'::jsonb,
  
  -- Badges system (JSONB array)
  badges jsonb not null default '[]'::jsonb,
  
  -- Referral system
  referral_code text unique not null,
  referred_by text, -- referral_code of the user who referred them
  
  -- Wallet pass system
  wallet_pass_id text unique, -- unique identifier for Apple/Google Wallet pass
  wallet_pass_assigned_at timestamptz,
  wallet_pass_status text default 'pending' check (wallet_pass_status in (
    'pending', 'assigned', 'active', 'expired', 'revoked'
  )),
  
  -- Notification preferences (JSONB)
  notification_preferences jsonb not null default '{
    "geoOffers": true,
    "newBusinesses": true,
    "secretMenus": false,
    "weeklyDigest": true,
    "sms": false
  }'::jsonb,
  
  -- Profile completion and onboarding
  profile_completion_percentage integer not null default 0 check (profile_completion_percentage between 0 and 100),
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  
  -- Activity tracking
  last_active_at timestamptz default now(),
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### user_offer_claims
--------------------------------------------------------------------------------

**Created in:** 20250920191000_create_user_activity_tables.sql

```sql
create table if not exists public.user_offer_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Offer details
  offer_name text not null,
  offer_type text not null,
  offer_value text not null,
  
  -- Claim details
  claimed_at timestamptz not null default now(),
  redeemed_at timestamptz,
  points_earned integer default 0,
  
  -- Status
  status text not null default 'claimed' check (status in ('claimed', 'redeemed', 'expired')),
  
  -- Metadata
  created_at timestamptz not null default now()
);
```

### user_saved_items
--------------------------------------------------------------------------------

**Created in:** 20251201000000_create_user_saved_items.sql

```sql
CREATE TABLE IF NOT EXISTS user_saved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(user_id) ON DELETE CASCADE,
  wallet_pass_id text NOT NULL, -- For quick lookups
  item_type text NOT NULL, -- 'business', 'event', 'offer', 'secret_menu'
  item_id text NOT NULL, -- ID of the saved item
  item_name text, -- Optional: Cache the name for display
  saved_at timestamptz DEFAULT now(),
  
  -- Ensure user can't save same item twice
  UNIQUE(wallet_pass_id, item_type, item_id)
);
```

### user_secret_unlocks
--------------------------------------------------------------------------------

**Created in:** 20250920191000_create_user_activity_tables.sql

```sql
create table if not exists public.user_secret_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_members(user_id) on delete cascade not null,
  business_id uuid references public.profiles(id) on delete cascade not null,
  
  -- Secret item details
  secret_item_name text not null,
  secret_item_description text,
  secret_item_price text,
  
  -- Unlock details
  unlocked_at timestamptz not null default now(),
  unlock_method text not null check (unlock_method in ('points', 'visit', 'social', 'achievement')),
  points_spent integer default 0,
  points_earned integer default 0,
  
  -- Metadata
  created_at timestamptz not null default now(),
  
  -- Prevent duplicate unlocks
  unique(user_id, business_id, secret_item_name)
);
```

### user_shortlinks
--------------------------------------------------------------------------------

**Created in:** 20250929210000_create_bulletproof_shortlink_system.sql

```sql
CREATE TABLE IF NOT EXISTS public.user_shortlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Shortlink identification
  shortlink_code text UNIQUE NOT NULL, -- e.g., 'TeGzzG', 'HmWAwx'
  domain text NOT NULL DEFAULT 's.qwikker.com', -- Shortlink domain
  
  -- User identification
  wallet_pass_id text NOT NULL,
  franchise_city text NOT NULL, -- 'bournemouth', 'calgary', etc.
  
  -- Link configuration
  link_type text NOT NULL CHECK (link_type IN ('chat', 'offers', 'dashboard')),
  destination_url text NOT NULL, -- Full URL to redirect to
  
  -- Metadata
  title text, -- For social sharing
  utm_source text DEFAULT 'shortlink',
  utm_medium text DEFAULT 'wallet_pass',
  utm_campaign text,
  
  -- Status and analytics
  is_active boolean DEFAULT true,
  access_count integer DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

================================================================================
END OF SCHEMA
