-- Migration: Auto-Delete Stale Google Reviews (30-Day Compliance)
-- Purpose: Delete cached Google review snippets for unclaimed businesses older than 30 days
-- Reason: Google Places API ToS requires cached content to be refreshed every 30 days
-- Strategy: Option C (Hybrid) - Delete after 30 days, fetch on-demand in chat if needed
-- Date: 2026-01-28

-- ============================================================================
-- Part A: Create function to delete stale reviews
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_stale_unclaimed_reviews()
RETURNS TABLE (deleted_count INT, affected_businesses TEXT[])
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_count INT;
  v_affected_ids UUID[];
  v_affected_names TEXT[];
BEGIN
  -- Find businesses that will be affected (for logging)
  SELECT 
    ARRAY_AGG(id),
    ARRAY_AGG(business_name)
  INTO 
    v_affected_ids,
    v_affected_names
  FROM business_profiles
  WHERE 
    status = 'unclaimed'
    AND auto_imported = true
    AND google_reviews_highlights IS NOT NULL
    AND created_at < NOW() - INTERVAL '30 days';

  -- Delete stale review snippets (ONLY review text, NOT rating/count)
  -- 🔒 SAFETY: This UPDATE only sets google_reviews_highlights to NULL
  -- 🔒 SAFETY: rating and review_count are NEVER modified
  UPDATE business_profiles
  SET 
    google_reviews_highlights = NULL,  -- ✅ ONLY delete review text snippets
    updated_at = NOW()
  WHERE 
    status = 'unclaimed'
    AND auto_imported = true
    AND google_reviews_highlights IS NOT NULL
    AND created_at < NOW() - INTERVAL '30 days'
    -- 🔒 PARANOID MODE: Verify rating/review_count exist before deletion
    AND rating IS NOT NULL  -- Ensure we're not touching businesses missing rating
    AND review_count IS NOT NULL;  -- Ensure we're not touching businesses missing review count
    
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Log the deletion
  IF v_deleted_count > 0 THEN
    RAISE NOTICE '🧹 Deleted stale reviews for % unclaimed businesses (Google ToS 30-day compliance)', v_deleted_count;
  ELSE
    RAISE NOTICE '✅ No stale reviews to delete (all < 30 days old)';
  END IF;
  
  -- Return summary
  RETURN QUERY SELECT v_deleted_count, v_affected_names;
END;
$$;

COMMENT ON FUNCTION delete_stale_unclaimed_reviews IS
  'Google Places API ToS compliance: Delete review snippets for unclaimed businesses older than 30 days. ' ||
  'Rating and review_count are NOT deleted (math-only social proof is always allowed). ' ||
  'Reviews can be re-fetched on-demand during chat if needed (cost: $0.025 per fetch). ' ||
  'Only affects Tier 3 fallback chat responses. Claimed businesses never store review snippets.';

-- ============================================================================
-- Part B: Schedule daily cron job
-- ============================================================================

-- Install pg_cron extension if not already installed
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run daily at 3 AM UTC
SELECT cron.schedule(
  'delete-stale-reviews',
  '0 3 * * *',  -- Daily at 3 AM UTC
  $$SELECT delete_stale_unclaimed_reviews()$$
);

-- ============================================================================
-- Part C: Manual execution (for immediate cleanup)
-- ============================================================================

-- Run this manually if you want to clean up right now:
-- SELECT * FROM delete_stale_unclaimed_reviews();

-- ============================================================================
-- Part D: Verification queries
-- ============================================================================

-- Check how many businesses will be affected
-- SELECT COUNT(*) as businesses_with_stale_reviews
-- FROM business_profiles
-- WHERE 
--   status = 'unclaimed'
--   AND auto_imported = true
--   AND google_reviews_highlights IS NOT NULL
--   AND created_at < NOW() - INTERVAL '30 days';

-- Check review age distribution
-- SELECT 
--   CASE 
--     WHEN created_at >= NOW() - INTERVAL '7 days' THEN '< 7 days'
--     WHEN created_at >= NOW() - INTERVAL '14 days' THEN '7-14 days'
--     WHEN created_at >= NOW() - INTERVAL '30 days' THEN '14-30 days'
--     WHEN created_at >= NOW() - INTERVAL '60 days' THEN '30-60 days'
--     ELSE '> 60 days'
--   END as age_bucket,
--   COUNT(*) as business_count,
--   COUNT(CASE WHEN google_reviews_highlights IS NOT NULL THEN 1 END) as with_reviews
-- FROM business_profiles
-- WHERE status = 'unclaimed' AND auto_imported = true
-- GROUP BY age_bucket
-- ORDER BY age_bucket;

-- ============================================================================
-- Part E: Cost monitoring query (for Option C on-demand fetching)
-- ============================================================================

-- Estimate worst-case monthly cost if all stale businesses get reviews fetched on-demand
-- SELECT 
--   COUNT(*) as stale_businesses,
--   COUNT(*) * 0.025 as worst_case_monthly_cost_usd,
--   'Assumes every stale business appears in chat once per month' as assumption
-- FROM business_profiles
-- WHERE 
--   status = 'unclaimed'
--   AND auto_imported = true
--   AND google_reviews_highlights IS NULL  -- Reviews deleted after 30 days
--   AND google_place_id IS NOT NULL;  -- Can be fetched on-demand

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- This migration implements Option C (Hybrid Strategy):
-- 
-- STEP 1: Auto-delete reviews after 30 days (this cron job)
--   - Runs daily at 3 AM UTC
--   - Deletes google_reviews_highlights for unclaimed businesses > 30 days old
--   - Cost: $0
-- 
-- STEP 2: On-demand fetching during chat (lib/ai/hybrid-chat.ts)
--   - When Tier 3 triggered + business has no cached reviews + has google_place_id
--   - Fetches fresh reviews from Google Places API
--   - Cost: $0.025 per fetch
--   - Protected by:
--     1. Max 1 fetch per chat response
--     2. Only fetch when displaying snippets (shouldAttachCarousel = true)
--     3. Rate limiting (5 min cooldown per user per business)
-- 
-- WORST-CASE COST: (Tier 3 chats per month) × $0.025
--   - 1,000 Tier 3 chats/month = $25/month
--   - 10,000 Tier 3 chats/month = $250/month
-- 
-- COMPARISON:
--   - Option A (Auto-Delete Only): $0/month, no review snippets after 30 days
--   - Option C (Hybrid): $25-250/month, always fresh snippets when needed
-- 
-- RECOMMENDATION: Start with Option C for 1 month, monitor costs, switch to A if too expensive
