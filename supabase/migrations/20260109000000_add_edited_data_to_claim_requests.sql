-- Add edited business data columns to claim_requests table
-- This allows claimers to edit/confirm business details during the claim flow

-- Add edited business data columns
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_business_name TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_address TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_phone TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_website TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_hours JSONB;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_category TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_type TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_description TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS logo_upload TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS hero_image_upload TEXT;

-- Add columns for tracking what was changed
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS data_edited BOOLEAN DEFAULT false;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_id ON claim_requests(business_id);

-- Add comment
COMMENT ON COLUMN claim_requests.edited_business_name IS 'Business name edited/confirmed by claimer';
COMMENT ON COLUMN claim_requests.logo_upload IS 'URL to uploaded logo image in Supabase Storage';
COMMENT ON COLUMN claim_requests.hero_image_upload IS 'URL to uploaded hero image in Supabase Storage';
COMMENT ON COLUMN claim_requests.data_edited IS 'True if claimer edited any business data during claim';

-- Verify
SELECT 
  'claim_requests table updated with edited data columns' as message,
  COUNT(*) as total_claims
FROM claim_requests;

