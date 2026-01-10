# Complete Solution: Add Free Listing Card for All Franchises

## Step 1: Update ALL existing franchise configs
Run this SQL in Supabase to add the free card to all current franchises:

```sql
-- Add free card to ALL existing franchise_crm_configs
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
);

-- Verify it worked for all cities
SELECT 
  city,
  pricing_cards->'free'->>'title' as free_card_title,
  pricing_cards->'free'->>'price' as free_card_price
FROM franchise_crm_configs
ORDER BY city;
```

## Step 2: Future franchises are ALREADY covered! ✅

The code in `components/admin/pricing-card-editor.tsx` already handles this:
- Lines 65-90: When loading config, if `free` card is missing, it automatically injects it
- This means new franchises will automatically get the free card on first load
- When admin clicks "Save", it will persist to the database

## Why This Works:

1. **Existing franchises**: SQL update adds free card to database
2. **New franchises**: Code automatically adds free card on first load
3. **Saves**: Both APIs (`/api/admin/pricing-cards` and `/api/admin/billing/pricing-tiers`) save the entire `pricing_cards` object, including free

## Result:
- ✅ All current admins see free card
- ✅ All future admins see free card
- ✅ Free card persists when saving
- ✅ Multi-tenant safe

