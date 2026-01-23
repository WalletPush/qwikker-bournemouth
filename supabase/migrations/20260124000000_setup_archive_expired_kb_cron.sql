-- Migration: Setup Cron Job for Archiving Expired KB Entries
-- Purpose: Automatically archive expired offers/events in knowledge base daily
-- Date: 2026-01-24
-- Runs: Daily at 2 AM UTC

-- ============================================================================
-- Create the archive function (if not exists from functions/)
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_expired_kb_entries()
RETURNS TABLE (
  archived_count integer,
  archived_type text,
  archived_ids uuid[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  offer_count integer;
  event_count integer;
  offer_ids uuid[];
  event_ids uuid[];
BEGIN
  -- Archive EXPIRED OFFERS in knowledge base
  WITH archived_offers AS (
    UPDATE knowledge_base kb
    SET 
      status = 'archived',
      updated_at = NOW()
    WHERE 
      kb.status = 'active'
      AND kb.knowledge_type = 'custom_knowledge'
      AND kb.metadata->>'type' = 'offer'
      AND kb.metadata->>'offer_id' IS NOT NULL
      AND kb.metadata ? 'offer_end_date'          -- 🔒 NULL-SAFE: Key exists
      AND (kb.metadata->>'offer_end_date') IS NOT NULL  -- 🔒 NULL-SAFE: Value not null
      AND (kb.metadata->>'offer_end_date')::date < CURRENT_DATE
    RETURNING kb.id
  )
  SELECT 
    COUNT(*)::integer,
    ARRAY_AGG(id)
  INTO offer_count, offer_ids
  FROM archived_offers;

  IF offer_count > 0 THEN
    RAISE NOTICE '📚 Archived % expired offer(s) in knowledge base', offer_count;
  END IF;

  RETURN QUERY SELECT offer_count, 'offers'::text, offer_ids;

  -- Archive EXPIRED EVENTS in knowledge base
  WITH archived_events AS (
    UPDATE knowledge_base kb
    SET 
      status = 'archived',
      updated_at = NOW()
    WHERE 
      kb.status = 'active'
      AND kb.knowledge_type = 'event'
      AND kb.metadata->>'event_id' IS NOT NULL
      AND kb.metadata ? 'event_date'          -- 🔒 NULL-SAFE: Key exists
      AND (kb.metadata->>'event_date') IS NOT NULL  -- 🔒 NULL-SAFE: Value not null
      AND (kb.metadata->>'event_date')::date < CURRENT_DATE
    RETURNING kb.id
  )
  SELECT 
    COUNT(*)::integer,
    ARRAY_AGG(id)
  INTO event_count, event_ids
  FROM archived_events;

  IF event_count > 0 THEN
    RAISE NOTICE '📚 Archived % expired event(s) in knowledge base', event_count;
  END IF;

  RETURN QUERY SELECT event_count, 'events'::text, event_ids;

END;
$$;

COMMENT ON FUNCTION archive_expired_kb_entries IS 
  'Archives expired offers and events in knowledge_base by setting status=''archived''. ' ||
  'Runs daily via cron to prevent chat from mentioning expired time-bound content.';

-- ============================================================================
-- Setup pg_cron extension (if not already enabled)
-- ============================================================================

-- Enable pg_cron extension for scheduled jobs
-- Note: This requires Supabase Pro or higher
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Schedule the cron job
-- ============================================================================

-- Run archive_expired_kb_entries() daily at 2 AM UTC
-- Note: Uncomment this once pg_cron is enabled
/*
SELECT cron.schedule(
  'archive-expired-kb-entries',           -- Job name
  '0 2 * * *',                             -- Cron expression: 2 AM UTC daily
  $$SELECT * FROM archive_expired_kb_entries()$$
);
*/

-- ============================================================================
-- Manual Execution (for testing)
-- ============================================================================

-- To manually run the archiving process:
-- SELECT * FROM archive_expired_kb_entries();

-- To check current cron jobs:
-- SELECT * FROM cron.job;

-- To delete the cron job if needed:
-- SELECT cron.unschedule('archive-expired-kb-entries');

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check for expired offers still active in KB
-- SELECT 
--   kb.id,
--   kb.title,
--   kb.status,
--   kb.metadata->>'offer_name' as offer_name,
--   kb.metadata->>'offer_end_date' as end_date
-- FROM knowledge_base kb
-- WHERE 
--   kb.knowledge_type = 'custom_knowledge'
--   AND kb.metadata->>'type' = 'offer'
--   AND kb.status = 'active'
--   AND (kb.metadata->>'offer_end_date')::date < CURRENT_DATE;

-- Check for expired events still active in KB
-- SELECT 
--   kb.id,
--   kb.title,
--   kb.status,
--   kb.metadata->>'event_name' as event_name,
--   kb.metadata->>'event_date' as event_date
-- FROM knowledge_base kb
-- WHERE 
--   kb.knowledge_type = 'event'
--   AND kb.status = 'active'
--   AND (kb.metadata->>'event_date')::date < CURRENT_DATE;
