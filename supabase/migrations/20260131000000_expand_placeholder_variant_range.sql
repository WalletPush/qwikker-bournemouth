-- Expand placeholder_variant range to support more variants per category
-- Some categories now have up to 6 variants (restaurant, bar, tattoo)

-- Drop any existing constraint
ALTER TABLE business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_placeholder_variant_check;

-- Add new constraint allowing 0-10 (enough for future expansion)
ALTER TABLE business_profiles
ADD CONSTRAINT business_profiles_placeholder_variant_check 
CHECK (placeholder_variant >= 0 AND placeholder_variant <= 10);

-- Update comment
COMMENT ON COLUMN business_profiles.placeholder_variant IS 'Placeholder image variant ID (0-10). Different categories have different numbers of variants available. Admins can select variants for unclaimed businesses.';

-- Verify
DO $$ 
BEGIN
  RAISE NOTICE '✅ Placeholder variant range expanded to 0-10';
  RAISE NOTICE '   Categories with 6 variants: restaurant, bar, tattoo';
  RAISE NOTICE '   Categories with 5 variants: bakery, dessert';
  RAISE NOTICE '   Categories with 4 variants: cafe, barber, wellness';
  RAISE NOTICE '   Categories with 3 variants: pub, salon';
END $$;
