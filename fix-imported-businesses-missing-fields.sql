-- Fix imported businesses that are missing critical fields
-- Run this to backfill system_category, business_type, and placeholder_variant

-- Part 1: Update placeholder_variant to 0 for imported businesses where it's null
UPDATE public.business_profiles
SET placeholder_variant = 0
WHERE 
    city = 'bournemouth'
    AND status = 'unclaimed'
    AND auto_imported = true
    AND placeholder_variant IS NULL;

-- Part 2: Update system_category based on google_primary_type or business_category
-- This is a best-effort mapping
UPDATE public.business_profiles
SET system_category = CASE
    -- Restaurants and food
    WHEN google_primary_type LIKE '%restaurant%' OR business_category ILIKE '%restaurant%' THEN 'restaurant'
    WHEN google_primary_type LIKE '%cafe%' OR google_primary_type LIKE '%coffee%' OR business_category ILIKE '%cafe%' OR business_category ILIKE '%coffee%' THEN 'cafe'
    WHEN google_primary_type LIKE '%bar%' OR google_primary_type LIKE '%pub%' OR business_category ILIKE '%bar%' OR business_category ILIKE '%pub%' THEN 'bar'
    WHEN google_primary_type LIKE '%bakery%' OR business_category ILIKE '%bakery%' THEN 'bakery'
    WHEN google_primary_type LIKE '%fast_food%' OR business_category ILIKE '%fast food%' THEN 'fast-food'
    
    -- Nightlife
    WHEN google_primary_type LIKE '%night_club%' OR business_category ILIKE '%night club%' OR business_category ILIKE '%nightclub%' THEN 'nightclub'
    
    -- Shopping
    WHEN google_primary_type LIKE '%store%' OR google_primary_type LIKE '%shop%' OR business_category ILIKE '%store%' OR business_category ILIKE '%shop%' THEN 'retail'
    WHEN google_primary_type LIKE '%boutique%' OR business_category ILIKE '%boutique%' THEN 'boutique'
    
    -- Services
    WHEN google_primary_type LIKE '%salon%' OR google_primary_type LIKE '%spa%' OR business_category ILIKE '%salon%' OR business_category ILIKE '%spa%' THEN 'salon-spa'
    WHEN google_primary_type LIKE '%gym%' OR google_primary_type LIKE '%fitness%' OR business_category ILIKE '%gym%' OR business_category ILIKE '%fitness%' THEN 'fitness'
    
    -- Default
    ELSE 'other'
END,
business_type = CASE
    -- Restaurants and food
    WHEN google_primary_type LIKE '%restaurant%' OR business_category ILIKE '%restaurant%' THEN 'restaurant'
    WHEN google_primary_type LIKE '%cafe%' OR google_primary_type LIKE '%coffee%' OR business_category ILIKE '%cafe%' OR business_category ILIKE '%coffee%' THEN 'cafe'
    WHEN google_primary_type LIKE '%bar%' OR google_primary_type LIKE '%pub%' OR business_category ILIKE '%bar%' OR business_category ILIKE '%pub%' THEN 'bar'
    WHEN google_primary_type LIKE '%bakery%' OR business_category ILIKE '%bakery%' THEN 'bakery'
    WHEN google_primary_type LIKE '%fast_food%' OR business_category ILIKE '%fast food%' THEN 'fast-food'
    
    -- Nightlife
    WHEN google_primary_type LIKE '%night_club%' OR business_category ILIKE '%night club%' OR business_category ILIKE '%nightclub%' THEN 'nightclub'
    
    -- Shopping
    WHEN google_primary_type LIKE '%store%' OR google_primary_type LIKE '%shop%' OR business_category ILIKE '%store%' OR business_category ILIKE '%shop%' THEN 'retail'
    WHEN google_primary_type LIKE '%boutique%' OR business_category ILIKE '%boutique%' THEN 'boutique'
    
    -- Services
    WHEN google_primary_type LIKE '%salon%' OR google_primary_type LIKE '%spa%' OR business_category ILIKE '%salon%' OR business_category ILIKE '%spa%' THEN 'salon-spa'
    WHEN google_primary_type LIKE '%gym%' OR google_primary_type LIKE '%fitness%' OR business_category ILIKE '%gym%' OR business_category ILIKE '%fitness%' THEN 'fitness'
    
    -- Default
    ELSE 'other'
END
WHERE 
    city = 'bournemouth'
    AND status = 'unclaimed'
    AND auto_imported = true
    AND (system_category IS NULL OR business_type IS NULL);

-- Part 3: Verify the changes
SELECT 
    business_name,
    system_category,
    business_type,
    google_primary_type,
    placeholder_variant
FROM 
    public.business_profiles
WHERE 
    city = 'bournemouth'
    AND status = 'unclaimed'
    AND auto_imported = true
ORDER BY business_name;
