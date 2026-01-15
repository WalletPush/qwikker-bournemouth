# Placeholder Selector Not Showing - Debug Guide

## Problem
The placeholder selector is not appearing in the Files & Assets tab for "The Golden Spoon" even though it shows "Unclaimed" status.

## Root Cause
The `BusinessCRMData` TypeScript interface was missing two critical fields:
- `system_category` (needed to determine which placeholder images to show)
- `placeholder_variant` (stores admin's manual selection)

## Fix Applied

### 1. Updated TypeScript Interface
**File:** `types/billing.ts`

Added to `BusinessCRMData`:
```typescript
system_category: string | null // For placeholder image logic
placeholder_variant: number | null // Admin-selected placeholder variant (0, 1, 2)
```

Also expanded the `status` type to match actual database values:
```typescript
status: 'incomplete' | 'pending_review' | 'approved' | 'rejected' | 'unclaimed' | 'claimed' | 'claimed_free'
```

### 2. Data Flow
```
database (business_profiles)
  ↓ .select('*') fetches all columns including system_category
lib/actions/admin-crm-actions.ts
  ↓ getBusinessCRMData(city)
app/admin/page.tsx
  ↓ passes crmData prop
components/admin/admin-dashboard.tsx
  ↓ passes business to
components/admin/comprehensive-business-crm-card.tsx
  ↓ Files & Assets tab checks:
  ↓ if (business.status === 'unclaimed' && business.system_category)
  ✓ Shows PlaceholderSelector component
```

## Verification Steps

### 1. Check Database (SQL)
```sql
SELECT 
  business_name,
  status,
  system_category,
  placeholder_variant
FROM business_profiles 
WHERE business_name = 'The Golden Spoon';
```

**Expected:**
- `status` should be `'unclaimed'` (lowercase)
- `system_category` should be `'restaurant'`
- `placeholder_variant` can be NULL (defaults to 0)

### 2. Check Browser Console
After the fix, refresh the admin page and check console for:
```javascript
// Look for CRM data logs
"Loaded sync data for X businesses"
"Found X menu(s) for The Golden Spoon"
```

### 3. Hard Refresh Admin Page
- Clear cache: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Navigate to `/admin`
- Find "The Golden Spoon"
- Click to expand
- Go to "Files & Assets" tab

**Should now see:**
```
📷 Placeholder Image Selector (Unclaimed Listing)

[Preview Image]
Category: restaurant
Current Variant: 01

Select Placeholder Variant:
[Dropdown with 00, 01, 02]

[Save Placeholder Button]
```

## If Still Not Showing

### Debug Checklist:

1. **Verify TypeScript Types Were Reloaded**
   - Restart Next.js dev server: `pnpm dev`
   - TypeScript compilation needs to pick up the new interface

2. **Check Actual Status Value**
   ```sql
   SELECT status FROM business_profiles WHERE business_name = 'The Golden Spoon';
   ```
   
   If it returns anything other than `'unclaimed'`, the condition won't match.
   
   Common mismatches:
   - `'Unclaimed'` (capitalized) ❌
   - `'pending_review'` ❌
   - `'incomplete'` ❌
   - `'unclaimed'` ✅

3. **Check system_category is Not NULL**
   ```sql
   SELECT system_category FROM business_profiles WHERE business_name = 'The Golden Spoon';
   ```
   
   Must return `'restaurant'` (or another valid category), not `NULL`.

4. **Verify Component Render Condition**
   In browser DevTools console:
   ```javascript
   // When you click on The Golden Spoon business card,
   // the component should log the business object
   // Check for:
   console.log(business.status) // should be 'unclaimed'
   console.log(business.system_category) // should be 'restaurant'
   ```

5. **Check Admin CRM Actions is Fetching Data**
   In `lib/actions/admin-crm-actions.ts`, the query uses `.select('*')` which fetches ALL columns.
   This should include `system_category` and `placeholder_variant`.

## Manual SQL Fix (If Needed)

If The Golden Spoon has wrong status or missing category:

```sql
-- Fix status
UPDATE business_profiles 
SET status = 'unclaimed' 
WHERE business_name = 'The Golden Spoon' 
AND city = 'bournemouth';

-- Fix system_category (if NULL)
UPDATE business_profiles 
SET system_category = 'restaurant' 
WHERE business_name = 'The Golden Spoon' 
AND city = 'bournemouth';
```

## Expected Behavior After Fix

### In Admin Dashboard - Files & Assets Tab:
- ✅ Placeholder selector appears
- ✅ Shows current category (restaurant)
- ✅ Shows 3 variant options (00, 01, 02)
- ✅ Shows live preview of selected image
- ✅ Save button updates database
- ✅ Page auto-refreshes to show new image

### In User Discover Page:
- ✅ Restaurant businesses show food/dining images
- ✅ Deterministic: same business always shows same variant
- ✅ Different variants for visual variety

## Next Steps

1. **Restart Dev Server** (critical!)
   ```bash
   # Kill current server
   lsof -ti:3000 | xargs kill -9
   
   # Start fresh
   pnpm dev
   ```

2. **Hard Refresh Admin Page**
   - `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

3. **Navigate to The Golden Spoon**
   - Click business card
   - Go to "Files & Assets" tab
   - Placeholder selector should now appear!

4. **Test the Selector**
   - Select different variants
   - Click "Save Placeholder"
   - Verify image changes on Discover page

## Technical Notes

### Why This Was Missed:
- TypeScript interfaces were defined before placeholder system was implemented
- Database schema has the columns, but TypeScript didn't know about them
- Component conditional check failed silently (no error, just no render)
- `.select('*')` fetched the data, but TypeScript filtered it out as "unknown properties"

### Prevention:
- Keep TypeScript interfaces in sync with database schema
- Use schema generators or code-first ORMs
- Add explicit select lists for critical fields
- Log missing required fields in development mode

