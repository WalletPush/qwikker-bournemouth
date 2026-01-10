-- ==========================================
-- PHASE 1: ADD CATEGORY LAYERS (SAFE, NON-BREAKING)
-- ==========================================
-- This migration adds the 3-layer category system without breaking anything
-- Can be deployed independently of code changes

-- ==========================================
-- PRE-FLIGHT CHECK: Verify business_category exists
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'business_profiles' 
      AND column_name = 'business_category'
  ) THEN
    RAISE EXCEPTION 'Column business_category does not exist in business_profiles table! Migration cannot proceed.';
  END IF;
  
  RAISE NOTICE '✅ Pre-flight check passed: business_category column exists';
END $$;

-- Layer 1: Raw Google Place types (import-only, preserves source data)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS google_types text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN business_profiles.google_types IS 'Raw Google Place API types. Import-only. Example: ["cafe", "coffee_shop", "restaurant"]. Used to derive system_category.';

-- Layer 2: System category (stable enum) - NULLABLE for now
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS system_category TEXT;

COMMENT ON COLUMN business_profiles.system_category IS 'Stable internal category enum. Drives: placeholders, AI, filtering, analytics. Never changes unless admin corrects miscategorization.';

-- Layer 3: Display category (cosmetic label) - COPY from business_category
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS display_category TEXT;

-- Copy existing business_category data to display_category
-- (We're NOT renaming yet - that's too risky for one migration)
UPDATE business_profiles
SET display_category = business_category
WHERE display_category IS NULL AND business_category IS NOT NULL;

COMMENT ON COLUMN business_profiles.display_category IS 'User-facing label shown on cards and pages. Purely cosmetic. Example: "Cafe / Coffee Shop". Can change anytime without breaking logic.';

-- ==========================================
-- BACKFILL system_category FROM display_category
-- ==========================================
-- Hard mapping table to handle ALL possible label variations
-- COALESCE used for NULL-safety

UPDATE business_profiles
SET system_category = CASE
  -- Food & Drink (order matters - be specific)
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('restaurant', 'restaurants') THEN 'restaurant'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('cafe/coffee shop', 'cafe / coffee shop', 'cafe', 'coffee shop', 'coffee') THEN 'cafe'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('bar/pub', 'bar / pub', 'bar', 'pub', 'bars', 'pubs') THEN 'bar'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('dessert/ice cream', 'dessert / ice cream', 'dessert', 'ice cream', 'desserts') THEN 'dessert'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('takeaway/street food', 'takeaway / street food', 'takeaway', 'street food', 'fast food') THEN 'takeaway'
  
  -- Beauty & Wellness
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('salon/spa', 'salon / spa', 'salon', 'spa', 'beauty salon', 'nail salon') THEN 'salon'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('hairdresser/barber', 'hairdresser / barber', 'hairdresser', 'barber', 'barbershop', 'barber shop') THEN 'barber'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('tattoo/piercing', 'tattoo / piercing', 'tattoo', 'piercing', 'tattoo shop') THEN 'tattoo'
  
  -- Retail & Shopping
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('clothing/fashion', 'clothing / fashion', 'clothing', 'fashion', 'gift shop', 'gift', 'retail', 'shop') THEN 'retail'
  
  -- Fitness & Sports
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('fitness/gym', 'fitness / gym', 'fitness', 'gym', 'fitness center') THEN 'fitness'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('sports/outdoors', 'sports / outdoors', 'sports', 'outdoors', 'outdoor', 'sporting goods') THEN 'sports'
  
  -- Hospitality & Events
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('hotel/bnb', 'hotel / bnb', 'hotel', 'bnb', 'b&b', 'bed and breakfast', 'accommodation') THEN 'hotel'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('venue/event space', 'venue / event space', 'venue', 'event space', 'events') THEN 'venue'
  
  -- Entertainment & Services
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('entertainment/attractions', 'entertainment / attractions', 'entertainment', 'attractions', 'attraction') THEN 'entertainment'
  WHEN LOWER(TRIM(COALESCE(display_category, ''))) IN ('professional services', 'professional', 'services') THEN 'professional'
  
  -- Fuzzy fallbacks (check for keywords)
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%restaurant%' THEN 'restaurant'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%cafe%' OR LOWER(COALESCE(display_category, '')) LIKE '%coffee%' THEN 'cafe'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%bar%' OR LOWER(COALESCE(display_category, '')) LIKE '%pub%' THEN 'bar'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%dessert%' OR LOWER(COALESCE(display_category, '')) LIKE '%ice cream%' THEN 'dessert'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%takeaway%' OR LOWER(COALESCE(display_category, '')) LIKE '%fast food%' THEN 'takeaway'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%salon%' OR LOWER(COALESCE(display_category, '')) LIKE '%spa%' THEN 'salon'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%barber%' OR LOWER(COALESCE(display_category, '')) LIKE '%hairdresser%' THEN 'barber'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%tattoo%' OR LOWER(COALESCE(display_category, '')) LIKE '%piercing%' THEN 'tattoo'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%clothing%' OR LOWER(COALESCE(display_category, '')) LIKE '%fashion%' OR LOWER(COALESCE(display_category, '')) LIKE '%gift%' THEN 'retail'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%fitness%' OR LOWER(COALESCE(display_category, '')) LIKE '%gym%' THEN 'fitness'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%sport%' OR LOWER(COALESCE(display_category, '')) LIKE '%outdoor%' THEN 'sports'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%hotel%' OR LOWER(COALESCE(display_category, '')) LIKE '%bnb%' THEN 'hotel'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%venue%' OR LOWER(COALESCE(display_category, '')) LIKE '%event%' THEN 'venue'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%entertainment%' OR LOWER(COALESCE(display_category, '')) LIKE '%attraction%' THEN 'entertainment'
  WHEN LOWER(COALESCE(display_category, '')) LIKE '%professional%' OR LOWER(COALESCE(display_category, '')) LIKE '%service%' THEN 'professional'
  
  -- Final fallback
  ELSE 'other'
