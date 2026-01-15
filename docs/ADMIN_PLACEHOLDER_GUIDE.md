# Admin Guide: How to Change Placeholder Images

## Where to Find It

### Step-by-Step:

1. **Go to Admin Dashboard**
   - Navigate to: `http://localhost:3000/admin` (or `bournemouth.qwikker.com/admin` in production)

2. **Find an Unclaimed Business**
   - Scroll through the business list
   - Look for businesses with status: **"Unclaimed"**
   - ⚠️ **Note:** Placeholder selector ONLY appears for unclaimed businesses

3. **Open the Business Card**
   - Click on a business card to expand it

4. **Navigate to "Files & Assets" Tab**
   - Look for the tab navigation at the top of the expanded card
   - Tabs: Overview | Contact | **Files & Assets** | Activity | Tasks | Offers | Events | Controls | Analytics
   - Click on **"Files & Assets"**

5. **Placeholder Image Selector**
   - Inside the Files & Assets tab, you'll see:
     ```
     📷 Placeholder Image Selector (Unclaimed Listing)
     
     [Preview thumbnail]
     Category: restaurant
     Variant: 01
     
     Select Placeholder Variant: [Dropdown]
     ⭐ Variant 00
        Variant 01
        Variant 02
     
     [Save Placeholder] button
     ```

## Important Notes

### ⚠️ Only Shows for Unclaimed Businesses
The placeholder selector will **NOT appear** if:
- Business status is `claimed`, `approved`, or `claimed_free`
- Business has uploaded real images
- Business `system_category` is missing/null

### ✅ When It Appears
The placeholder selector appears when:
- ✅ `business.status === 'unclaimed'`
- ✅ `business.system_category` exists (restaurant, cafe, bar, etc.)

### 🎨 Available Variants
Each category has 3 variants:
- **Variant 00** (default) - Selected automatically by hash
- **Variant 01** - Alternative image
- **Variant 02** - Another alternative

Categories with placeholder images:
- restaurant
- cafe
- bar
- barber
- bakery
- dessert

Other categories (salon, pub, etc.) will fall back to `/placeholders/default/00.webp`

## What Happens When You Change It

1. Admin selects a variant (00, 01, or 02)
2. Clicks "Save Placeholder"
3. Makes API call to `/api/admin/businesses/placeholder-variant`
4. Updates `business_profiles.placeholder_variant` in database
5. **Page refreshes automatically** to show the new image

## How the System Works

### Default Behavior (No Manual Selection)
If admin doesn't manually select a variant:
- System uses deterministic hash based on `business.id`
- Same business always gets the same variant
- Formula: `hash(businessId) % 3` = 0, 1, or 2

### After Manual Selection
- Overrides the automatic selection
- Stores the chosen variant in `placeholder_variant` column
- Admin can change it anytime (for unclaimed businesses only)

### After Business Claims Their Listing
- Placeholder selector disappears
- Business uploads real photos
- `placeholder_variant` field is ignored (real images take priority)

## Troubleshooting

### "I don't see the placeholder selector"
Check:
1. Is the business status "unclaimed"? (Check Overview tab)
2. Does the business have a `system_category`? (Check database or Overview tab)
3. Are you in the "Files & Assets" tab?
4. Hard refresh the page: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### "The preview shows the wrong image"
1. Check browser console for errors
2. Verify the placeholder files exist:
   ```bash
   ls public/placeholders/restaurant/
   # Should show: 00.webp, 01.webp, 02.webp
   ```
3. Hard refresh to clear cache

### "Changes aren't saving"
1. Check browser console for API errors
2. Verify admin has permission
3. Check network tab for 403/500 errors
4. Verify the business is still unclaimed (page may need refresh)

## File Locations

- **Component:** `components/admin/placeholder-selector.tsx`
- **API Route:** `app/api/admin/businesses/placeholder-variant/route.ts`
- **Business Card:** `components/admin/comprehensive-business-crm-card.tsx` (line 1147)
- **Images:** `public/placeholders/{category}/{00|01|02}.webp`

## Quick Test

To quickly test if it's working:

1. Go to `/admin`
2. Find "The Golden Spoon" or any restaurant with status "unclaimed"
3. Click to expand
4. Click "Files & Assets" tab
5. You should see the placeholder selector with 3 variants
6. Select a different variant
7. Click "Save Placeholder"
8. Page refreshes and new image should appear

If you don't see it, the business might not be marked as "unclaimed" in the database.

