-- Update QR Code system to support all category combinations
-- Add missing fields to support comprehensive QR code management

-- Add qr_category field to support the three main categories
ALTER TABLE qr_code_templates 
ADD COLUMN qr_category TEXT CHECK (qr_category IN ('qwikker-marketing', 'static-business', 'dynamic-business'));

-- Add qr_subtype to store the specific subtype (flyers, window-stickers, etc.)
ALTER TABLE qr_code_templates 
ADD COLUMN qr_subtype TEXT;

-- Add business_id to link dynamic QR codes to specific businesses
ALTER TABLE qr_code_templates 
ADD COLUMN business_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL;

-- Add business_name for easier querying (denormalized)
ALTER TABLE qr_code_templates 
ADD COLUMN business_name TEXT;

-- Add logo_url to store the logo URL for QR codes with logos
ALTER TABLE qr_code_templates 
ADD COLUMN logo_url TEXT;

-- Add qr_code_url to store the generated QR code image URL
ALTER TABLE qr_code_templates 
ADD COLUMN qr_code_url TEXT;

-- Update existing records to have default category
UPDATE qr_code_templates 
SET qr_category = CASE 
  WHEN physical_location LIKE '%Flyer%' THEN 'qwikker-marketing'
  WHEN physical_location LIKE '%Table Tent%' OR physical_location LIKE '%Window Sticker%' THEN 'static-business'
  ELSE 'static-business'
END,
qr_subtype = LOWER(REPLACE(physical_location, ' ', '-'))
WHERE qr_category IS NULL;

-- Make qr_category required now that we've populated it
ALTER TABLE qr_code_templates 
ALTER COLUMN qr_category SET NOT NULL;

-- Update the qr_type CHECK constraint to include more types for better flexibility
ALTER TABLE qr_code_templates 
DROP CONSTRAINT IF EXISTS qr_code_templates_qr_type_check;

ALTER TABLE qr_code_templates 
ADD CONSTRAINT qr_code_templates_qr_type_check 
CHECK (qr_type IN ('explore', 'offers', 'secret_menu', 'general', 'discover'));

-- Create index for better performance on category queries
CREATE INDEX idx_qr_templates_category ON qr_code_templates(qr_category);
CREATE INDEX idx_qr_templates_subtype ON qr_code_templates(qr_subtype);
CREATE INDEX idx_qr_templates_business ON qr_code_templates(business_id);

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Admins can manage QR code templates" ON qr_code_templates;

CREATE POLICY "Admins can manage QR code templates" ON qr_code_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.email = 'admin@qwikker.com'
    )
  );

-- Add some sample data for all categories to test
INSERT INTO qr_code_templates (code_name, qr_type, qr_category, qr_subtype, city, physical_location, base_url) VALUES
  -- Qwikker Marketing
  ('qwikker-marketing-flyers-sample-001', 'general', 'qwikker-marketing', 'flyers', 'bournemouth', 'Marketing Flyer', 'https://bournemouth.qwikker.com/join'),
  ('qwikker-marketing-leaflets-sample-001', 'general', 'qwikker-marketing', 'leaflets', 'bournemouth', 'Marketing Leaflet', 'https://bournemouth.qwikker.com/join'),
  ('qwikker-marketing-promo-packs-sample-001', 'general', 'qwikker-marketing', 'promo-packs', 'bournemouth', 'Promo Pack', 'https://bournemouth.qwikker.com/join'),
  
  -- Static Business QR
  ('static-business-window-stickers-sample-001', 'explore', 'static-business', 'window-stickers', 'bournemouth', 'Window Sticker', 'https://bournemouth.qwikker.com/explore'),
  ('static-business-offers-sample-001', 'offers', 'static-business', 'offers', 'bournemouth', 'Offers Display', 'https://bournemouth.qwikker.com/offers'),
  ('static-business-secret-menus-sample-001', 'secret_menu', 'static-business', 'secret-menus', 'bournemouth', 'Secret Menu Display', 'https://bournemouth.qwikker.com/secret-menu'),
  
  -- Dynamic Business QR (these would be assigned to specific businesses)
  ('dynamic-business-discover-sample-001', 'discover', 'dynamic-business', 'discover', 'bournemouth', 'Business Discovery', 'https://bournemouth.qwikker.com/business/'),
  ('dynamic-business-offers-sample-001', 'offers', 'dynamic-business', 'offers', 'bournemouth', 'Business Offers', 'https://bournemouth.qwikker.com/business/offers/'),
  ('dynamic-business-secret-menu-sample-001', 'secret_menu', 'dynamic-business', 'secret-menu', 'bournemouth', 'Business Secret Menu', 'https://bournemouth.qwikker.com/business/secret-menu/')
ON CONFLICT (code_name) DO NOTHING;
