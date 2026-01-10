# FREE LISTING PRICING FIXES - TODO

## Issues Identified:

1. **Admin Pricing Editor Missing Free Tier Card**
   - Admin can't edit the "Free Listing" card in Pricing & Billing
   - Only Starter, Featured, and Spotlight cards are shown
   - Need to add a 4th editable "Free" card

2. **Business Dashboard Upgrade Banner - Missing Founding Member Discount**
   - The upgrade banner on `claimed_free` dashboard doesn't show the founding member discount
   - Should fetch and display: "20% off for life" (or whatever admin sets)
   - Should match the discount shown on paid tier cards in Settings

## What Needs to be Done:

### 1. Add Free Tier to Admin Pricing Card Editor
**File:** `components/admin/pricing-card-editor.tsx`
- Add "free" to the pricing_cards object structure
- Create a 4th card in the renderPricingCard function
- Make it editable with features list
- Save to `franchise_crm_configs.pricing_cards.free`

### 2. Add Free Tier to Admin Pricing Cards Display
**File:** `components/dashboard/dynamic-pricing-cards.tsx`
- Update grid from `md:grid-cols-3` to `md:grid-cols-4`
- Add `renderPricingCard('free')` call

### 3. Update Business Dashboard Upgrade Banner
**File:** `components/dashboard/improved-dashboard-home.tsx`
- Fetch franchise config (founding_member_discount, founding_member_enabled)
- If founding member enabled, show banner: "🌟 Founding Member Benefit: 20% off for life on annual plans"
- Place it above the feature list or below the button

### 4. Ensure Database Schema Supports Free Tier
- `franchise_crm_configs.pricing_cards` JSONB should support `.free` object
- Should have same structure as starter/featured/spotlight

## Priority:
1. **HIGH**: Add discount display to business dashboard (this is the conversion driver)
2. **MEDIUM**: Add Free tier card to admin editor (nice to have for consistency)

