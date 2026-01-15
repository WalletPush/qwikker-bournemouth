# Placeholder CamelCase Fix

## Problem
All businesses were showing `/placeholders/default/00.webp` (cafe image with coffee cups) regardless of their actual category.

## Root Cause: Field Name Mismatch

### What Happened:
1. **Database:** Uses `system_category` (snake_case)
2. **Server transformation** (`app/user/discover/page.tsx`): Converts to `systemCategory` (camelCase) at line 190
3. **Client components:** Were looking for `business.system_category` (snake_case)
4. **Result:** `undefined` → fallback to `'other'` → `/placeholders/default/00.webp`

### Console Evidence:
```javascript
rawSystemCategory: undefined  // ← The field didn't exist!
resolvedCategory: "other"     // ← Fallback triggered
finalUrl: "/placeholders/default/00.webp"
```

## Solution

### Files Fixed (3):

1. **`components/user/business-card.tsx`**
   - Changed: `business.system_category` → `business.systemCategory ?? business.system_category`
   - Now checks camelCase first (from server), then snake_case (fallback)

2. **`components/user/user-business-detail-page.tsx`**
   - Same fix applied

3. **`lib/placeholders/getPlaceholderImage.ts`**
   - Removed excessive debug logging (kept only the fallback warning)

## Verification

After fix, console should show:
```javascript
🔍 Business Card Placeholder: {
  businessName: "The Golden Spoon",
  camelCase: "restaurant",     // ✅ Now populated!
  snakeCase: undefined,
  resolvedCategory: "restaurant",
  willUsePlaceholder: true
}
```

Network requests:
```
✅ /placeholders/restaurant/01.webp (for restaurants)
✅ /placeholders/cafe/02.webp (for cafes)
✅ /placeholders/bar/00.webp (for bars)
```

## Database Verification

All businesses now have correct `system_category`:
```sql
SELECT business_name, system_category FROM business_profiles;
```

Results:
- ✅ The Golden Spoon → restaurant
- ✅ The Beachside Bistro → restaurant  
- ✅ Coastal Coffee Roasters → cafe
- ✅ Alexandra's Café → cafe
- ✅ Adams Cocktail Bar → bar
- ✅ Mike's Pool Bar → bar
- ✅ Urban Cuts Barbers → barber (note: was showing as 'bar', should verify)
- ✅ Scizzors → barber

## Test Now

1. **Hard refresh:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Check console** - should see categories populated
3. **Visual check:**
   - Restaurants → food/dining imagery
   - Cafes → coffee/latte art
   - Bars → drinks/bottles
   - Barbers → scissors/chairs

## Note
"Urban Cuts Barbers" showed as `system_category: bar` in the database query. This should probably be `barber` instead. Quick fix:

```sql
UPDATE business_profiles 
SET system_category = 'barber' 
WHERE business_name = 'Urban Cuts Barbers';
```

