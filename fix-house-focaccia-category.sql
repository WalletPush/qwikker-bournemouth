-- Fix House of Focaccia category (Google misclassified as grocery_store)
-- Keep system_category = 'cafe' for placeholder images
-- Only update display fields
UPDATE business_profiles
SET 
  business_category = 'Italian Food Shop',
  display_category = 'Italian Food Shop',
  google_primary_type = 'italian_restaurant',  -- More accurate than grocery_store
  business_type = 'restaurant',  -- Better categorization
  updated_at = NOW()
WHERE 
  business_name = 'House of Focaccia'
  AND city = 'bournemouth';

-- Verify the update
SELECT 
  business_name,
  business_category,
  display_category,
  system_category,
  google_primary_type,
  business_type
FROM business_profiles
WHERE business_name = 'House of Focaccia'
AND city = 'bournemouth';
