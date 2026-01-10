-- Add placeholder image management fields to business_profiles
-- Following ChatGPT's recommended data model

-- 1. Image source enum: how should we display this business?
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'placeholder' CHECK (image_source IN ('placeholder', 'cloudinary'));

-- 2. Placeholder category: which category's images to use
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS placeholder_category TEXT DEFAULT 'restaurant';

-- 3. Placeholder variant: manual override (null = auto hash-based)
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS placeholder_variant INTEGER;

-- Comments
COMMENT ON COLUMN business_profiles.image_source IS 
'How to display business image: placeholder (unclaimed) or cloudinary (claimed with uploaded photos)';

COMMENT ON COLUMN business_profiles.placeholder_category IS 
'Which placeholder category to use (restaurant, coffee, bar, barber, etc). Admin can override if Google miscategorized.';

COMMENT ON COLUMN business_profiles.placeholder_variant IS 
'Manual variant selection (1-10). If NULL, auto-selects based on hash(google_place_id) for visual variety.';

-- Set initial values for existing businesses
-- Claimed businesses = cloudinary
UPDATE business_profiles
SET image_source = 'cloudinary'
WHERE status IN ('approved', 'claimed_free', 'pending_claim')
  AND hero_image IS NOT NULL;

-- Unclaimed businesses = placeholder
UPDATE business_profiles
SET image_source = 'placeholder',
    placeholder_category = LOWER(business_type)
WHERE status = 'unclaimed';

-- Map business_type to placeholder_category
UPDATE business_profiles
SET placeholder_category = CASE
  WHEN LOWER(business_type) IN ('restaurant', 'fine_dining', 'bistro') THEN 'restaurant'
  WHEN LOWER(business_type) IN ('cafe', 'coffee_shop') THEN 'coffee'
  WHEN LOWER(business_type) IN ('bar', 'wine_bar', 'cocktail_bar') THEN 'bar'
  WHEN LOWER(business_type) IN ('barber', 'barbershop') THEN 'barber'
  ELSE 'restaurant' -- fallback
END
WHERE image_source = 'placeholder';

-- Verify
SELECT 
  business_name,
  status,
  image_source,
  placeholder_category,
  placeholder_variant,
  CASE WHEN hero_image IS NOT NULL THEN 'Has image' ELSE 'No image' END as hero_status
FROM business_profiles
LIMIT 20;

