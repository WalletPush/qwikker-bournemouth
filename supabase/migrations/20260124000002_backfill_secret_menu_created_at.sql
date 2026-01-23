-- Migration: Backfill item_created_at for Secret Menu KB Rows
-- Purpose: Add deterministic ID to legacy secret menu KB entries
-- Date: 2026-01-24
-- CRITICAL: Run this BEFORE relying on deterministic archiving

-- ============================================================================
-- PROBLEM: Old KB rows missing metadata.item_created_at
-- ============================================================================

-- Old secret menu KB rows were created without item_created_at field
-- This makes deterministic archiving impossible (falls back to name-based)

-- ============================================================================
-- SOLUTION: Backfill from business_profiles.additional_notes JSON
-- ============================================================================

DO $$
DECLARE
  kb_row RECORD;
  profile_row RECORD;
  notes_data jsonb;
  secret_items jsonb;
  matching_item jsonb;
  backfill_count integer := 0;
BEGIN
  
  -- Loop through all active secret menu KB rows missing item_created_at
  FOR kb_row IN 
    SELECT 
      kb.id,
      kb.business_id,
      kb.city,
      kb.title,
      kb.metadata
    FROM knowledge_base kb
    WHERE 
      kb.status = 'active'
      AND kb.knowledge_type = 'custom_knowledge'
      AND kb.metadata->>'type' = 'secret_menu'
      AND (
        kb.metadata->>'item_created_at' IS NULL 
        OR kb.metadata->>'item_created_at' = ''
      )
  LOOP
    
    -- Get business profile with additional_notes JSON
    SELECT 
      bp.id,
      bp.additional_notes
    INTO profile_row
    FROM business_profiles bp
    WHERE bp.id = kb_row.business_id;
    
    IF profile_row.additional_notes IS NOT NULL THEN
      BEGIN
        -- Parse additional_notes JSON
        notes_data := profile_row.additional_notes::jsonb;
        
        -- Get secret_menu_items array
        IF notes_data ? 'secret_menu_items' THEN
          secret_items := notes_data->'secret_menu_items';
          
          -- Find matching item by name
          IF jsonb_typeof(secret_items) = 'array' THEN
            FOR i IN 0..jsonb_array_length(secret_items) - 1 LOOP
              matching_item := secret_items->i;
              
              -- Match by item name
              IF (matching_item->>'itemName' = kb_row.metadata->>'item_name') THEN
                
                -- Update KB row with created_at from JSON
                UPDATE knowledge_base
                SET 
                  metadata = jsonb_set(
                    metadata,
                    '{item_created_at}',
                    to_jsonb(matching_item->>'created_at')
                  ),
                  updated_at = NOW()
                WHERE id = kb_row.id;
                
                backfill_count := backfill_count + 1;
                
                RAISE NOTICE 'Backfilled item_created_at for: % (KB id: %, created_at: %)',
                  kb_row.metadata->>'item_name',
                  kb_row.id,
                  matching_item->>'created_at';
                
                EXIT; -- Found match, move to next KB row
              END IF;
            END LOOP;
          END IF;
        END IF;
        
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to parse additional_notes for business_id=%: %', 
            kb_row.business_id, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Backfilled item_created_at for % secret menu KB rows', backfill_count;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================================

-- Check how many secret menu KB rows still missing item_created_at
-- SELECT 
--   status,
--   COUNT(*) as count,
--   COUNT(CASE WHEN metadata->>'item_created_at' IS NULL THEN 1 END) as missing_created_at,
--   COUNT(CASE WHEN metadata->>'item_created_at' IS NOT NULL THEN 1 END) as has_created_at
-- FROM knowledge_base
-- WHERE 
--   knowledge_type = 'custom_knowledge'
--   AND metadata->>'type' = 'secret_menu'
-- GROUP BY status;
-- Expected: missing_created_at = 0 for active rows

-- Show sample backfilled rows
-- SELECT 
--   id,
--   title,
--   metadata->>'item_name' as item_name,
--   metadata->>'item_created_at' as item_created_at,
--   status,
--   city
-- FROM knowledge_base
-- WHERE 
--   knowledge_type = 'custom_knowledge'
--   AND metadata->>'type' = 'secret_menu'
--   AND updated_at > NOW() - INTERVAL '5 minutes'
-- ORDER BY updated_at DESC
-- LIMIT 10;
