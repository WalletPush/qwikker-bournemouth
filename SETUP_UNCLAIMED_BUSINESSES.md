# Setup Unclaimed Businesses for Claim Flow Testing

## Overview
This guide helps you add the necessary database columns and create test businesses for the claim flow.

## Step 1: Fix Database Constraints & Add Columns
Run these in order:

**A) `fix_all_capitalization_constraints.sql`**
- Removes check constraints forcing lowercase on display fields
- Allows proper capitalization from Google Places

**B) `update_status_constraint.sql`** ⚠️ **CRITICAL!**
- Adds new free tier statuses: `unclaimed`, `pending_claim`, `claimed_free`, `pending_upgrade`
- Fixes issue where SMART migration used wrong constraint name

**C) `SAFE_make_user_id_nullable.sql`** ⚠️ **CRITICAL FOR IMPORTS!**
- Makes `user_id` NULLABLE (allows imported businesses to have NULL user_id)
- Keeps UNIQUE constraint (protects founding member flow)
- **Why?** Imported businesses don't have a creator, claimed businesses use `owner_user_id`

**D) `add_contact_columns_to_business_profiles.sql`**
- Adds `years_on_google` column
- ✅ Already exist: `email`, `phone`, `website`, `rating`, `review_count`

## Step 2: Create Test Businesses
Run this to create 5 sample unclaimed businesses (AFTER steps A, B, C above):

**File:** `create_test_unclaimed_businesses.sql`

This creates:
1. **The Golden Spoon** (Fine Dining) - 4.6★, 847 reviews
2. **Coastal Coffee Roasters** (Coffee Shop) - 4.8★, 203 reviews
3. **The Beachside Bistro** (Mediterranean) - 4.5★, 392 reviews
4. **Urban Cuts Barbers** (Grooming) - 4.9★, 156 reviews
5. **The Vine Wine Bar** (Wine Bar) - 4.7★, 521 reviews

All businesses have:
- ✅ Complete contact info (phone, email, website)
- ✅ Google ratings and review counts
- ✅ Status: `unclaimed`
- ✅ Visibility: `discover_only` (not in AI chat)
- ✅ Auto-imported: `true`

## Step 3: Test the Claim Flow
1. Go to `/claim` page
2. Search for a business (e.g., "golden", "coffee", "barber")
3. Click "Claim This Business"
4. Enter email and verify
5. Create account
6. **Confirm/update all business details** ← This is critical!
7. Submit for admin approval

## What Happens During Claim?
When a business owner claims their listing, they **MUST** be able to:
1. ✅ View all pre-populated info from Google (name, address, phone, email, website, rating)
2. ✅ **CONFIRM or UPDATE** every single field:
   - Business name
   - Address (street, town, postcode)
   - Phone number
   - Email address
   - Website URL
   - Business description/tagline
   - Category/type
3. ✅ Upload better photos (replace auto-imported images)
4. ✅ See Google rating & reviews (read-only, can't fake this)
5. ✅ Submit for admin review

**CRITICAL:** Businesses can ADD missing info or FIX incorrect info before submitting!

Admin then:
1. Reviews the claim request
2. Verifies the business details (especially contact info)
3. Approves → business gets `claimed_free` status with limited dashboard
4. Business can upgrade to trial (90 days Featured) or paid plan
5. Once upgraded, they complete action items and submit for full approval

## Next Steps
- [ ] Build confirmation UI in claim flow (Step 3)
- [ ] Allow business owners to edit details before submission
- [ ] Build Google Places import tool for real data
- [ ] Add analytics preview ("You had 47 views this week!")

