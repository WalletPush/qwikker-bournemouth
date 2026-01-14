-- Add edited_tagline column to claim_requests table
-- Allows claimers to add/edit business tagline during claim flow

ALTER TABLE claim_requests ADD COLUMN IF NOT EXISTS edited_tagline TEXT;

COMMENT ON COLUMN claim_requests.edited_tagline IS 'Business tagline edited/added by claimer (max 80 chars, shown on discover cards)';

-- Verify
SELECT 
  'claim_requests.edited_tagline column added' as message,
  COUNT(*) as total_claims
FROM claim_requests;

