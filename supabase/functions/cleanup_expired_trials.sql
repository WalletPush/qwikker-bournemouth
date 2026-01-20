-- ============================================================================
-- CLEANUP EXPIRED TRIALS
-- Runs daily to:
-- 1. Find trials where free_trial_end_date < NOW()
-- 2. Set subscription.status = 'expired'
-- 3. DELETE their knowledge_base entries (prevents KB flooding)
-- 4. Set business_profiles.business_tier = 'starter' (downgrades AI visibility)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_trials()
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  kb_entries_deleted INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business RECORD;
  v_kb_deleted INTEGER;
  v_total_cleaned INTEGER := 0;
BEGIN
  -- Find all expired trials that haven't been marked as expired yet
  FOR v_business IN
    SELECT 
      bp.id,
      bp.business_name,
      bp.city,
      bs.free_trial_end_date
    FROM business_profiles bp
    JOIN business_subscriptions bs ON bp.id = bs.business_id
    WHERE bs.is_in_free_trial = true
      AND bs.free_trial_end_date < NOW()
      AND bs.status != 'cancelled' -- Only process if not already cleaned up
  LOOP
    
    -- 1. Delete knowledge_base entries for this business
    DELETE FROM knowledge_base
    WHERE business_id = v_business.id;
    
    GET DIAGNOSTICS v_kb_deleted = ROW_COUNT;
    
    -- 2. Update subscription status to 'cancelled' (not 'expired' - constraint violation!)
    -- ✅ CONSTRAINT: status must be in ('trial','active','past_due','cancelled','suspended')
    -- We use 'cancelled' to indicate trial is no longer active
    -- Expired is computed from: is_in_free_trial=true AND free_trial_end_date < now()
    UPDATE business_subscriptions
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE business_id = v_business.id
      AND is_in_free_trial = true;
    
    -- 3. ✅ KEEP tier as 'free_trial' (DON'T downgrade!)
    -- This keeps them in "Expired Trials" tab for reactivation
    -- No tier update needed - they stay visible in admin panel
    
    v_total_cleaned := v_total_cleaned + 1;
    
    -- Return info about what was cleaned
    business_id := v_business.id;
    business_name := v_business.business_name;
    kb_entries_deleted := v_kb_deleted;
    status := format('✅ Cleaned: %s KB entries deleted, status set to expired', v_kb_deleted);
    
    RETURN NEXT;
    
    -- Log to a cleanup_log table if you have one
    -- INSERT INTO trial_cleanup_log (business_id, business_name, kb_entries_deleted, cleaned_at)
    -- VALUES (v_business.id, v_business.business_name, v_kb_deleted, NOW());
    
  END LOOP;
  
  -- If no businesses were cleaned, return a status message
  IF v_total_cleaned = 0 THEN
    business_id := NULL;
    business_name := NULL;
    kb_entries_deleted := 0;
    status := 'ℹ️ No expired trials to clean';
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_trials() IS 
  'Daily cleanup: Finds expired trials, sets status=expired, deletes KB entries, downgrades tier. ' ||
  'Prevents KB flooding and removes from AI results. Run via cron daily.';

-- Manual test query (DO NOT RUN IN PRODUCTION without checking first!)
-- SELECT * FROM cleanup_expired_trials();

-- ============================================================================
-- RESTORE FUNCTION (for when admin extends trial)
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_trial_status(p_business_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_name TEXT;
  v_trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get business info
  SELECT 
    bp.business_name,
    bs.free_trial_end_date
  INTO v_business_name, v_trial_end_date
  FROM business_profiles bp
  JOIN business_subscriptions bs ON bp.id = bs.business_id
  WHERE bp.id = p_business_id;
  
  IF v_business_name IS NULL THEN
    RETURN QUERY SELECT false, 'Business not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if trial end date is in the future (extended by admin)
  IF v_trial_end_date IS NULL OR v_trial_end_date < NOW() THEN
    RETURN QUERY SELECT false, 'Trial is still expired or not extended'::TEXT;
    RETURN;
  END IF;
  
  -- Restore subscription status to 'trial'
  UPDATE business_subscriptions
  SET 
    status = 'trial',
    updated_at = NOW()
  WHERE business_id = p_business_id;
  
  -- Restore business_tier to 'free_trial' (makes them visible in AI again)
  UPDATE business_profiles
  SET 
    business_tier = 'free_trial',
    plan = 'featured', -- Free trial gets featured tier benefits
    updated_at = NOW()
  WHERE id = p_business_id;
  
  RETURN QUERY SELECT 
    true, 
    format('✅ Trial restored for %s. They must re-add KB entries manually.', v_business_name)::TEXT;
END;
$$;

COMMENT ON FUNCTION restore_trial_status(UUID) IS 
  'Restores trial status when admin extends trial. ' ||
  'Sets status=trial, tier=free_trial. Business must re-add KB entries manually.';

-- Example usage:
-- SELECT * FROM restore_trial_status('business-uuid-here');
