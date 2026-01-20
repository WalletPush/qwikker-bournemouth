-- ============================================================================
-- ATOMIC BUSINESS APPROVAL WITH TRIAL CREATION
-- Migration: Ensures business approval and trial creation happen atomically
-- ============================================================================

-- Create the approval function
CREATE OR REPLACE FUNCTION approve_business_with_trial(
  p_business_id UUID,
  p_approved_by UUID,
  p_manual_override BOOLEAN DEFAULT false,
  p_manual_override_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_tier_id UUID;
  v_trial_days INTEGER := 90;
  v_now TIMESTAMPTZ := NOW();
  v_trial_end_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- 1. Get trial tier ID and trial days from subscription_tiers
  SELECT id, (features->>'trial_days')::INTEGER
  INTO v_trial_tier_id, v_trial_days
  FROM subscription_tiers
  WHERE tier_name = 'trial'
  LIMIT 1;
  
  IF v_trial_tier_id IS NULL THEN
    RAISE EXCEPTION 'Trial tier not found in subscription_tiers';
  END IF;
  
  -- Fallback if trial_days not set in features
  IF v_trial_days IS NULL THEN
    v_trial_days := 90;
  END IF;
  
  v_trial_end_date := v_now + (v_trial_days || ' days')::INTERVAL;
  
  -- 2. Update business_profiles (approval + tier)
  UPDATE business_profiles
  SET
    status = 'approved',
    approved_by = p_approved_by,
    approved_at = v_now,
    business_tier = 'free_trial',
    plan = 'featured',
    manual_override = CASE WHEN p_manual_override THEN true ELSE manual_override END,
    manual_override_at = CASE WHEN p_manual_override THEN v_now ELSE manual_override_at END,
    manual_override_by = CASE WHEN p_manual_override THEN p_manual_override_by ELSE manual_override_by END,
    updated_at = v_now
  WHERE id = p_business_id
    AND status != 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found or already approved: %', p_business_id;
  END IF;
  
  -- 3. Create business_subscriptions row (if not exists)
  INSERT INTO business_subscriptions (
    business_id,
    tier_id,
    status,
    is_in_free_trial,
    free_trial_start_date,
    free_trial_end_date,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  )
  VALUES (
    p_business_id,
    v_trial_tier_id,
    'trial',
    true,
    v_now,
    v_trial_end_date,
    v_now,
    v_trial_end_date,
    v_now,
    v_now
  )
  ON CONFLICT (business_id) DO NOTHING;
  
  -- 4. Return success result
  SELECT jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'trial_end_date', v_trial_end_date,
    'trial_days', v_trial_days
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Approval failed: %', SQLERRM;
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION approve_business_with_trial TO service_role;

COMMENT ON FUNCTION approve_business_with_trial IS 
'Atomically approve a business and create trial subscription. Ensures business_tier=free_trial always has a subscription row.';
