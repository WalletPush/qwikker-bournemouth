-- Phase 3: Add manual discover ordering controls
-- ⚠️ DO NOT RUN YET - This is for future use when manual control is needed
-- 
-- Run this migration when you need to:
-- - Feature/promote specific businesses manually
-- - Pin businesses to specific positions
-- - Override algorithmic ordering for special cases
--
-- Location: /docs/sql/ (not in migrations/ to prevent auto-run)

-- Add featured flag (for manual spotlight/promotion)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add manual ordering
-- CRITICAL: NULL default (not 0) so only manually ordered businesses use this
-- 0 would make every business "manually ordered" by accident
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_is_featured 
ON business_profiles(is_featured) 
WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_business_profiles_display_order 
ON business_profiles(display_order)
WHERE display_order IS NOT NULL;

-- Composite index for discover ordering (add when you have 100+ businesses per city)
-- CRITICAL: Include city/status in index for multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_business_profiles_discover_order 
ON business_profiles(city, status, is_featured DESC, display_order ASC NULLS LAST, rating DESC, created_at DESC)
WHERE status IN ('approved', 'unclaimed', 'claimed_free');

-- Comments
COMMENT ON COLUMN business_profiles.is_featured IS 'Manually promoted business - shows higher in Discover feed';
COMMENT ON COLUMN business_profiles.display_order IS 'Manual ordering - NULL = use algorithmic ordering, lower number = higher priority';

-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻
-- USAGE EXAMPLE (after running this migration):
-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

-- Feature a specific business (manual promotion)
-- UPDATE business_profiles
-- SET is_featured = true
-- WHERE id = 'business-uuid-here';

-- Pin a business to position 1 (shows first)
-- UPDATE business_profiles
-- SET display_order = 1
-- WHERE id = 'business-uuid-here';

-- Pin another business to position 2
-- UPDATE business_profiles
-- SET display_order = 2
-- WHERE id = 'another-uuid-here';

-- Remove manual ordering (back to algorithmic)
-- UPDATE business_profiles
-- SET display_order = NULL
-- WHERE id = 'business-uuid-here';

-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻
-- QUERY PATTERN (update in app/user/discover/page.tsx):
-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

-- Option A: Supabase JS (if ordering is simple)
-- .order('is_featured', { ascending: false })
-- .order('display_order', { ascending: true, nullsFirst: false })
-- .order('rating', { ascending: false, nullsFirst: false })
-- .order('review_count', { ascending: false, nullsFirst: false })
-- .order('created_at', { ascending: false })

-- Option B: RPC function (if ordering is complex with CASE statements)
-- CREATE OR REPLACE FUNCTION get_discover_feed(p_city TEXT)
-- RETURNS SETOF business_profiles AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT *
--   FROM business_profiles
--   WHERE city = p_city
--     AND status IN ('approved', 'unclaimed', 'claimed_free')
--   ORDER BY 
--     is_featured DESC,
--     display_order ASC NULLS LAST,  -- NULL = not manually ordered
--     rating DESC NULLS LAST,
--     review_count DESC NULLS LAST,
--     created_at DESC;
-- END;
-- $$ LANGUAGE plpgsql STABLE;

-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻
-- PERFORMANCE NOTE:
-- ⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻

-- With 16 businesses: No indexes needed, query is instant
-- With 100+ businesses per city: Composite index becomes important
-- With 1000+ businesses per city: Consider materialized view or pre-sorted results

-- Test query performance with:
-- EXPLAIN ANALYZE
-- SELECT * FROM business_profiles
-- WHERE city = 'bournemouth' 
--   AND status IN ('approved', 'unclaimed', 'claimed_free')
-- ORDER BY is_featured DESC, display_order ASC NULLS LAST, rating DESC NULLS LAST;

-- If "Seq Scan" shows up, add the composite index above

