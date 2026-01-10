-- Add missing submitted_at column to claim_requests
ALTER TABLE claim_requests 
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'claim_requests' 
  AND column_name = 'submitted_at';

