-- Check if imported businesses have all required fields for placeholders and distance

-- Part 1: Check system_category, business_type, and placeholder_variant
SELECT 
    business_name,
    status,
    auto_imported,
    system_category,
    business_type,
    display_category,
    google_primary_type,
    placeholder_variant,
    latitude,
    longitude
FROM 
    public.business_profiles
WHERE 
    city = 'bournemouth'
    AND status = 'unclaimed'
    AND auto_imported = true
ORDER BY 
    business_name;

-- Part 2: Count how many imported businesses are missing critical fields
SELECT 
    'Total Imported' as category,
    COUNT(*) as count
FROM public.business_profiles
WHERE city = 'bournemouth' AND status = 'unclaimed' AND auto_imported = true

UNION ALL

SELECT 
    'Missing system_category' as category,
    COUNT(*) as count
FROM public.business_profiles
WHERE city = 'bournemouth' AND status = 'unclaimed' AND auto_imported = true AND system_category IS NULL

UNION ALL

SELECT 
    'Missing business_type' as category,
    COUNT(*) as count
FROM public.business_profiles
WHERE city = 'bournemouth' AND status = 'unclaimed' AND auto_imported = true AND business_type IS NULL

UNION ALL

SELECT 
    'Missing latitude/longitude' as category,
    COUNT(*) as count
FROM public.business_profiles
WHERE city = 'bournemouth' AND status = 'unclaimed' AND auto_imported = true AND (latitude IS NULL OR longitude IS NULL)

UNION ALL

SELECT 
    'Missing placeholder_variant' as category,
    COUNT(*) as count
FROM public.business_profiles
WHERE city = 'bournemouth' AND status = 'unclaimed' AND auto_imported = true AND placeholder_variant IS NULL;