END
WHERE system_category IS NULL;

-- ==========================================
-- ADD INDEX FOR FILTERING (PERFORMANCE)
-- ==========================================
-- Note: If table is large (1000+ rows) and in production, consider using CONCURRENTLY
-- to avoid write locks. However, CONCURRENTLY can't run inside a transaction.

CREATE INDEX IF NOT EXISTS business_profiles_system_category_idx
ON business_profiles (system_category);

-- If you need concurrent index creation (for large tables), use this instead:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS business_profiles_system_category_idx
-- ON business_profiles (system_category);

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Show the mapping results
SELECT 
  system_category,
  display_category,
  COUNT(*) as business_count
FROM business_profiles
GROUP BY system_category, display_category
ORDER BY system_category, business_count DESC;

-- Show any NULL system_category rows (should be none if backfill worked)
SELECT 
  id,
  business_name,
  display_category,
  system_category
FROM business_profiles
WHERE system_category IS NULL
LIMIT 10;

-- Show distribution of system_category
SELECT 
  system_category,
  COUNT(*) as count
FROM business_profiles
GROUP BY system_category
ORDER BY count DESC;

-- Show any INVALID system_category values (should be NONE)
-- This is a sanity check before Phase 2
SELECT 
  system_category,
  COUNT(*) as invalid_count
FROM business_profiles
WHERE system_category NOT IN (
  'restaurant','cafe','bar','dessert','takeaway','salon','barber','tattoo',
  'retail','fitness','sports','hotel','venue','entertainment','professional','other'
)
GROUP BY system_category;

-- If the above query returns any rows, you have invalid categories!
-- Fix them before running Phase 2

-- ==========================================
-- PHASE 1 COMPLETE
-- ==========================================
-- Next steps:
-- 1. Verify the backfill worked correctly (check queries above)
-- 2. Update code to use system_category and display_category
-- 3. Test thoroughly in dev/staging
-- 4. Deploy code to production
-- 5. Monitor for 24-48 hours
-- 6. THEN run Phase 2 (002_lock_system_category.sql)

