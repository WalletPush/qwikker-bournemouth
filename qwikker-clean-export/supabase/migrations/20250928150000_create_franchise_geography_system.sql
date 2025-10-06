-- Create a proper franchise geography system
-- This handles the complex relationship between cities, neighborhoods, and franchises

-- 1. Create franchise_territories table (main franchise areas)
CREATE TABLE IF NOT EXISTS franchise_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Franchise identification
  franchise_code TEXT UNIQUE NOT NULL, -- 'bournemouth', 'calgary', 'london'
  franchise_name TEXT NOT NULL, -- 'Bournemouth & Poole', 'Calgary Metro', 'Greater London'
  
  -- Geographic boundaries
  country TEXT NOT NULL, -- 'UK', 'Canada', 'France'
  region TEXT, -- 'Dorset', 'Alberta', 'England'
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  launch_date DATE,
  
  -- Contact & settings
  primary_contact_email TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'GBP'
);

-- 2. Create geographic_areas table (specific cities/neighborhoods)
CREATE TABLE IF NOT EXISTS geographic_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Geographic identification
  area_name TEXT NOT NULL, -- 'Bournemouth', 'Christchurch', 'Poole', 'Beltline', 'Kensington'
  area_type TEXT NOT NULL, -- 'city', 'neighborhood', 'district', 'borough'
  
  -- Franchise relationship
  franchise_territory_id UUID REFERENCES franchise_territories(id) ON DELETE CASCADE,
  
  -- Geographic data
  country TEXT NOT NULL,
  region TEXT,
  postal_code_prefix TEXT, -- 'BH', 'T2', 'SW1'
  
  -- Google Places integration
  google_place_id TEXT, -- For Google Places API integration
  google_types TEXT[], -- ['locality', 'political'] from Google Places
  
  -- Coordinates (for future geofencing)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Status
  is_active BOOLEAN DEFAULT true
);

-- 3. Insert initial franchise territories
INSERT INTO franchise_territories (franchise_code, franchise_name, country, region, primary_contact_email, currency) VALUES
('bournemouth', 'Bournemouth & Poole Area', 'UK', 'Dorset', 'bournemouth@qwikker.com', 'GBP'),
('calgary', 'Calgary Metro Area', 'Canada', 'Alberta', 'calgary@qwikker.com', 'CAD'),
('london', 'Greater London', 'UK', 'England', 'london@qwikker.com', 'GBP')
ON CONFLICT (franchise_code) DO NOTHING;

-- 4. Insert geographic areas for Bournemouth franchise
INSERT INTO geographic_areas (area_name, area_type, franchise_territory_id, country, region, postal_code_prefix, is_active)
SELECT 
  area_name,
  'city' as area_type,
  ft.id as franchise_territory_id,
  'UK' as country,
  'Dorset' as region,
  postal_prefix,
  true as is_active
FROM (VALUES 
  ('bournemouth', 'BH'),
  ('christchurch', 'BH'),
  ('poole', 'BH'),
  ('southbourne', 'BH'),
  ('boscombe', 'BH'),
  ('pokesdown', 'BH'),
  ('parkstone', 'BH'),
  ('sandbanks', 'BH'),
  ('westbourne', 'BH')
) AS areas(area_name, postal_prefix)
CROSS JOIN franchise_territories ft 
WHERE ft.franchise_code = 'bournemouth';

-- 5. Insert geographic areas for Calgary franchise (major neighborhoods)
INSERT INTO geographic_areas (area_name, area_type, franchise_territory_id, country, region, postal_code_prefix, is_active)
SELECT 
  area_name,
  'neighborhood' as area_type,
  ft.id as franchise_territory_id,
  'Canada' as country,
  'Alberta' as region,
  'T2' as postal_code_prefix,
  true as is_active
FROM (VALUES 
  ('calgary'),
  ('beltline'),
  ('kensington'),
  ('hillhurst'),
  ('mission'),
  ('inglewood'),
  ('kensington'),
  ('bridgeland'),
  ('downtown'),
  ('eau claire')
) AS areas(area_name)
CROSS JOIN franchise_territories ft 
WHERE ft.franchise_code = 'calgary';

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_geographic_areas_franchise_territory ON geographic_areas(franchise_territory_id);
CREATE INDEX IF NOT EXISTS idx_geographic_areas_area_name ON geographic_areas(LOWER(area_name));
CREATE INDEX IF NOT EXISTS idx_franchise_territories_code ON franchise_territories(franchise_code);

-- 7. Create function to get franchise from city/area name
CREATE OR REPLACE FUNCTION get_franchise_for_area(input_area TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT ft.franchise_code
  FROM geographic_areas ga
  JOIN franchise_territories ft ON ga.franchise_territory_id = ft.id
  WHERE LOWER(ga.area_name) = LOWER(input_area)
    AND ga.is_active = true
    AND ft.is_active = true
  LIMIT 1;
$$;

-- 8. Create function to get all areas for a franchise
CREATE OR REPLACE FUNCTION get_areas_for_franchise(franchise_code TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY_AGG(LOWER(ga.area_name))
  FROM geographic_areas ga
  JOIN franchise_territories ft ON ga.franchise_territory_id = ft.id
  WHERE ft.franchise_code = LOWER(franchise_code)
    AND ga.is_active = true
    AND ft.is_active = true;
$$;

-- 9. Add comments
COMMENT ON TABLE franchise_territories IS 'Main franchise areas (e.g., Bournemouth, Calgary, London)';
COMMENT ON TABLE geographic_areas IS 'Specific cities, neighborhoods, and districts within franchise territories';
COMMENT ON FUNCTION get_franchise_for_area(TEXT) IS 'Returns franchise_code for a given city/area name';
COMMENT ON FUNCTION get_areas_for_franchise(TEXT) IS 'Returns array of all areas covered by a franchise';

-- 10. Example usage queries (commented out)
/*
-- Get franchise for a city
SELECT get_franchise_for_area('christchurch'); -- Returns 'bournemouth'
SELECT get_franchise_for_area('beltline'); -- Returns 'calgary'

-- Get all areas for a franchise
SELECT get_areas_for_franchise('bournemouth'); -- Returns ['bournemouth', 'christchurch', 'poole', ...]

-- Find businesses in a franchise territory
SELECT bp.business_name, bp.business_town, ft.franchise_name
FROM business_profiles bp
JOIN geographic_areas ga ON LOWER(bp.business_town) = LOWER(ga.area_name)
JOIN franchise_territories ft ON ga.franchise_territory_id = ft.id
WHERE ft.franchise_code = 'bournemouth';
*/

