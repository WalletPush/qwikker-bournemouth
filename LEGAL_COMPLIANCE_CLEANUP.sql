-- ============================================================================
-- GOOGLE REVIEW TEXT REMOVAL - LEGAL COMPLIANCE
-- ============================================================================
-- Date: 2026-02-02
-- Purpose: Remove all stored Google review text to comply with Google ToS
-- Impact: Nulls out google_reviews_highlights column (keeping rating + review_count)
-- ============================================================================

-- STEP 1: Check current state (how many businesses have review text)
SELECT 
  COUNT(*) AS total_businesses,
  COUNT(google_reviews_highlights) AS businesses_with_review_text,
  ROUND(COUNT(google_reviews_highlights) * 100.0 / NULLIF(COUNT(*), 0), 2) AS percentage_with_text
FROM business_profiles;

-- STEP 2: Preview which businesses will be affected
SELECT 
  id,
  business_name,
  city,
  rating,
  review_count,
  CASE 
    WHEN google_reviews_highlights IS NOT NULL THEN 'HAS REVIEW TEXT ❌'
    ELSE 'NO REVIEW TEXT ✅'
  END AS status,
  CASE 
    WHEN google_reviews_highlights IS NOT NULL 
    THEN jsonb_array_length(google_reviews_highlights)::text || ' reviews stored'
    ELSE 'None'
  END AS review_count_in_json
FROM business_profiles
WHERE google_reviews_highlights IS NOT NULL
ORDER BY city, business_name
LIMIT 50;

-- STEP 3: Verify rating and review_count will be preserved
SELECT 
  COUNT(*) AS total_businesses,
  COUNT(rating) AS businesses_with_rating,
  COUNT(review_count) AS businesses_with_review_count,
  COUNT(google_reviews_highlights) AS businesses_with_review_text,
  AVG(rating)::numeric(10,2) AS avg_rating,
  SUM(review_count) AS total_review_count
FROM business_profiles;

-- ============================================================================
-- STEP 4: NULL OUT ALL REVIEW TEXT (⚠️ CANNOT BE UNDONE)
-- ============================================================================
-- IMPORTANT: This preserves rating and review_count, only removes text
-- Run this when ready to comply with Google ToS
-- ============================================================================

UPDATE business_profiles
SET google_reviews_highlights = NULL
WHERE google_reviews_highlights IS NOT NULL;

-- ============================================================================
-- STEP 5: Verify cleanup completed
-- ============================================================================

SELECT 
  COUNT(*) AS total_businesses,
  COUNT(google_reviews_highlights) AS businesses_with_review_text,
  COUNT(rating) AS businesses_with_rating,
  COUNT(review_count) AS businesses_with_review_count,
  AVG(rating)::numeric(10,2) AS avg_rating,
  SUM(review_count) AS total_review_count
FROM business_profiles;

-- Expected result: businesses_with_review_text = 0
-- Expected result: rating/review_count counts UNCHANGED from Step 3

-- ============================================================================
-- STEP 6: Optional - Check if any knowledge_base rows contain review text
-- ============================================================================

SELECT 
  id,
  business_id,
  knowledge_type,
  title,
  status,
  LEFT(content, 150) AS content_preview,
  tags,
  created_at
FROM knowledge_base
WHERE (
  LOWER(content) LIKE '%google review%' OR
  LOWER(content) LIKE '%— %' OR -- Review attribution pattern
  LOWER(title) LIKE '%review%' OR
  LOWER(title) LIKE '%google%'
)
AND business_id IS NOT NULL
AND status = 'active'
ORDER BY created_at DESC
LIMIT 50;

-- ⚠️ WARNING: Only archive KB rows if you're CERTAIN they're review-specific
-- Do NOT archive menu PDFs, offer descriptions, or business info!
-- 
-- If you find review-specific rows (e.g., title="Google Reviews Summary"):
-- 
-- UPDATE knowledge_base
-- SET status = 'archived'
-- WHERE id IN ('uuid1', 'uuid2', ...);

-- ============================================================================
-- STEP 7: Verification Summary
-- ============================================================================

SELECT 
  '✅ COMPLIANCE COMPLETE' AS status,
  CASE 
    WHEN COUNT(google_reviews_highlights) = 0 THEN '✅ No review text stored'
    ELSE '❌ STILL HAS REVIEW TEXT!'
  END AS review_text_status,
  CASE 
    WHEN COUNT(rating) > 0 THEN '✅ Ratings preserved'
    ELSE '⚠️ No ratings'
  END AS ratings_status,
  CASE 
    WHEN COUNT(review_count) > 0 THEN '✅ Review counts preserved'
    ELSE '⚠️ No review counts'
  END AS counts_status,
  COUNT(*) AS total_businesses,
  COUNT(rating) AS with_rating,
  COUNT(review_count) AS with_count
FROM business_profiles;

-- ============================================================================
-- END OF CLEANUP SCRIPT
-- ============================================================================
