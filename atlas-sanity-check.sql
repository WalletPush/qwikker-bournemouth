-- ATLAS HUD & SEARCH SANITY CHECK
-- Verify all field names match what the code expects

-- 1. BASIC BUSINESS DATA (what Atlas receives)
SELECT 
  id,
  business_name,
  display_category,
  rating,
  review_count,
  latitude,
  longitude,
  business_tier,
  status,
  phone,
  website_url,
  google_place_id
FROM business_profiles
WHERE city = 'bali'
  AND google_reviews_highlights IS NOT NULL
  AND jsonb_array_length(google_reviews_highlights) > 0
LIMIT 3;

-- 2. REVIEW STRUCTURE (CRITICAL - is it 'author' or 'author_name'?)
SELECT 
  business_name,
  rating,
  jsonb_pretty(google_reviews_highlights->0) as first_review_structure,
  jsonb_array_length(google_reviews_highlights) as total_reviews
FROM business_profiles
WHERE city = 'bali'
  AND google_reviews_highlights IS NOT NULL
  AND jsonb_array_length(google_reviews_highlights) > 0
LIMIT 3;

-- 3. REVIEW FIELD EXTRACTION (what HUD code looks for)
SELECT 
  business_name,
  google_reviews_highlights->0->>'text' as review_text,
  google_reviews_highlights->0->>'author' as review_author,
  google_reviews_highlights->0->>'rating' as review_rating,
  google_reviews_highlights->0->>'time' as review_time,
  google_reviews_highlights->0->>'profile_photo' as review_photo
FROM business_profiles
WHERE city = 'bali'
  AND google_reviews_highlights IS NOT NULL
  AND jsonb_array_length(google_reviews_highlights) > 0
LIMIT 3;

-- 4. FIELD EXISTENCE CHECK (how many businesses have each field)
SELECT 
  COUNT(*) as total_businesses,
  COUNT(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL) as has_coordinates,
  COUNT(*) FILTER (WHERE rating IS NOT NULL) as has_rating,
  COUNT(*) FILTER (WHERE review_count IS NOT NULL) as has_review_count,
  COUNT(*) FILTER (WHERE display_category IS NOT NULL) as has_category,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) as has_phone,
  COUNT(*) FILTER (WHERE website_url IS NOT NULL) as has_website,
  COUNT(*) FILTER (WHERE google_place_id IS NOT NULL) as has_google_id,
  COUNT(*) FILTER (WHERE google_reviews_highlights IS NOT NULL) as has_reviews,
  COUNT(*) FILTER (WHERE business_tier IS NOT NULL) as has_tier
FROM business_profiles
WHERE city = 'bali';

-- 5. REVIEW JSONB KEYS (what keys actually exist in the review object)
SELECT DISTINCT
  jsonb_object_keys(google_reviews_highlights->0) as review_field_name
FROM business_profiles
WHERE city = 'bali'
  AND google_reviews_highlights IS NOT NULL
  AND jsonb_array_length(google_reviews_highlights) > 0
ORDER BY review_field_name;
