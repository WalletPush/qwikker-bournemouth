-- 🔒 SECURITY: Prevent multiple active claims per business
-- This prevents race conditions where two users claim the same business
-- IMPORTANT: Partial index allows historical denied claims

-- Add PARTIAL unique constraint to prevent multiple active claims
-- (allows multiple denied claims historically, allows re-claiming after denial)
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_active_per_business
ON claim_requests (business_id)
WHERE status IN ('pending', 'approved');

COMMENT ON INDEX claim_requests_one_active_per_business IS 
'Prevents multiple active claims per business. Partial index allows re-claiming after denial.';

-- Add PARTIAL unique constraint to prevent duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS business_subscriptions_unique_active
ON business_subscriptions (business_id, tier_id)
WHERE status = 'active';

COMMENT ON INDEX business_subscriptions_unique_active IS 
'Prevents duplicate active subscriptions. Partial index allows historical records.';

-- Optional: Add index for faster claim lookups
CREATE INDEX IF NOT EXISTS idx_claim_requests_business_status
ON claim_requests (business_id, status);

COMMENT ON INDEX idx_claim_requests_business_status IS 
'Performance: faster lookups for claim status by business';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE '✅ Security constraints added:';
  RAISE NOTICE '  - Partial unique index on claim_requests (prevents race conditions)';
  RAISE NOTICE '  - Partial unique index on business_subscriptions (idempotency)';
  RAISE NOTICE '  - Performance index on claim_requests';
END $$;

