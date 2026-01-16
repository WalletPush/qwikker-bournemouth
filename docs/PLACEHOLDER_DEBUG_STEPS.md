# Placeholder Image Debug Steps

## Issue Reported
Restaurants showing cafe images (coffee/latte art instead of food)

## Enhanced Logging Added

### 1. Business Card Component
Now logs:
```javascript
🔍 Business Card Placeholder: {
  businessName: "The Golden Spoon",
  rawSystemCategory: "restaurant", // or "cafe" if wrong in DB
  resolvedCategory: "restaurant",
  displayCategory: "Fine Dining",
  businessCategory: "...",
  businessType: "...",
  willUsePlaceholder: true
}
```

### 2. getPlaceholderUrl Function
Now logs:
```javascript
📸 getPlaceholderUrl: {
  input: "restaurant",
  resolved: "restaurant",
  variant: "01",
  finalUrl: "/placeholders/restaurant/01.webp",
  wasValidCategory: true
}
```

## Debug Steps

### Step 1: Hard Refresh
1. Open `http://localhost:3000/user/discover`
2. **Hard refresh:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Open browser console (F12 or Cmd+Option+I)

### Step 2: Check Console Logs
Look for the logs above. You should see pairs like:
```
🔍 Business Card Placeholder: { businessName: "The Golden Spoon", rawSystemCategory: "???" ... }
📸 getPlaceholderUrl: { input: "???", resolved: "???" ... }
```

### Step 3: Check Network Requests
Open Network tab (in DevTools), filter for "placeholders":
- ✅ Should see: `/placeholders/restaurant/01.webp`
- ❌ Should NOT see: `/placeholders/cafe/01.webp` (for restaurants)

### Step 4: Identify the Problem

#### Scenario A: Database has wrong system_category
If console shows:
```
rawSystemCategory: "cafe"  // WRONG!
```
For "The Golden Spoon" (Fine Dining), then the database needs to be fixed.

**Fix:** Update database:
```sql
UPDATE business_profiles 
SET system_category = 'restaurant'
WHERE business_name = 'The Golden Spoon';
```

#### Scenario B: Category not being passed correctly
If console shows:
```
rawSystemCategory: undefined
resolvedCategory: "other"
```
Then the database column is NULL or the query isn't selecting it.

**Fix:** Check the discover page query includes `system_category` in SELECT.

#### Scenario C: Images are cached
If network shows correct URL but wrong image displays:
1. Clear browser cache
2. Check if image files are correct:
   ```bash
   ls -la public/placeholders/restaurant/
   ls -la public/placeholders/cafe/
   ```
3. Verify the actual image content matches the category

## Quick Database Check Query

Run this in Supabase SQL editor:
```sql
SELECT 
  business_name,
  system_category,
  display_category,
  business_type,
  status
FROM business_profiles
WHERE business_name IN ('The Golden Spoon', 'The Beachside Bistro')
ORDER BY business_name;
```

Expected result:
```
The Golden Spoon     | restaurant | Fine Dining    | ... | unclaimed
The Beachside Bistro | restaurant | Mediterranean  | ... | unclaimed
```

If `system_category` shows `cafe` or `NULL`, that's the problem.

## Emergency Fix (If Database is Wrong)

```sql
-- Fix all restaurants that are incorrectly marked as cafe
UPDATE business_profiles
SET system_category = 'restaurant'
WHERE display_category IN ('Fine Dining', 'Restaurant', 'Mediterranean', 'Italian', 'Indian', 'Chinese')
AND system_category != 'restaurant';

-- Verify
SELECT business_name, system_category, display_category
FROM business_profiles
WHERE display_category IN ('Fine Dining', 'Restaurant', 'Mediterranean')
LIMIT 10;
```

## Files Changed for Debugging
1. `components/user/business-card.tsx` - Enhanced logging
2. `lib/placeholders/getPlaceholderImage.ts` - URL generation logging

## After Debugging
Once issue is identified and fixed:
1. Remove or comment out the dev console.logs
2. Test in production mode to ensure no logging overhead
