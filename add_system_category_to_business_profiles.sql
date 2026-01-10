-- ⚠️ DEPRECATED: DO NOT USE THIS FILE
-- This was the original "all-in-one" migration that could brick production

-- USE INSTEAD:
-- 1. migrations/phase1_add_system_category.sql (safe, deploy first)
-- 2. migrations/phase2_tighten_system_category.sql (deploy after code updates)

-- See CATEGORY_MIGRATION_PRODUCTION_SAFE.md for details

-- Why this was too aggressive:
-- - NOT NULL too early (breaks inserts)
-- - CHECK constraint too early (breaks on bad mappings)
-- - Renames column immediately (breaks existing code)
-- - No safety gap for testing

-- The 2-phase approach is production-safe and allows gradual rollout
