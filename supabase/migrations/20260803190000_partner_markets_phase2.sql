-- Phase 2: partner_markets — seeded territories for map / scarcity / availability

CREATE TABLE IF NOT EXISTS public.partner_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  city_name text NOT NULL,
  city_slug text NOT NULL UNIQUE,
  country text,
  country_code text,
  lat numeric(10, 7),
  lng numeric(10, 7),

  -- public status for map (owned | reserved | available)
  -- owned = HQ hub / not for partners; reserved = soft hold display; available = open
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('owned', 'reserved', 'available')),

  tier text NOT NULL DEFAULT 'partner'
    CHECK (tier IN ('hub', 'partner')),

  blocked boolean NOT NULL DEFAULT false,
  manual_review_only boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 100,
  is_founding_slot boolean NOT NULL DEFAULT true,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_partner_markets_status ON public.partner_markets (status);
CREATE INDEX IF NOT EXISTS idx_partner_markets_coords ON public.partner_markets (lat, lng);
CREATE INDEX IF NOT EXISTS idx_partner_markets_tier ON public.partner_markets (tier);

ALTER TABLE public.partner_markets ENABLE ROW LEVEL SECURITY;

-- Public read of non-sensitive market rows (no PII)
CREATE POLICY "Anyone can view partner markets"
  ON public.partner_markets
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Writes via service role only (no insert/update policies for anon)

COMMENT ON TABLE public.partner_markets IS 'Seeded territory catalogue for partners map and scarcity UI';

-- Seed HQ hubs (owned — do not consume founding slots)
INSERT INTO public.partner_markets
  (city_name, city_slug, country, country_code, lat, lng, status, tier, is_founding_slot, sort_order)
VALUES
  ('London', 'london', 'United Kingdom', 'GB', 51.5074000, -0.1278000, 'owned', 'hub', false, 1),
  ('Dubai', 'dubai', 'United Arab Emirates', 'AE', 25.2048000, 55.2708000, 'owned', 'hub', false, 2),
  ('Bangkok', 'bangkok', 'Thailand', 'TH', 13.7563000, 100.5018000, 'owned', 'hub', false, 3),
  ('New York', 'new-york', 'United States', 'US', 40.7128000, -74.0060000, 'owned', 'hub', false, 4),
  ('Singapore', 'singapore', 'Singapore', 'SG', 1.3521000, 103.8198000, 'owned', 'hub', false, 5),
  ('Sydney', 'sydney', 'Australia', 'AU', -33.8688000, 151.2093000, 'owned', 'hub', false, 6),
  ('Tokyo', 'tokyo', 'Japan', 'JP', 35.6762000, 139.6503000, 'owned', 'hub', false, 7),
  ('Paris', 'paris', 'France', 'FR', 48.8566000, 2.3522000, 'owned', 'hub', false, 8),
  ('Hong Kong', 'hong-kong', 'Hong Kong', 'HK', 22.3193000, 114.1694000, 'owned', 'hub', false, 9),
  ('Los Angeles', 'los-angeles', 'United States', 'US', 34.0522000, -118.2437000, 'owned', 'hub', false, 10),
  ('Berlin', 'berlin', 'Germany', 'DE', 52.5200000, 13.4050000, 'owned', 'hub', false, 11),
  ('Toronto', 'toronto', 'Canada', 'CA', 43.6532000, -79.3832000, 'owned', 'hub', false, 12),
  ('Mumbai', 'mumbai', 'India', 'IN', 19.0760000, 72.8777000, 'owned', 'hub', false, 13),
  ('São Paulo', 'sao-paulo', 'Brazil', 'BR', -23.5505000, -46.6333000, 'owned', 'hub', false, 14),
  ('Seoul', 'seoul', 'South Korea', 'KR', 37.5665000, 126.9780000, 'owned', 'hub', false, 15),
  ('Amsterdam', 'amsterdam', 'Netherlands', 'NL', 52.3676000, 4.9041000, 'owned', 'hub', false, 16),
  ('Madrid', 'madrid', 'Spain', 'ES', 40.4168000, -3.7038000, 'owned', 'hub', false, 17),
  ('Istanbul', 'istanbul', 'Turkey', 'TR', 41.0082000, 28.9784000, 'owned', 'hub', false, 18),
  ('Mexico City', 'mexico-city', 'Mexico', 'MX', 19.4326000, -99.1332000, 'owned', 'hub', false, 19),
  ('Jakarta', 'jakarta', 'Indonesia', 'ID', -6.2088000, 106.8456000, 'owned', 'hub', false, 20),
  ('Riyadh', 'riyadh', 'Saudi Arabia', 'SA', 24.7136000, 46.6753000, 'owned', 'hub', false, 21),
  ('Chicago', 'chicago', 'United States', 'US', 41.8781000, -87.6298000, 'owned', 'hub', false, 22),
  ('Miami', 'miami', 'United States', 'US', 25.7617000, -80.1918000, 'owned', 'hub', false, 23),
  ('San Francisco', 'san-francisco', 'United States', 'US', 37.7749000, -122.4194000, 'owned', 'hub', false, 24),
  ('Melbourne', 'melbourne', 'Australia', 'AU', -37.8136000, 144.9631000, 'owned', 'hub', false, 25)
