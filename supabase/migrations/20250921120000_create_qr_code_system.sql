-- QR Code Deep Linking System
-- This creates the infrastructure for dynamic QR code assignment

-- QR Code Templates (the physical QR codes)
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

-- QR Code Assignments (linking QR codes to businesses)
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

-- QR Code Analytics (track scans and conversions)
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

-- Intent Queue (for deferred deep linking)
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

-- Create indexes for performance
CREATE INDEX idx_qr_assignments_business ON qr_code_assignments(business_id);
CREATE INDEX idx_qr_assignments_active ON qr_code_assignments(is_active);
CREATE INDEX idx_qr_analytics_timestamp ON qr_code_analytics(scan_timestamp);
CREATE INDEX idx_qr_analytics_business ON qr_code_analytics(business_id);
CREATE INDEX idx_intent_queue_user ON intent_queue(user_identifier);
CREATE INDEX idx_intent_queue_expires ON intent_queue(expires_at);

-- RLS Policies
ALTER TABLE qr_code_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_queue ENABLE ROW LEVEL SECURITY;

-- Admin can manage all QR codes
CREATE POLICY "Admins can manage QR code templates" ON qr_code_templates
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

-- Insert some default QR code templates for Bournemouth
INSERT INTO qr_code_templates (code_name, qr_type, city, physical_location, base_url) VALUES
  ('explore-bournemouth-table-tent-001', 'explore', 'bournemouth', 'Table Tent', 'https://bournemouth.qwikker.com/intent/'),
  ('explore-bournemouth-window-sticker-001', 'explore', 'bournemouth', 'Window Sticker', 'https://bournemouth.qwikker.com/intent/'),
  ('offers-bournemouth-table-tent-001', 'offers', 'bournemouth', 'Table Tent', 'https://bournemouth.qwikker.com/intent/'),
  ('offers-bournemouth-flyer-001', 'offers', 'bournemouth', 'Flyer', 'https://bournemouth.qwikker.com/intent/'),
  ('secret-menu-bournemouth-sticker-001', 'secret_menu', 'bournemouth', 'Secret Sticker', 'https://bournemouth.qwikker.com/intent/'),
  ('general-bournemouth-join-001', 'general', 'bournemouth', 'Join Qwikker Flyer', 'https://bournemouth.qwikker.com/intent/');
