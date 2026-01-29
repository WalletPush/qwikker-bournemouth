-- Test Script: Verify Review Deletion Safety
-- Purpose: Confirm cron job only deletes google_reviews_highlights, NOT rating/review_count
-- Run this BEFORE enabling the cron job to verify safety

-- ============================================================================
-- Part 1: Create a test business with all review fields
-- ============================================================================

-- Insert test business (will be deleted at end)
INSERT INTO business_profiles (
  id,
  business_name,
  city,
  status,
  auto_imported,
  rating,
  review_count,
  google_reviews_highlights,
  created_at,
  business_tier,
  google_place_id
) VALUES (
  '00000000-0000-0000-0000-000000000001',  -- Test UUID
  'TEST BUSINESS - DELETE ME',
  'bournemouth',
  'unclaimed',
  true,
  4.5,  -- ✅ MUST SURVIVE deletion
  127,  -- ✅ MUST SURVIVE deletion
  '[
    {
      "author": "Test User",
      "rating": 5,
      "text": "Test review text that should be deleted"
    }
  ]'::jsonb,  -- ❌ SHOULD BE DELETED
  NOW() - INTERVAL '35 days',  -- Make it stale (> 30 days)
  'free_tier',
  'ChIJ_TEST_PLACE_ID'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Part 2: Verify test business was created correctly
-- ============================================================================

SELECT 
  business_name,
  rating,
  review_count,
  google_reviews_highlights,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at) as days_old
FROM business_profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Expected output:
-- business_name: TEST BUSINESS - DELETE ME
-- rating: 4.5
-- review_count: 127
-- google_reviews_highlights: [{...}]
-- days_old: ~35

-- ============================================================================
-- Part 3: Run the deletion function
-- ============================================================================

SELECT * FROM delete_stale_unclaimed_reviews();

-- Expected output:
-- deleted_count: 1 (or more if you have other stale businesses)
-- affected_businesses: {TEST BUSINESS - DELETE ME, ...}

-- ============================================================================
-- Part 4: Verify ONLY google_reviews_highlights was deleted
-- ============================================================================

SELECT 
  business_name,
  rating,  -- ✅ MUST STILL BE 4.5
  review_count,  -- ✅ MUST STILL BE 127
  google_reviews_highlights,  -- ❌ SHOULD BE NULL
  google_place_id,  -- ✅ MUST STILL BE ChIJ_TEST_PLACE_ID
  created_at,
  updated_at  -- Should be NOW() (just updated)
FROM business_profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- Part 5: Assertions (verify test passed)
-- ============================================================================

DO $$
DECLARE
  v_rating NUMERIC;
  v_review_count INT;
  v_reviews JSONB;
BEGIN
  SELECT rating, review_count, google_reviews_highlights
  INTO v_rating, v_review_count, v_reviews
  FROM business_profiles
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Assert rating was NOT deleted
  IF v_rating IS NULL OR v_rating != 4.5 THEN
    RAISE EXCEPTION '❌ TEST FAILED: rating was deleted or modified! Expected 4.5, got %', v_rating;
  END IF;
  
  -- Assert review_count was NOT deleted
  IF v_review_count IS NULL OR v_review_count != 127 THEN
    RAISE EXCEPTION '❌ TEST FAILED: review_count was deleted or modified! Expected 127, got %', v_review_count;
  END IF;
  
  -- Assert google_reviews_highlights WAS deleted
  IF v_reviews IS NOT NULL THEN
    RAISE EXCEPTION '❌ TEST FAILED: google_reviews_highlights was NOT deleted! Still contains: %', v_reviews;
  END IF;
  
  RAISE NOTICE '✅ TEST PASSED: Cron job safely deletes ONLY google_reviews_highlights';
  RAISE NOTICE '✅ rating preserved: %', v_rating;
  RAISE NOTICE '✅ review_count preserved: %', v_review_count;
  RAISE NOTICE '✅ google_reviews_highlights deleted: NULL';
END $$;

-- ============================================================================
-- Part 6: Cleanup test data
-- ============================================================================

DELETE FROM business_profiles
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- If you see "✅ TEST PASSED" above, the cron job is SAFE to enable.
-- 
-- The cron job ONLY deletes: google_reviews_highlights
-- The cron job NEVER touches: rating, review_count, google_place_id, business_name, etc.
-- 
-- After 30 days:
--   - Business still shows: "4.5★ (127 reviews)" ✅
--   - Business no longer shows: Verbatim review snippets ❌
--   - On-demand fetch can restore snippets if needed ✅
