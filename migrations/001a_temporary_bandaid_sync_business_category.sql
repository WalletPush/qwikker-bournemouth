-- ==========================================
-- TEMPORARY BAND-AID: Sync business_category from display_category
-- ==========================================
-- This trigger ensures new businesses don't break validation checks
-- that still read from business_category (legacy field)
--
-- ⚠️ THIS IS TEMPORARY! Remove this trigger before Phase 2.
--
-- Why we need this:
-- 1. Phase 1 stopped WRITING to business_category
-- 2. But 150+ files still READ from it
-- 3. This buys time to fix read paths incrementally
--
-- Exit condition (remove trigger when):
-- - rg "\.business_category\b" app lib components | wc -l is near zero
-- - Before running Phase 2 (002_lock_system_category.sql)
--
-- Safer variant (ChatGPT-recommended):
-- - Always runs on INSERT
-- - Only runs on UPDATE when display_category changes
-- - This prevents masking bugs where business_category gets set to NULL

CREATE OR REPLACE FUNCTION tmp_sync_business_category_from_display()
RETURNS TRIGGER AS $$
BEGIN
  -- Always handle inserts
  IF TG_OP = 'INSERT' THEN
    IF NEW.display_category IS NOT NULL AND NEW.business_category IS NULL THEN
      NEW.business_category := NEW.display_category;
    END IF;
    RETURN NEW;
  END IF;

  -- Updates: only act if display_category changed
  IF TG_OP = 'UPDATE' AND NEW.display_category IS DISTINCT FROM OLD.display_category THEN
    IF NEW.display_category IS NOT NULL AND NEW.business_category IS NULL THEN
      NEW.business_category := NEW.display_category;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT and UPDATE (named clearly as temporary)
DROP TRIGGER IF EXISTS trg_tmp_sync_business_category ON business_profiles;

CREATE TRIGGER trg_tmp_sync_business_category
BEFORE INSERT OR UPDATE ON business_profiles
FOR EACH ROW
EXECUTE FUNCTION tmp_sync_business_category_from_display();

-- Verify trigger was created (more reliable than information_schema)
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'business_profiles'
  AND tgname = 'trg_tmp_sync_business_category';

-- ==========================================
-- IMPORTANT: This is a temporary fix!
-- ==========================================
-- Track remaining legacy reads with:
-- rg "\.business_category\b" app lib components | wc -l
--
-- Remove this trigger when count is near zero, by running:
-- DROP TRIGGER IF EXISTS trg_tmp_sync_business_category ON business_profiles;
-- DROP FUNCTION IF EXISTS tmp_sync_business_category_from_display();


