-- Fix Scizzors: Change trial from 120 days to 90 days (from approval)
-- Approval date: 2026-01-07 19:06:39

UPDATE business_subscriptions
SET 
  free_trial_end_date = '2026-01-07 19:06:39.315693+00'::TIMESTAMPTZ + INTERVAL '90 days',
  updated_at = NOW()
WHERE business_id = (
  SELECT id FROM business_profiles WHERE business_name = 'Scizzors'
);

-- Verify the change
SELECT 
  bp.business_name,
  bs.free_trial_start_date,
  bs.free_trial_end_date,
  EXTRACT(DAY FROM (bs.free_trial_end_date - bs.free_trial_start_date)) AS trial_length_days,
  EXTRACT(DAY FROM (bs.free_trial_end_date - NOW())) AS days_remaining
FROM business_profiles bp
JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bp.business_name = 'Scizzors';

