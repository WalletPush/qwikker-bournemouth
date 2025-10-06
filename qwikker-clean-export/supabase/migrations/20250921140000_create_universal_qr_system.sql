-- Universal QR Code System for Mass Printing
-- 3 QR codes total, dynamically route based on location/business selection

-- Drop the complex mass system - replace with simple universal system
DROP TABLE IF EXISTS qr_code_inventory CASCADE;
DROP TABLE IF EXISTS qr_code_assignments CASCADE;
DROP TABLE IF EXISTS qr_code_analytics CASCADE;
DROP TABLE IF EXISTS intent_queue CASCADE;
DROP TABLE IF EXISTS business_qr_allocations CASCADE;
DROP VIEW IF EXISTS qr_code_management_view CASCADE;

-- Business QR Code Assignments (Which businesses have which QR types active)
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

-- QR Code Analytics (Track scans and routing decisions)
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

-- Location-based business finder helper table (for GPS routing)
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

-- Create indexes for performance
CREATE INDEX idx_business_qr_assignments_business ON business_qr_assignments(business_id);
CREATE INDEX idx_business_qr_assignments_type ON business_qr_assignments(qr_type);
CREATE INDEX idx_business_qr_assignments_active ON business_qr_assignments(is_active);
CREATE INDEX idx_universal_qr_analytics_timestamp ON universal_qr_analytics(scan_timestamp);
CREATE INDEX idx_universal_qr_analytics_business ON universal_qr_analytics(business_id);
CREATE INDEX idx_universal_qr_analytics_type ON universal_qr_analytics(qr_type);
CREATE INDEX idx_business_locations_coords ON business_locations(latitude, longitude);
CREATE INDEX idx_business_locations_city ON business_locations(city);

-- RLS Policies
ALTER TABLE business_qr_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE universal_qr_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;

-- Admin can manage all QR assignments
CREATE POLICY "Admins can manage QR assignments" ON business_qr_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Analytics are readable by admins and system
CREATE POLICY "Admins can view QR analytics" ON universal_qr_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- System can insert analytics
CREATE POLICY "System can insert analytics" ON universal_qr_analytics
  FOR INSERT WITH CHECK (true);

-- Business locations managed by admins and businesses
CREATE POLICY "Admins can manage business locations" ON business_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

CREATE POLICY "Businesses can view their location" ON business_locations
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM business_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Create view for easy QR management
CREATE VIEW universal_qr_management_view AS
SELECT 
  bp.id as business_id,
  bp.business_name,
  bp.business_category,
  bp.status,
  bp.city,
  bp.business_address,
  
  -- QR Type availability
  CASE WHEN qa_explore.is_active THEN true ELSE false END as has_explore_qr,
  CASE WHEN qa_offers.is_active THEN true ELSE false END as has_offers_qr,
  CASE WHEN qa_secret.is_active THEN true ELSE false END as has_secret_qr,
  
  -- Assignment dates
  qa_explore.assigned_at as explore_assigned_at,
  qa_offers.assigned_at as offers_assigned_at,
  qa_secret.assigned_at as secret_assigned_at,
  
  -- Analytics counts (last 30 days)
  COALESCE(explore_scans.scan_count, 0) as explore_scans_30d,
  COALESCE(offers_scans.scan_count, 0) as offers_scans_30d,
  COALESCE(secret_scans.scan_count, 0) as secret_scans_30d,
  
  -- Location data
  bl.latitude,
  bl.longitude,
  bl.location_accuracy

FROM business_profiles bp
LEFT JOIN business_qr_assignments qa_explore ON bp.id = qa_explore.business_id AND qa_explore.qr_type = 'explore' AND qa_explore.is_active = true
LEFT JOIN business_qr_assignments qa_offers ON bp.id = qa_offers.business_id AND qa_offers.qr_type = 'offers' AND qa_offers.is_active = true  
LEFT JOIN business_qr_assignments qa_secret ON bp.id = qa_secret.business_id AND qa_secret.qr_type = 'secret' AND qa_secret.is_active = true
LEFT JOIN business_locations bl ON bp.id = bl.business_id
LEFT JOIN (
  SELECT business_id, COUNT(*) as scan_count 
  FROM universal_qr_analytics 
  WHERE qr_type = 'explore' AND scan_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY business_id
) explore_scans ON bp.id = explore_scans.business_id
LEFT JOIN (
  SELECT business_id, COUNT(*) as scan_count 
  FROM universal_qr_analytics 
  WHERE qr_type = 'offers' AND scan_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY business_id
) offers_scans ON bp.id = offers_scans.business_id
LEFT JOIN (
  SELECT business_id, COUNT(*) as scan_count 
  FROM universal_qr_analytics 
  WHERE qr_type = 'secret' AND scan_timestamp > NOW() - INTERVAL '30 days'
  GROUP BY business_id
) secret_scans ON bp.id = secret_scans.business_id
WHERE bp.status = 'approved'
ORDER BY bp.business_name;

-- Function to find nearby businesses for QR routing
CREATE OR REPLACE FUNCTION find_nearby_businesses_for_qr(
  p_qr_type TEXT,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_city TEXT DEFAULT NULL,
  p_radius_km DECIMAL DEFAULT 5.0
)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  business_category TEXT,
  distance_km DECIMAL,
  has_qr_type BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.business_name,
    bp.business_category,
    ROUND(
      (6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(bl.latitude)) * 
        cos(radians(bl.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(bl.latitude))
      ))::DECIMAL, 2
    ) as distance_km,
    CASE WHEN qa.business_id IS NOT NULL THEN true ELSE false END as has_qr_type
  FROM business_profiles bp
  JOIN business_locations bl ON bp.id = bl.business_id
  LEFT JOIN business_qr_assignments qa ON bp.id = qa.business_id 
    AND qa.qr_type = p_qr_type 
    AND qa.is_active = true
  WHERE 
    bp.status = 'approved'
    AND (p_city IS NULL OR bp.city = p_city)
    AND (
      6371 * acos(
        cos(radians(p_latitude)) * 
        cos(radians(bl.latitude)) * 
        cos(radians(bl.longitude) - radians(p_longitude)) + 
        sin(radians(p_latitude)) * 
        sin(radians(bl.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC, has_qr_type DESC
  LIMIT 10;
END;
$$;