ON CONFLICT (city_slug) DO NOTHING;

-- Seed available partner markets (secondary cities)
INSERT INTO public.partner_markets
  (city_name, city_slug, country, country_code, lat, lng, status, tier, is_founding_slot, sort_order)
VALUES
  ('Bournemouth', 'bournemouth', 'United Kingdom', 'GB', 50.7192000, -1.8808000, 'available', 'partner', true, 50),
  ('Brighton', 'brighton', 'United Kingdom', 'GB', 50.8225000, -0.1372000, 'available', 'partner', true, 51),
  ('Manchester', 'manchester', 'United Kingdom', 'GB', 53.4808000, -2.2426000, 'available', 'partner', true, 52),
  ('Bristol', 'bristol', 'United Kingdom', 'GB', 51.4545000, -2.5879000, 'available', 'partner', true, 53),
  ('Leeds', 'leeds', 'United Kingdom', 'GB', 53.8008000, -1.5491000, 'available', 'partner', true, 54),
  ('Edinburgh', 'edinburgh', 'United Kingdom', 'GB', 55.9533000, -3.1883000, 'available', 'partner', true, 55),
  ('Cardiff', 'cardiff', 'United Kingdom', 'GB', 51.4816000, -3.1791000, 'available', 'partner', true, 56),
  ('Birmingham', 'birmingham', 'United Kingdom', 'GB', 52.4862000, -1.8904000, 'available', 'partner', true, 57),
  ('Glasgow', 'glasgow', 'United Kingdom', 'GB', 55.8642000, -4.2518000, 'available', 'partner', true, 58),
  ('Liverpool', 'liverpool', 'United Kingdom', 'GB', 53.4084000, -2.9916000, 'available', 'partner', true, 59),
  ('Portsmouth', 'portsmouth', 'United Kingdom', 'GB', 50.8198000, -1.0880000, 'available', 'partner', true, 60),
  ('Bath', 'bath', 'United Kingdom', 'GB', 51.3811000, -2.3590000, 'available', 'partner', true, 61),
  ('Exeter', 'exeter', 'United Kingdom', 'GB', 50.7184000, -3.5339000, 'available', 'partner', true, 62),
  ('Norwich', 'norwich', 'United Kingdom', 'GB', 52.6309000, 1.2974000, 'available', 'partner', true, 63),
  ('Auckland', 'auckland', 'New Zealand', 'NZ', -36.8509000, 174.7645000, 'available', 'partner', true, 70),
  ('Bali', 'bali', 'Indonesia', 'ID', -8.4095000, 115.1889000, 'available', 'partner', true, 71),
  ('Koh Samui', 'koh-samui', 'Thailand', 'TH', 9.5120000, 100.0136000, 'available', 'partner', true, 72),
  ('Lisbon', 'lisbon', 'Portugal', 'PT', 38.7223000, -9.1393000, 'available', 'partner', true, 73),
  ('Porto', 'porto', 'Portugal', 'PT', 41.1579000, -8.6291000, 'available', 'partner', true, 74),
  ('Valencia', 'valencia', 'Spain', 'ES', 39.4699000, -0.3763000, 'available', 'partner', true, 75),
  ('Barcelona', 'barcelona', 'Spain', 'ES', 41.3874000, 2.1686000, 'available', 'partner', true, 76),
  ('Cape Town', 'cape-town', 'South Africa', 'ZA', -33.9249000, 18.4241000, 'available', 'partner', true, 77),
  ('Vancouver', 'vancouver', 'Canada', 'CA', 49.2827000, -123.1207000, 'available', 'partner', true, 78),
  ('Austin', 'austin', 'United States', 'US', 30.2672000, -97.7431000, 'available', 'partner', true, 79),
  ('Denver', 'denver', 'United States', 'US', 39.7392000, -104.9903000, 'available', 'partner', true, 80),
  ('Dublin', 'dublin', 'Ireland', 'IE', 53.3498000, -6.2603000, 'available', 'partner', true, 81),
  ('Copenhagen', 'copenhagen', 'Denmark', 'DK', 55.6761000, 12.5683000, 'available', 'partner', true, 82),
  ('Stockholm', 'stockholm', 'Sweden', 'SE', 59.3293000, 18.0686000, 'available', 'partner', true, 83),
  ('Prague', 'prague', 'Czechia', 'CZ', 50.0755000, 14.4378000, 'available', 'partner', true, 84),
  ('Vienna', 'vienna', 'Austria', 'AT', 48.2082000, 16.3738000, 'available', 'partner', true, 85)
ON CONFLICT (city_slug) DO NOTHING;

-- If Bournemouth (or others) already live in franchise_crm_configs, mark owned for map consistency
UPDATE public.partner_markets m
SET status = 'owned',
    updated_at = now()
FROM public.franchise_crm_configs f
WHERE m.city_slug = f.city
  AND f.status IN ('active', 'coming_soon', 'pending_setup');
