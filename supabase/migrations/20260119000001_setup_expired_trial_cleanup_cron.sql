-- ============================================================================
-- SETUP DAILY CRON JOB FOR EXPIRED TRIAL CLEANUP
-- Runs every day at 2 AM UTC to clean up expired trials
-- ============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove old cron job if it exists (for re-running this migration)
SELECT cron.unschedule('cleanup-expired-trials')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-trials'
);

-- Schedule daily cleanup at 2 AM UTC
-- Syntax: '0 2 * * *' = minute=0, hour=2, day=*, month=*, weekday=*
SELECT cron.schedule(
  'cleanup-expired-trials', -- Job name
  '0 2 * * *',              -- Cron schedule (2 AM UTC daily)
  $$ 
    SELECT * FROM cleanup_expired_trials();
  $$
);

COMMENT ON EXTENSION pg_cron IS 
  'Cron-based job scheduler for PostgreSQL. ' ||
  'Used for daily expired trial cleanup.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if cron job is scheduled
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-trials';

-- Check cron job history (last runs)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-trials')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- Manual test run (DO NOT RUN IN PRODUCTION without checking!)
-- SELECT * FROM cleanup_expired_trials();

-- ============================================================================
-- OPTIONAL: Create a log table for cleanup history
-- ============================================================================

CREATE TABLE IF NOT EXISTS trial_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  business_name TEXT,
  kb_entries_deleted INTEGER,
  cleaned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  restored_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_trial_cleanup_log_business_id ON trial_cleanup_log(business_id);
CREATE INDEX IF NOT EXISTS idx_trial_cleanup_log_cleaned_at ON trial_cleanup_log(cleaned_at DESC);

COMMENT ON TABLE trial_cleanup_log IS 
  'Audit log for expired trial cleanups. Tracks when businesses were cleaned and restored.';

-- Grant permissions
GRANT SELECT ON trial_cleanup_log TO authenticated, service_role;
GRANT INSERT ON trial_cleanup_log TO service_role;

-- ============================================================================
-- UPDATE CLEANUP FUNCTION TO LOG TO TABLE
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
      AND bs.status != 'cancelled' -- Not already cleaned up
  LOOP
    
    -- Delete knowledge_base entries
    DELETE FROM knowledge_base
    WHERE business_id = v_business.id;
    
    GET DIAGNOSTICS v_kb_deleted = ROW_COUNT;
    
    -- Update subscription status to 'cancelled' (not 'expired' - constraint violation!)
    -- ✅ CONSTRAINT: status must be in ('trial','active','past_due','cancelled','suspended')
    -- We use 'cancelled' to indicate trial is no longer active
    -- Expired is computed from: is_in_free_trial=true AND free_trial_end_date < now()
    UPDATE business_subscriptions
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE business_id = v_business.id
      AND is_in_free_trial = true;
    
    -- ✅ KEEP tier as 'free_trial' (DON'T downgrade!)
    -- This keeps them in "Expired Trials" tab for admin reactivation
    -- No tier update needed
    
    -- 🆕 Log to audit table
    INSERT INTO trial_cleanup_log (business_id, business_name, kb_entries_deleted, notes)
    VALUES (
      v_business.id, 
      v_business.business_name, 
      v_kb_deleted,
      format('Trial expired on %s, auto-cleaned by cron', v_business.free_trial_end_date)
    );
    
    v_total_cleaned := v_total_cleaned + 1;
    
    business_id := v_business.id;
    business_name := v_business.business_name;
    kb_entries_deleted := v_kb_deleted;
    status := format('✅ Cleaned: %s KB entries deleted, status set to expired', v_kb_deleted);
    
    RETURN NEXT;
  END LOOP;
  
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
