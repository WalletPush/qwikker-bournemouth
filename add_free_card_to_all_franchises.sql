-- Add free card to ALL existing franchise_crm_configs (not just bournemouth)
-- This ensures all current admins see the free listing card

UPDATE franchise_crm_configs
SET pricing_cards = jsonb_set(
  COALESCE(pricing_cards, '{}'::jsonb),
  '{free}',
  '{
    "title": "Free Listing",
    "subtitle": "Basic visibility",
    "price": 0,
    "annual_price": 0,
    "features": [
      "Listed in Discover directory",
      "Basic business profile",
      "Update profile info",
      "Limited visibility",
      "❌ No AI chat visibility",
      "❌ No offers or events",
      "❌ No secret menu items",
      "❌ No analytics"
    ],
    "cta_text": "Free",
    "popular": false,
    "color_scheme": "slate"
  }'::jsonb
)
-- WHERE clause removed - updates ALL franchises!
;

-- Verify it worked for all cities
SELECT 
  city,
  pricing_cards->'free'->>'title' as free_card_title,
  pricing_cards->'free'->>'price' as free_card_price
FROM franchise_crm_configs
ORDER BY city;

