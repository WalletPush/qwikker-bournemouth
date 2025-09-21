-- Add Dedicated QR Code System for Spotlight Tier
-- This extends the universal system with premium dedicated QR codes

-- Dedicated QR Codes (Spotlight tier only)
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

-- QR Code Print Orders (Track physical QR code production)
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

-- Enhanced analytics for dedicated QR codes
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

-- Create indexes for performance
CREATE INDEX idx_dedicated_qr_codes_business ON dedicated_qr_codes(business_id);
CREATE INDEX idx_dedicated_qr_codes_type ON dedicated_qr_codes(qr_type);
CREATE INDEX idx_dedicated_qr_codes_active ON dedicated_qr_codes(is_active);
CREATE INDEX idx_dedicated_qr_codes_tier ON dedicated_qr_codes(business_tier);
CREATE INDEX idx_qr_print_orders_business ON qr_print_orders(business_id);
CREATE INDEX idx_qr_print_orders_status ON qr_print_orders(status);
CREATE INDEX idx_dedicated_qr_analytics_qr ON dedicated_qr_analytics(dedicated_qr_id);
CREATE INDEX idx_dedicated_qr_analytics_business ON dedicated_qr_analytics(business_id);
CREATE INDEX idx_dedicated_qr_analytics_timestamp ON dedicated_qr_analytics(scan_timestamp);

-- RLS Policies
ALTER TABLE dedicated_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedicated_qr_analytics ENABLE ROW LEVEL SECURITY;

-- Admin can manage all dedicated QR codes
CREATE POLICY "Admins can manage dedicated QR codes" ON dedicated_qr_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Businesses can view their own dedicated QR codes
CREATE POLICY "Businesses can view their QR codes" ON dedicated_qr_codes
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Admin can manage print orders
CREATE POLICY "Admins can manage print orders" ON qr_print_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Analytics policies
CREATE POLICY "Admins can view dedicated QR analytics" ON dedicated_qr_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

CREATE POLICY "System can insert dedicated QR analytics" ON dedicated_qr_analytics
  FOR INSERT WITH CHECK (true);

