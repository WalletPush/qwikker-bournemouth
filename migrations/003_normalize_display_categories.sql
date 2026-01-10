-- ==========================================
-- OPTIONAL: NORMALIZE display_category VALUES
-- ==========================================
-- Run this AFTER Phase 1 + Phase 2 if you want consistent display labels
-- This is purely cosmetic and not required

-- ⚠️ Only run after:
-- 1. Phase 1 deployed
-- 2. Phase 2 deployed
-- 3. Code updated to use SYSTEM_CATEGORY_LABEL mapping

-- Normalize to consistent formats (with space after slash)
UPDATE business_profiles
SET display_category = 'Cafe / Coffee Shop'
WHERE display_category IN ('Cafe/Coffee Shop', 'cafe/coffee shop', 'CAFE/COFFEE SHOP', 'Cafe / Coffee Shop');

UPDATE business_profiles
SET display_category = 'Bar / Pub'
WHERE display_category IN ('Bar/Pub', 'bar/pub', 'BAR/PUB', 'Bar / Pub');

UPDATE business_profiles
SET display_category = 'Dessert / Ice Cream'
WHERE display_category IN ('Dessert/Ice Cream', 'dessert/ice cream', 'DESSERT/ICE CREAM', 'Dessert / Ice Cream');

UPDATE business_profiles
SET display_category = 'Takeaway / Street Food'
WHERE display_category IN ('Takeaway/Street Food', 'takeaway/street food', 'TAKEAWAY/STREET FOOD', 'Takeaway / Street Food');

UPDATE business_profiles
SET display_category = 'Salon / Spa'
WHERE display_category IN ('Salon/Spa', 'salon/spa', 'SALON/SPA', 'Salon / Spa');

UPDATE business_profiles
SET display_category = 'Hairdresser / Barber'
WHERE display_category IN ('Hairdresser/Barber', 'hairdresser/barber', 'HAIRDRESSER/BARBER', 'Hairdresser / Barber');

UPDATE business_profiles
SET display_category = 'Tattoo / Piercing'
WHERE display_category IN ('Tattoo/Piercing', 'tattoo/piercing', 'TATTOO/PIERCING', 'Tattoo / Piercing');

UPDATE business_profiles
SET display_category = 'Clothing / Fashion'
WHERE display_category IN ('Clothing/Fashion', 'clothing/fashion', 'CLOTHING/FASHION', 'Clothing / Fashion');

UPDATE business_profiles
SET display_category = 'Fitness / Gym'
WHERE display_category IN ('Fitness/Gym', 'fitness/gym', 'FITNESS/GYM', 'Fitness / Gym');

UPDATE business_profiles
SET display_category = 'Sports / Outdoors'
WHERE display_category IN ('Sports/Outdoors', 'sports/outdoors', 'SPORTS/OUTDOORS', 'Sports / Outdoors');

UPDATE business_profiles
SET display_category = 'Hotel / BnB'
WHERE display_category IN ('Hotel/BnB', 'hotel/bnb', 'HOTEL/BNB', 'Hotel / BnB', 'Hotel/B&B', 'Hotel / B&B');

UPDATE business_profiles
SET display_category = 'Venue / Event Space'
WHERE display_category IN ('Venue/Event Space', 'venue/event space', 'VENUE/EVENT SPACE', 'Venue / Event Space');

UPDATE business_profiles
SET display_category = 'Entertainment / Attractions'
WHERE display_category IN ('Entertainment/Attractions', 'entertainment/attractions', 'ENTERTAINMENT/ATTRACTIONS', 'Entertainment / Attractions');

-- Verification: Check for remaining inconsistencies
SELECT 
  display_category,
  system_category,
  COUNT(*) as count
FROM business_profiles
GROUP BY display_category, system_category
ORDER BY system_category, count DESC;

-- Note: After this cleanup, you can optionally add a trigger to keep
-- display_category derived from system_category (see 004_add_category_sync_trigger.sql)

