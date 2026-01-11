-- Backfill system_category for manual businesses with empty google_types
-- These businesses were created via onboarding form, not Google Places import

DO $$ 
DECLARE
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Finding businesses with empty google_types...';
  
  -- Update businesses where google_types is empty/null and system_category is 'other'
  -- Map based on display_category keywords
  
  -- Restaurants
  UPDATE business_profiles
  SET system_category = 'restaurant'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%restaurant%' OR
      LOWER(display_category) LIKE '%dining%' OR
      LOWER(display_category) LIKE '%steakhouse%' OR
      LOWER(display_category) LIKE '%grill%' OR
      LOWER(display_category) LIKE '%bistro%' OR
      LOWER(display_category) LIKE '%mediterranean%' OR
      LOWER(display_category) LIKE '%italian%' OR
      LOWER(display_category) LIKE '%asian%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % restaurants', updated_count;
  
  -- Cafes
  UPDATE business_profiles
  SET system_category = 'cafe'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%cafe%' OR
      LOWER(display_category) LIKE '%coffee%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % cafes', updated_count;
  
  -- Bars/Pubs
  UPDATE business_profiles
  SET system_category = 'bar'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%bar%' OR
      LOWER(display_category) LIKE '%pub%' OR
      LOWER(display_category) LIKE '%wine%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % bars', updated_count;
  
  -- Barbers/Salons
  UPDATE business_profiles
  SET system_category = 'barber'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%barber%' OR
      LOWER(display_category) LIKE '%grooming%' OR
      LOWER(display_category) LIKE '%haircut%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % barbers', updated_count;
  
  UPDATE business_profiles
  SET system_category = 'salon'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%salon%' OR
      LOWER(display_category) LIKE '%spa%' OR
      LOWER(display_category) LIKE '%beauty%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % salons', updated_count;
  
  -- Entertainment/Venues
  UPDATE business_profiles
  SET system_category = 'entertainment'
  WHERE (google_types IS NULL OR google_types = '{}')
    AND system_category = 'other'
    AND (
      LOWER(display_category) LIKE '%arcade%' OR
      LOWER(display_category) LIKE '%gaming%' OR
      LOWER(display_category) LIKE '%entertainment%' OR
      LOWER(display_category) LIKE '%lounge%' OR
      LOWER(display_category) LIKE '%social%'
    );
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % entertainment venues', updated_count;
  
  RAISE NOTICE '✅ Backfill complete!';
END $$;

-- Verify results
SELECT 
  business_name,
  system_category,
  display_category,
  google_types
FROM business_profiles
WHERE google_types IS NULL OR google_types = '{}' OR array_length(google_types, 1) IS NULL
ORDER BY business_name;

