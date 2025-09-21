-- Add missing columns to qr_code_templates table
-- Run this in Supabase SQL Editor if the migration doesn't work

-- Add qr_category field
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS qr_category TEXT;

-- Add qr_subtype field  
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS qr_subtype TEXT;

-- Add business_id field
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL;

-- Add business_name field
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add logo_url field
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add qr_code_url field
ALTER TABLE qr_code_templates 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Update the qr_type constraint to allow 'discover'
ALTER TABLE qr_code_templates 
DROP CONSTRAINT IF EXISTS qr_code_templates_qr_type_check;

ALTER TABLE qr_code_templates 
ADD CONSTRAINT qr_code_templates_qr_type_check 
CHECK (qr_type IN ('explore', 'offers', 'secret_menu', 'general', 'discover'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_qr_templates_category ON qr_code_templates(qr_category);
CREATE INDEX IF NOT EXISTS idx_qr_templates_subtype ON qr_code_templates(qr_subtype);
CREATE INDEX IF NOT EXISTS idx_qr_templates_business ON qr_code_templates(business_id);

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'qr_code_templates' 
ORDER BY ordinal_position;
