# Placeholder System Fix - Final Implementation

## Problem
- Cafes showing restaurant images
- 404 errors for `/placeholders/other/other-abstract-00.v1.webp`
- Old versioned placeholder system still being referenced

## Root Cause
Components were passing old props to `BusinessCardImage` that no longer exist after simplification.

## Files Changed

### 1. `components/user/business-card.tsx` ✅
**Changed:**
- Removed old props: `googlePlaceId`, `imageSource`, `placeholderVariant`, `businessStatus`
- Wrapped image logic in IIFE to calculate `systemCategory` once
- Added dev-only console.log to verify category mapping
- Now passes only: `businessName`, `businessId`, `systemCategory`, `showUnclaimedBadge`, `className`

**Result:** Discover grid cards now use correct placeholders based on `system_category`

### 2. `components/user/user-business-detail-page.tsx` ✅
**Changed:**
- Removed old props from `BusinessCardImage` usage
- Added dev-only console.log for verification
- Wrapped in IIFE for cleaner code

**Result:** Business detail pages now use correct placeholders

### 3. `lib/placeholders/getPlaceholderImage.ts` ✅
**Added:**
- Category validation: only `['restaurant', 'cafe', 'bar', 'barber', 'bakery', 'dessert']` have images
- Automatic fallback to `/placeholders/default/00.webp` for categories without images
- Dev warning when fallback is used
- For default category, always uses variant 00 (no randomization)

**Result:** Categories without placeholder images gracefully fall back to default

## Verification

### ✅ No `.v1.webp` references in active code
```bash
grep -r "\.v1\.webp" --include="*.tsx" --include="*.ts"
```
Only found in `lib/constants/category-placeholders.ts` (unused file)

### ✅ Dev Logging Added
When running in development, the console will show:
```javascript
🔍 Placeholder mapping: {
  name: "Coastal Coffee Roasters",
  system_category: "cafe",
  url: "/placeholders/cafe/01.webp"
}
```

### ✅ Placeholder Files Verified
```
public/placeholders/
├── restaurant/ (00, 01, 02) ✅
├── cafe/ (00, 01, 02) ✅
├── bar/ (00, 01, 02) ✅
├── barber/ (00, 01, 02) ✅
├── bakery/ (00, 01, 02) ✅
├── dessert/ (00, 01, 02) ✅
├── default/ (00) ✅
└── salon/ (empty - will use default) ✅
```

## Expected Behavior

### ✅ Before Fix:
- Request: `/placeholders/other/other-abstract-00.v1.webp` (404)
- Cafes showed restaurant images
- Complex category library lookup

### ✅ After Fix:
- Request: `/placeholders/cafe/01.webp` (200)
- Cafes show cafe images
- Restaurant shows restaurant images
- Simple deterministic hash-based selection
- Categories without images fallback to default automatically

## Test in Dev

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Open browser console** and navigate to `/user/discover`

3. **Verify console output:**
   ```
   🔍 Placeholder mapping: { name: "...", system_category: "cafe", url: "/placeholders/cafe/XX.webp" }
   ```

4. **Check network tab:**
   - ✅ All requests should be `/placeholders/{category}/{00|01|02}.webp`
   - ❌ No requests for `.v1.webp` files
   - ❌ No 404 errors

5. **Visual verification:**
   - Cafes show coffee/cafe imagery
   - Restaurants show food/dining imagery
   - Bars show drinks/bar imagery

## Mapping Logic

```typescript
business.system_category → folder name (validated)
    ↓
"cafe"     → /placeholders/cafe/{00|01|02}.webp
"restaurant" → /placeholders/restaurant/{00|01|02}.webp
"salon"    → /placeholders/default/00.webp (no images yet)
"other"    → /placeholders/default/00.webp (fallback)
```

## Files NOT Changed (No Longer Used)
- `lib/constants/category-placeholders.ts` - 590 lines, can be deleted
- `components/admin/placeholder-selector.tsx` - already simplified in previous commit
- `app/api/admin/businesses/placeholder-variant/route.ts` - already simplified

## Summary
✅ **3 files changed**
✅ **Zero .v1.webp references in active code**
✅ **Deterministic URL format:** `/placeholders/{category}/{00|01|02}.webp`
✅ **Automatic fallback** for categories without images
✅ **Dev logging** for verification

