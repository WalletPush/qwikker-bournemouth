-- Fix pricing_cards column default and update existing cities
-- Cards should only show what IS included per tier (no red crosses, no made-up features)

-- Update the column default for new cities
ALTER TABLE franchise_crm_configs
ALTER COLUMN pricing_cards SET DEFAULT '{
  "free": {
    "title": "Free Listing",
    "subtitle": "Basic visibility",
    "price": 0,
    "annual_price": 0,
    "features": [
      "Listed in Discover directory",
      "Basic AI chat visibility",
      "Up to 5 featured menu items",
      "1 active offer"
    ],
    "cta_text": "Free",
    "popular": false,
    "color_scheme": "slate"
  },
  "starter": {
    "title": "Starter Plan",
    "subtitle": "Perfect for new businesses",
    "price": 19.99,
    "annual_price": 199.90,
    "features": [
      "Carousel card in AI chat",
      "Full menu/service indexing",
      "AI-powered discovery",
      "3 active offers",
      "5 secret menu items",
      "3 events"
    ],
    "cta_text": "Get Started",
    "popular": false,
    "color_scheme": "slate"
  },
  "featured": {
    "title": "Featured Business",
    "subtitle": "Most popular choice",
    "price": 49.99,
    "annual_price": 499.90,
    "features": [
      "Higher AI ranking",
      "Featured badge on listing",
      "5 active offers",
      "10 secret menu items",
      "5 events"
    ],
    "cta_text": "Go Featured",
    "popular": true,
    "color_scheme": "blue"
  },
  "spotlight": {
    "title": "Spotlight Premium",
    "subtitle": "Maximum visibility",
    "price": 129,
    "annual_price": 1290,
    "features": [
      "Qwikker Pick badge & top AI ranking",
      "Unlimited offers",
      "25 secret menu items",
      "Unlimited events",
      "White-label digital stamp card",
      "Push notifications",
      "Social wizard",
      "Premium analytics"
    ],
    "cta_text": "Go Premium",
    "popular": false,
    "color_scheme": "gold"
  }
}'::jsonb;

-- Overwrite pricing_cards for ALL existing cities with correct features and prices
UPDATE franchise_crm_configs
SET pricing_cards = jsonb_build_object(
  'free', jsonb_build_object(
    'title', 'Free Listing',
    'subtitle', 'Basic visibility',
    'price', 0,
    'annual_price', 0,
    'features', '["Listed in Discover directory", "Basic AI chat visibility", "Up to 5 featured menu items", "1 active offer"]'::jsonb,
    'cta_text', 'Free',
    'popular', false,
    'color_scheme', 'slate'
  ),
  'starter', jsonb_build_object(
    'title', pricing_cards->'starter'->>'title',
    'subtitle', pricing_cards->'starter'->>'subtitle',
    'price', 19.99,
    'annual_price', 199.90,
    'features', '["Carousel card in AI chat", "Full menu/service indexing", "AI-powered discovery", "3 active offers", "5 secret menu items", "3 events"]'::jsonb,
    'cta_text', COALESCE(pricing_cards->'starter'->>'cta_text', 'Get Started'),
    'popular', COALESCE((pricing_cards->'starter'->>'popular')::boolean, false),
    'color_scheme', COALESCE(pricing_cards->'starter'->>'color_scheme', 'slate')
  ),
  'featured', jsonb_build_object(
    'title', pricing_cards->'featured'->>'title',
    'subtitle', pricing_cards->'featured'->>'subtitle',
    'price', 49.99,
    'annual_price', 499.90,
    'features', '["Higher AI ranking", "Featured badge on listing", "5 active offers", "10 secret menu items", "5 events"]'::jsonb,
    'cta_text', COALESCE(pricing_cards->'featured'->>'cta_text', 'Go Featured'),
    'popular', COALESCE((pricing_cards->'featured'->>'popular')::boolean, true),
    'color_scheme', COALESCE(pricing_cards->'featured'->>'color_scheme', 'blue')
  ),
  'spotlight', jsonb_build_object(
    'title', pricing_cards->'spotlight'->>'title',
    'subtitle', pricing_cards->'spotlight'->>'subtitle',
    'price', 129,
    'annual_price', 1290,
    'features', '["Qwikker Pick badge & top AI ranking", "Unlimited offers", "25 secret menu items", "Unlimited events", "White-label digital stamp card", "Push notifications", "Social wizard", "Premium analytics"]'::jsonb,
    'cta_text', COALESCE(pricing_cards->'spotlight'->>'cta_text', 'Go Premium'),
    'popular', COALESCE((pricing_cards->'spotlight'->>'popular')::boolean, false),
    'color_scheme', COALESCE(pricing_cards->'spotlight'->>'color_scheme', 'gold')
  )
);
