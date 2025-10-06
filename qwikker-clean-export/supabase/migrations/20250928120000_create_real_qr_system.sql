-- Real QR Code System Migration
-- This replaces all mock data with actual trackable QR codes

-- QR Code Templates (the base QR codes that can be printed)
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

-- QR Code Scans (individual scan tracking)
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

-- QR Code Analytics Summary (for faster queries)
CREATE TABLE IF NOT EXISTS public.qr_code_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- QR Code Reference
  qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE NOT NULL,
  qr_code TEXT NOT NULL,
  
  -- Time Period
  date DATE NOT NULL, -- Analytics are aggregated by day
  
  -- Scan Metrics
  total_scans INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  
  -- Device Breakdown
  mobile_scans INTEGER DEFAULT 0,
  desktop_scans INTEGER DEFAULT 0,
  tablet_scans INTEGER DEFAULT 0,
  
  -- Time Breakdown
  morning_scans INTEGER DEFAULT 0, -- 6-12
  afternoon_scans INTEGER DEFAULT 0, -- 12-18
  evening_scans INTEGER DEFAULT 0, -- 18-24
  night_scans INTEGER DEFAULT 0, -- 0-6
  
  -- Conversion Metrics
  offer_claims INTEGER DEFAULT 0,
  user_signups INTEGER DEFAULT 0,
  
  UNIQUE(qr_code_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_city ON public.qr_codes(city);
CREATE INDEX IF NOT EXISTS idx_qr_codes_type_category ON public.qr_codes(qr_type, category);
CREATE INDEX IF NOT EXISTS idx_qr_codes_business_id ON public.qr_codes(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON public.qr_codes(status);

CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code_id ON public.qr_code_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_scanned_at ON public.qr_code_scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_city ON public.qr_code_scans(city);
CREATE INDEX IF NOT EXISTS idx_qr_scans_user_id ON public.qr_code_scans(user_id);

CREATE INDEX IF NOT EXISTS idx_qr_analytics_qr_code_id ON public.qr_code_analytics(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_date ON public.qr_code_analytics(date DESC);

-- RLS Policies
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_code_analytics ENABLE ROW LEVEL SECURITY;

-- Admin can see all QR codes
CREATE POLICY "Admins can manage all QR codes" ON public.qr_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Businesses can see their own QR codes
CREATE POLICY "Businesses can see own QR codes" ON public.qr_codes
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM public.business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Anyone can scan QR codes (insert scans)
CREATE POLICY "Anyone can scan QR codes" ON public.qr_code_scans
  FOR INSERT WITH CHECK (true);

-- Admins can see all scan data
CREATE POLICY "Admins can see all scan data" ON public.qr_code_scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Analytics policies (similar to scans)
CREATE POLICY "Admins can see all analytics" ON public.qr_code_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE admin_users.id = auth.uid()
    )
  );

-- Function to update QR code scan count
CREATE OR REPLACE FUNCTION update_qr_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total scans on the QR code
  UPDATE public.qr_codes 
  SET 
    total_scans = total_scans + 1,
    last_scanned_at = NEW.scanned_at,
    updated_at = NOW()
  WHERE id = NEW.qr_code_id;
  
  -- Update or insert daily analytics
  INSERT INTO public.qr_code_analytics (
    qr_code_id,
    qr_code,
    date,
    total_scans,
    unique_ips,
    mobile_scans,
    desktop_scans,
    tablet_scans,
    morning_scans,
    afternoon_scans,
    evening_scans,
    night_scans
  ) VALUES (
    NEW.qr_code_id,
    NEW.qr_code,
    DATE(NEW.scanned_at),
    1,
    1,
    CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END,
    CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 6 AND 11 THEN 1 ELSE 0 END,
    CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 12 AND 17 THEN 1 ELSE 0 END,
    CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 18 AND 23 THEN 1 ELSE 0 END,
    CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 0 AND 5 THEN 1 ELSE 0 END
  )
  ON CONFLICT (qr_code_id, date) DO UPDATE SET
    total_scans = qr_code_analytics.total_scans + 1,
    unique_ips = qr_code_analytics.unique_ips + 1,
    mobile_scans = qr_code_analytics.mobile_scans + CASE WHEN NEW.device_type = 'mobile' THEN 1 ELSE 0 END,
    desktop_scans = qr_code_analytics.desktop_scans + CASE WHEN NEW.device_type = 'desktop' THEN 1 ELSE 0 END,
    tablet_scans = qr_code_analytics.tablet_scans + CASE WHEN NEW.device_type = 'tablet' THEN 1 ELSE 0 END,
    morning_scans = qr_code_analytics.morning_scans + CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 6 AND 11 THEN 1 ELSE 0 END,
    afternoon_scans = qr_code_analytics.afternoon_scans + CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 12 AND 17 THEN 1 ELSE 0 END,
    evening_scans = qr_code_analytics.evening_scans + CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 18 AND 23 THEN 1 ELSE 0 END,
    night_scans = qr_code_analytics.night_scans + CASE WHEN EXTRACT(HOUR FROM NEW.scanned_at) BETWEEN 0 AND 5 THEN 1 ELSE 0 END,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_qr_scan_count
  AFTER INSERT ON public.qr_code_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_scan_count();

-- Insert some initial QR codes for testing
INSERT INTO public.qr_codes (qr_code, qr_type, name, description, category, current_target_url, default_target_url, city) VALUES
-- Marketing QR Codes
('QWK-MKT-FLY-001', 'marketing', 'Main Flyer QR', 'QR code for main promotional flyers', 'flyers', 'https://bournemouth.qwikker.com/discover', 'https://bournemouth.qwikker.com', 'bournemouth'),
('QWK-MKT-FLY-002', 'marketing', 'Restaurant Flyer QR', 'QR code for restaurant-specific flyers', 'flyers', 'https://bournemouth.qwikker.com/discover?category=restaurant', 'https://bournemouth.qwikker.com', 'bournemouth'),
('QWK-MKT-LEF-001', 'marketing', 'Leaflet QR', 'QR code for promotional leaflets', 'leaflets', 'https://bournemouth.qwikker.com/discover', 'https://bournemouth.qwikker.com', 'bournemouth'),
('QWK-MKT-PRO-001', 'marketing', 'Promo Pack QR', 'QR code for promotional packs', 'promo_packs', 'https://bournemouth.qwikker.com/offers', 'https://bournemouth.qwikker.com', 'bournemouth'),

-- Business Static QR Codes (these will be linked to actual businesses)
('QWK-BIZ-WIN-001', 'business_static', 'Window Sticker Generic', 'Generic window sticker QR', 'window_stickers', 'https://bournemouth.qwikker.com/discover', 'https://bournemouth.qwikker.com', 'bournemouth'),
('QWK-BIZ-OFF-001', 'business_static', 'Offer Display QR', 'QR for displaying current offers', 'offers', 'https://bournemouth.qwikker.com/offers', 'https://bournemouth.qwikker.com', 'bournemouth'),
('QWK-BIZ-SEC-001', 'business_static', 'Secret Menu QR', 'QR for secret menu access', 'secret_menus', 'https://bournemouth.qwikker.com/secret-menu', 'https://bournemouth.qwikker.com', 'bournemouth');

-- Add Calgary QR codes
INSERT INTO public.qr_codes (qr_code, qr_type, name, description, category, current_target_url, default_target_url, city) VALUES
('QWK-CGY-FLY-001', 'marketing', 'Calgary Main Flyer QR', 'QR code for Calgary promotional flyers', 'flyers', 'https://calgary.qwikker.com/discover', 'https://calgary.qwikker.com', 'calgary'),
('QWK-CGY-WIN-001', 'business_static', 'Calgary Window Sticker', 'Calgary window sticker QR', 'window_stickers', 'https://calgary.qwikker.com/discover', 'https://calgary.qwikker.com', 'calgary');