-- Function to generate unique QR code ID
CREATE OR REPLACE FUNCTION generate_qr_code_id(
  p_business_name TEXT,
  p_qr_type TEXT,
  p_sequence INTEGER DEFAULT 1
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  clean_name TEXT;
  qr_id TEXT;
BEGIN
  -- Clean business name for URL safety
  clean_name := lower(regexp_replace(p_business_name, '[^a-zA-Z0-9\s]', '', 'g'));
  clean_name := regexp_replace(clean_name, '\s+', '-', 'g');
  clean_name := trim(both '-' from clean_name);
  
  -- Limit length to 20 characters
  IF length(clean_name) > 20 THEN
    clean_name := left(clean_name, 20);
  END IF;
  
  -- Generate QR code ID
  qr_id := clean_name || '-' || p_qr_type || '-' || LPAD(p_sequence::text, 3, '0');
  
  RETURN qr_id;
END;
$$;

-- Function to automatically upgrade business to dedicated QR codes
CREATE OR REPLACE FUNCTION upgrade_business_to_dedicated_qr(
  p_business_id UUID
)
RETURNS TABLE (
  qr_code_id TEXT,
  qr_type TEXT,
  direct_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  business_record RECORD;
  qr_types TEXT[] := ARRAY['explore', 'offers', 'secret'];
  qr_type TEXT;
  new_qr_id TEXT;
  new_direct_url TEXT;
  sequence_num INTEGER := 1;
BEGIN
  -- Get business details
  SELECT * INTO business_record 
  FROM business_profiles 
  WHERE id = p_business_id AND tier = 'spotlight';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or not on Spotlight tier';
  END IF;
  
  -- Create dedicated QR codes for each type
  FOREACH qr_type IN ARRAY qr_types
  LOOP
    -- Generate unique QR code ID
    LOOP
      new_qr_id := generate_qr_code_id(business_record.business_name, qr_type, sequence_num);
      
      -- Check if ID already exists
      IF NOT EXISTS (SELECT 1 FROM dedicated_qr_codes WHERE qr_code_id = new_qr_id) THEN
        EXIT;
      END IF;
      
      sequence_num := sequence_num + 1;
    END LOOP;
    
    -- Generate direct URL
    CASE qr_type
      WHEN 'explore' THEN 
        new_direct_url := '/user/business/' || business_record.slug || '?qr=' || new_qr_id;
      WHEN 'offers' THEN 
        new_direct_url := '/user/offers?business=' || business_record.slug || '&qr=' || new_qr_id;
      WHEN 'secret' THEN 
        new_direct_url := '/user/secret-menu?business=' || business_record.slug || '&qr=' || new_qr_id;
    END CASE;
    
    -- Insert dedicated QR code
    INSERT INTO dedicated_qr_codes (
      business_id,
      qr_code_id,
      qr_type,
      business_tier,
      direct_url,
      logo_url,
      generated_by
    ) VALUES (
      p_business_id,
      new_qr_id,
      qr_type,
      'spotlight',
      new_direct_url,
      business_record.logo,
      auth.uid()
    );
    
    -- Deactivate universal QR assignment for this type
    UPDATE business_qr_assignments 
    SET is_active = false 
    WHERE business_id = p_business_id AND qr_type = qr_type;
    
    -- Return the created QR code info
    RETURN QUERY SELECT new_qr_id, qr_type, new_direct_url;
  END LOOP;
END;
$$;

-- View for comprehensive QR code management
CREATE VIEW comprehensive_qr_management_view AS
SELECT 
  bp.id as business_id,
  bp.business_name,
  bp.business_category,
  bp.status,
  bp.tier,
  bp.city,
  bp.business_address,
  bp.logo,
  bp.slug,
  
  -- Universal QR assignments
  CASE WHEN uqa_explore.is_active THEN true ELSE false END as has_universal_explore,
  CASE WHEN uqa_offers.is_active THEN true ELSE false END as has_universal_offers,
  CASE WHEN uqa_secret.is_active THEN true ELSE false END as has_universal_secret,
  
  -- Dedicated QR codes
  dqr_explore.qr_code_id as dedicated_explore_id,
  dqr_offers.qr_code_id as dedicated_offers_id,
  dqr_secret.qr_code_id as dedicated_secret_id,
  
  dqr_explore.direct_url as dedicated_explore_url,
  dqr_offers.direct_url as dedicated_offers_url,
  dqr_secret.direct_url as dedicated_secret_url,
  
  dqr_explore.print_status as explore_print_status,
  dqr_offers.print_status as offers_print_status,
  dqr_secret.print_status as secret_print_status,
  
  -- Analytics (last 30 days)
  COALESCE(universal_scans.total_scans, 0) as universal_scans_30d,
  COALESCE(dedicated_scans.total_scans, 0) as dedicated_scans_30d,
  COALESCE(universal_scans.total_scans, 0) + COALESCE(dedicated_scans.total_scans, 0) as total_scans_30d

FROM business_profiles bp
LEFT JOIN business_qr_assignments uqa_explore ON bp.id = uqa_explore.business_id AND uqa_explore.qr_type = 'explore' AND uqa_explore.is_active = true
LEFT JOIN business_qr_assignments uqa_offers ON bp.id = uqa_offers.business_id AND uqa_offers.qr_type = 'offers' AND uqa_offers.is_active = true  
LEFT JOIN business_qr_assignments uqa_secret ON bp.id = uqa_secret.business_id AND uqa_secret.qr_type = 'secret' AND uqa_secret.is_active = true
LEFT JOIN dedicated_qr_codes dqr_explore ON bp.id = dqr_explore.business_id AND dqr_explore.qr_type = 'explore' AND dqr_explore.is_active = true
LEFT JOIN dedicated_qr_codes dqr_offers ON bp.id = dqr_offers.business_id AND dqr_offers.qr_type = 'offers' AND dqr_offers.is_active = true
LEFT JOIN dedicated_qr_codes dqr_secret ON bp.id = dqr_secret.business_id AND dqr_secret.qr_type = 'secret' AND dqr_secret.is_active = true
LEFT JOIN (
  SELECT business_id, COUNT(*) as total_scans 
  FROM universal_qr_analytics 
  WHERE scan_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY business_id
) universal_scans ON bp.id = universal_scans.business_id
LEFT JOIN (
  SELECT business_id, COUNT(*) as total_scans 
  FROM dedicated_qr_analytics 
  WHERE scan_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY business_id
) dedicated_scans ON bp.id = dedicated_scans.business_id
WHERE bp.status = 'approved'
ORDER BY bp.tier DESC, bp.business_name;
