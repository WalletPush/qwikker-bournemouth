-- Migration: One-Time Cleanup of KB Contamination
-- Purpose: Archive "Current Offers" poison rows and any other contamination
-- Date: 2026-01-24
-- Run Once: This is a cleanup migration, not ongoing logic

-- ============================================================================
-- CLEANUP 1: Archive "Current Offers" contamination rows
-- ============================================================================

-- These are poison rows like "David's Grill Shack - Current Offers"
-- They have no real offer_id and contain outdated text
UPDATE knowledge_base
SET 
  status = 'archived',
  updated_at = NOW()
WHERE 
  status = 'active'
  AND knowledge_type = 'custom_knowledge'
  AND metadata->>'type' = 'offer'
  AND (
    metadata->>'offer_id' IS NULL  -- No real offer ID
    OR metadata->>'offer_id' = ''  -- Empty offer ID
  );

-- Log the cleanup
DO $$
DECLARE
  contamination_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO contamination_count
  FROM knowledge_base
  WHERE 
    status = 'archived'
    AND knowledge_type = 'custom_knowledge'
    AND metadata->>'type' = 'offer'
    AND (metadata->>'offer_id' IS NULL OR metadata->>'offer_id' = '')
    AND updated_at > NOW() - INTERVAL '1 minute';
  
  RAISE NOTICE '🧹 Archived % "Current Offers" contamination rows', contamination_count;
END $$;

-- ============================================================================
-- CLEANUP 2: Archive any KB rows for deleted/missing offers
-- ============================================================================

-- Find KB offer rows where the offer no longer exists in business_offers
UPDATE knowledge_base kb
SET 
  status = 'archived',
  updated_at = NOW()
WHERE 
  kb.status = 'active'
  AND kb.knowledge_type = 'custom_knowledge'
  AND kb.metadata->>'type' = 'offer'
  AND kb.metadata->>'offer_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM business_offers bo 
    WHERE bo.id::text = kb.metadata->>'offer_id'
  );

-- Log the cleanup
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO orphan_count
  FROM knowledge_base kb
  WHERE 
    kb.status = 'archived'
    AND kb.knowledge_type = 'custom_knowledge'
    AND kb.metadata->>'type' = 'offer'
    AND kb.metadata->>'offer_id' IS NOT NULL
    AND kb.updated_at > NOW() - INTERVAL '1 minute'
    AND NOT EXISTS (
      SELECT 1 
      FROM business_offers bo 
      WHERE bo.id::text = kb.metadata->>'offer_id'
    );
  
  RAISE NOTICE '🧹 Archived % orphaned offer KB rows (offer deleted)', orphan_count;
END $$;

-- ============================================================================
-- CLEANUP 3: Archive any KB rows for deleted/missing events
-- ============================================================================

UPDATE knowledge_base kb
SET 
  status = 'archived',
  updated_at = NOW()
WHERE 
  kb.status = 'active'
  AND kb.knowledge_type = 'event'
  AND kb.metadata->>'event_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM business_events be 
    WHERE be.id::text = kb.metadata->>'event_id'
  );

-- Log the cleanup
DO $$
DECLARE
  orphan_event_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO orphan_event_count
  FROM knowledge_base kb
  WHERE 
    kb.status = 'archived'
    AND kb.knowledge_type = 'event'
    AND kb.metadata->>'event_id' IS NOT NULL
    AND kb.updated_at > NOW() - INTERVAL '1 minute'
    AND NOT EXISTS (
      SELECT 1 
      FROM business_events be 
      WHERE be.id::text = kb.metadata->>'event_id'
    );
  
  RAISE NOTICE '🧹 Archived % orphaned event KB rows (event deleted)', orphan_event_count;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check if any contamination still exists
-- SELECT 
--   COUNT(*) as contamination_count,
--   status
-- FROM knowledge_base
-- WHERE 
--   knowledge_type = 'custom_knowledge'
--   AND metadata->>'type' = 'offer'
--   AND (metadata->>'offer_id' IS NULL OR metadata->>'offer_id' = '')
-- GROUP BY status;
-- Expected: status='archived' only

-- Check if any orphaned KB rows still exist
-- SELECT 
--   COUNT(*) as orphan_count,
--   kb.status
-- FROM knowledge_base kb
-- LEFT JOIN business_offers bo ON bo.id::text = kb.metadata->>'offer_id'
-- WHERE 
--   kb.knowledge_type = 'custom_knowledge'
--   AND kb.metadata->>'type' = 'offer'
--   AND kb.metadata->>'offer_id' IS NOT NULL
--   AND bo.id IS NULL
-- GROUP BY kb.status;
-- Expected: status='archived' only
