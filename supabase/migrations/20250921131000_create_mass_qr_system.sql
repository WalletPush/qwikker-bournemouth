-- Mass QR Code System for Pre-Printed Promotional Packs
-- This creates QR codes BEFORE businesses sign up

-- QR Code Inventory (Pre-printed QR codes)
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

-- QR Code Assignments (Links QR codes to businesses AFTER signup)
CREATE TABLE qr_code_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_code_inventory(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL, -- admin who assigned it
  target_content_id UUID, -- optional: specific offer_id or secret_menu_id
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- optional expiry
  assignment_notes TEXT, -- admin notes about the assignment
  
  -- Ensure one QR code can only be assigned to one business at a time
  UNIQUE(qr_code_id)
);

-- QR Code Analytics (track scans and conversions)
CREATE TABLE qr_code_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID REFERENCES qr_code_inventory(id) ON DELETE CASCADE,
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE, -- null if unassigned scan
  user_id UUID, -- if user is logged in
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  city TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  scan_result TEXT NOT NULL CHECK (scan_result IN ('unassigned_qr', 'business_redirect', 'business_pending', 'error')),
  target_reached BOOLEAN DEFAULT false, -- did they reach the intended content?
  session_duration INTEGER, -- seconds spent on site after scan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intent Queue (for deferred deep linking)
CREATE TABLE intent_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL, -- email, phone, or temporary session ID
  intent_type TEXT NOT NULL CHECK (intent_type IN ('window_sticker', 'offers', 'secret_menu', 'general')),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE, -- null if business not assigned yet
  qr_code_id UUID REFERENCES qr_code_inventory(id) ON DELETE CASCADE,
  payload JSONB, -- additional data for the intent
  is_processed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business QR Allocation (Track which QRs were given to which business)
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

-- Create indexes for performance
CREATE INDEX idx_qr_inventory_code ON qr_code_inventory(qr_code);
CREATE INDEX idx_qr_inventory_type_city ON qr_code_inventory(qr_type, city);
CREATE INDEX idx_qr_inventory_distributed ON qr_code_inventory(is_distributed);
CREATE INDEX idx_qr_assignments_business ON qr_code_assignments(business_id);
CREATE INDEX idx_qr_assignments_active ON qr_code_assignments(is_active);
CREATE INDEX idx_qr_analytics_timestamp ON qr_code_analytics(scan_timestamp);
CREATE INDEX idx_qr_analytics_business ON qr_code_analytics(business_id);
CREATE INDEX idx_intent_queue_user ON intent_queue(user_identifier);
CREATE INDEX idx_intent_queue_expires ON intent_queue(expires_at);
CREATE INDEX idx_business_allocations_business ON business_qr_allocations(business_id);

-- RLS Policies
ALTER TABLE qr_code_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_qr_allocations ENABLE ROW LEVEL SECURITY;

-- Admin can manage all QR codes
CREATE POLICY "Admins can manage QR code inventory" ON qr_code_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

CREATE POLICY "Admins can manage QR code assignments" ON qr_code_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Analytics are readable by admins
CREATE POLICY "Admins can view QR analytics" ON qr_code_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Intent queue is managed by system
CREATE POLICY "System can manage intent queue" ON intent_queue
  FOR ALL USING (true);

-- Business allocations managed by admins
CREATE POLICY "Admins can manage business QR allocations" ON business_qr_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Generate QR code inventory for mass printing
-- Window Stickers (500)
INSERT INTO qr_code_inventory (qr_code, qr_type, city, print_batch, physical_format, notes)
SELECT 
  'WIN' || LPAD(generate_series::text, 3, '0'),
  'window_sticker',
  'bournemouth',
  'BATCH_2024_Q1',
  'Window Sticker 3x3"',
  'Mass printed for promo pack distribution'
FROM generate_series(1, 500);

-- Offers QR Codes (1000)
INSERT INTO qr_code_inventory (qr_code, qr_type, city, print_batch, physical_format, notes)
SELECT 
  'OFF' || LPAD(generate_series::text, 4, '0'),
  'offers',
  'bournemouth',
  'BATCH_2024_Q1',
  'Offers Table Tent 4x6"',
  'Mass printed for promo pack distribution'
FROM generate_series(1, 1000);

-- Secret Menu QR Codes (500)
INSERT INTO qr_code_inventory (qr_code, qr_type, city, print_batch, physical_format, notes)
SELECT 
  'SEC' || LPAD(generate_series::text, 3, '0'),
  'secret_menu',
  'bournemouth',
  'BATCH_2024_Q1',
  'Secret Menu Sticker 2x2"',
  'Mass printed for promo pack distribution'
FROM generate_series(1, 500);

-- Create a view for easy QR code management
CREATE VIEW qr_code_management_view AS
SELECT 
  i.id,
  i.qr_code,
  i.qr_type,
  i.city,
  i.physical_format,
  i.is_distributed,
  i.is_assigned,
  i.created_at,
  a.business_id,
  bp.business_name,
  bp.status as business_status,
  a.assigned_at,
  a.assignment_notes,
  COALESCE(
    (SELECT COUNT(*) FROM qr_code_analytics WHERE qr_code_id = i.id),
    0
  ) as total_scans
FROM qr_code_inventory i
LEFT JOIN qr_code_assignments a ON i.id = a.qr_code_id AND a.is_active = true
LEFT JOIN business_profiles bp ON a.business_id = bp.id
ORDER BY i.qr_code;
