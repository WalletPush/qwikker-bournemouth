-- Function: Archive Expired Offers and Events in Knowledge Base
-- Purpose: Set status='archived' for KB entries where offers/events have expired
-- Runs: Daily via cron job (recommended: 2 AM UTC)
-- Date: 2026-01-24

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
  -- ============================================================================
  -- Archive EXPIRED OFFERS in knowledge base
  -- ============================================================================
  
  -- Find and archive offers where end_date has passed
  WITH archived_offers AS (
    UPDATE knowledge_base kb
    SET 
      status = 'archived',
      updated_at = NOW()
    WHERE 
      kb.status = 'active'
      AND kb.knowledge_type = 'custom_knowledge'
      AND kb.metadata->>'type' = 'offer'
      AND kb.metadata->>'offer_id' IS NOT NULL  -- Only archive real offers (not summaries)
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

  -- Log archived offers
  IF offer_count > 0 THEN
    RAISE NOTICE '📚 Archived % expired offer(s) in knowledge base', offer_count;
  END IF;

  -- Return offer results
  RETURN QUERY SELECT offer_count, 'offers'::text, offer_ids;

  -- ============================================================================
  -- Archive EXPIRED EVENTS in knowledge base
  -- ============================================================================
  
  -- Find and archive events where event_date has passed
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

  -- Log archived events
  IF event_count > 0 THEN
    RAISE NOTICE '📚 Archived % expired event(s) in knowledge base', event_count;
  END IF;

  -- Return event results
  RETURN QUERY SELECT event_count, 'events'::text, event_ids;

END;
$$;

-- ============================================================================
-- Add helpful comment
-- ============================================================================

COMMENT ON FUNCTION archive_expired_kb_entries IS 
  'Archives expired offers and events in knowledge_base by setting status=''archived''. ' ||
  'Runs daily via cron to prevent chat from mentioning expired time-bound content. ' ||
  'Only archives entries with valid IDs (protects against "Current Offers" contamination). ' ||
  'Returns count and IDs of archived entries for logging.';

-- ============================================================================
-- Test the function manually
-- ============================================================================

-- To test:
-- SELECT * FROM archive_expired_kb_entries();

-- Expected output:
-- | archived_count | archived_type | archived_ids |
-- |----------------|---------------|--------------|
-- | 2              | offers        | {uuid1, uuid2} |
-- | 1              | events        | {uuid3}      |
