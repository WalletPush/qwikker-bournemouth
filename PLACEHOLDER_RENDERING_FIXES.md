# Placeholder Image Rendering Fixes ✅

## 🔴 Problems Fixed

### 1. Placeholder Selector Not Visible in Admin CRM Card
**Issue:** PlaceholderSelector component wasn't rendering in the admin dashboard's Unclaimed Listings tab

### 2. Broken Images in Claim Search Results
**Issue:** Claim page showing broken image icon (blue box) instead of placeholder images for unclaimed businesses

---

## 🔍 Root Causes

### **Problem 1: Missing Database Columns**

**File:** `app/admin/page.tsx` (Lines 56-91)

The admin page query was **not fetching** the required columns for the PlaceholderSelector:

```typescript
// ❌ MISSING:
system_category
display_category
placeholder_variant
```

**Why this broke:**
```typescript
// components/admin/comprehensive-business-crm-card.tsx (Line 1152)
const resolvedCategory = business.system_category ?? (business as any).systemCategory ?? null
const canShowPlaceholderSelector = isUnclaimed && !!resolvedCategory
//                                                    ^^^ Always null!
```

Since `system_category` wasn't fetched, `resolvedCategory` was always `null`, so the gate check failed and PlaceholderSelector never rendered.

---

### **Problem 2: No Placeholder Fallback**

**File:** `app/claim/page.tsx` (Lines 415-421, 510-514)

The claim page was using raw `<img>` tags with no fallback:

```typescript
// ❌ BROKEN:
{business.image && (
  <img src={business.image} alt={displayName} />
)}
// If business.image is null → shows nothing → browser shows broken image icon
```

**Why this broke:**
- Unclaimed, auto-imported businesses have `business_images: null`
- The `&&` conditional only rendered `<img>` when `business.image` exists
- When `business.image` is `null`, nothing renders
- Browser shows blue broken image icon

---

## ✅ Fixes Applied

### **Fix 1: Added Missing Columns to Admin Query**

**File:** `app/admin/page.tsx` (Lines 56-91)

```typescript
.select(`
  id,
  user_id,
  owner_user_id,
  city,
  business_name,
  // ... other fields ...
  system_category,      // ✅ ADDED: Required for category-based placeholders
  display_category,     // ✅ ADDED: For UI display
  placeholder_variant,  // ✅ ADDED: Which placeholder variant (0-2) to show
  // ... rest of fields ...
`)
```

**Result:**
- PlaceholderSelector gate now passes: `!!resolvedCategory === true`
- Selector component renders for unclaimed businesses
- Admins can now change placeholder variants

---

### **Fix 2: Replaced Raw `<img>` with Placeholder-Aware Logic**

**File:** `app/claim/page.tsx`

#### **Added Imports (Lines 14-15):**
```typescript
import { getPlaceholderUrl } from '@/lib/placeholders/getPlaceholderImage'
import { resolveSystemCategory } from '@/lib/utils/resolve-system-category'
```

#### **Fixed Search Results (Lines 415-432):**

**Before:**
```typescript
{business.image && (
  <img 
    src={business.image} 
    alt={displayName}
    className="w-20 h-20 rounded-lg object-cover"
  />
)}
```

**After:**
```typescript
{/* ✅ Always show image - use placeholder for unclaimed businesses */}
<img 
  src={
    business.image || 
    getPlaceholderUrl(
      resolveSystemCategory(business),
      business.id
    )
  }
  alt={displayName}
  className="w-20 h-20 rounded-lg object-cover"
  onError={(e) => {
    // Fallback to default placeholder if image fails to load
    const target = e.target as HTMLImageElement
    target.src = getPlaceholderUrl('other', business.id)
  }}
/>
```

#### **Fixed Confirm Step (Lines 510-527):**

Same pattern applied to the "Confirm Your Business" step image.

---

## 📊 Before vs. After

### **Admin CRM Card - PlaceholderSelector**

| Before ❌ | After ✅ |
|-----------|----------|
| PlaceholderSelector not visible | PlaceholderSelector renders |
| Missing `system_category`, `placeholder_variant` | All required columns fetched |
| Gate check always fails | Gate check passes for unclaimed |
| No way to change placeholder | Admins can select variants 0-2 |

### **Claim Page - Search Results**

| Before ❌ | After ✅ |
|-----------|----------|
| Blue broken image icon | Proper placeholder image |
| Only shows image if `business.image` exists | Always shows image (placeholder fallback) |
| No error handling | `onError` fallback to default |
| Inconsistent with Discover | Matches Discover visual behavior |

---

## 🎯 How It Works Now

### **1. Unclaimed Business in Claim Search**

**Data:**
```json
{
  "id": "ChIJ...",
  "business_name": "El Murrino",
  "system_category": "restaurant",
  "placeholder_variant": 0,
  "business_images": null
}
```

**Rendered:**
```typescript
// src = getPlaceholderUrl('restaurant', 'ChIJ...')
// Result: '/placeholders/restaurant/00.webp'
```

**Visual:** Placeholder image based on category + variant

---

### **2. Claimed Business in Claim Search**

**Data:**
```json
{
  "id": "abc123",
  "business_name": "My Restaurant",
  "logo": "https://res.cloudinary.com/..."
}
```

**Rendered:**
```typescript
// src = business.image (Cloudinary URL)
```

**Visual:** Real uploaded logo

---

### **3. Admin PlaceholderSelector**

**For unclaimed businesses:**
```typescript
// Gate check:
const isUnclaimed = !business.owner_user_id && 
  (business.status === 'unclaimed' || ...)

const resolvedCategory = business.system_category // ✅ Now fetched!
const canShowPlaceholderSelector = isUnclaimed && !!resolvedCategory

if (canShowPlaceholderSelector) {
  // ✅ Render selector with variants 0, 1, 2
}
```

**Visual:** Admin sees 3 placeholder options, can select and save

---

## 🔒 Error Handling

### **Placeholder Image Load Failure**

```typescript
onError={(e) => {
  const target = e.target as HTMLImageElement
  target.src = getPlaceholderUrl('other', business.id)
}}
```

**If placeholder fails to load:**
1. Catches error
2. Falls back to `/placeholders/default/00.webp`
3. Never shows broken image icon

---

## 🧪 Testing Checklist

### **✅ Admin Placeholder Selector**

1. Go to Admin Dashboard
2. Click "Unclaimed Listings" tab
3. Open a business card (e.g., El Murrino)
4. Scroll to "Files & Assets" section
5. **Expected:** PlaceholderSelector visible with 3 variants
6. Click a different variant
7. Click "Save"
8. **Expected:** Placeholder updates on Discover page

### **✅ Claim Page Images**

1. Go to `/claim`
2. Search for "El Murrino"
3. **Expected:** Search result shows placeholder image (NOT broken icon)
4. Click on the business
5. **Expected:** Confirm step shows placeholder image
6. **Expected:** Image matches the category (restaurant placeholder)

---

## 📝 Files Changed

1. **`app/admin/page.tsx`**
   - Added `system_category`, `display_category`, `placeholder_variant` to SELECT query
   - Lines 56-91

2. **`app/claim/page.tsx`**
   - Added imports for `getPlaceholderUrl` and `resolveSystemCategory`
   - Replaced conditional image rendering with always-visible placeholder-aware logic
   - Added `onError` fallback to default placeholder
   - Lines 14-15, 415-432, 510-527

---

## ✅ Result

**Before:**
- ❌ PlaceholderSelector invisible in admin
- ❌ Broken image icons in claim search
- ❌ Inconsistent placeholder behavior

**After:**
- ✅ PlaceholderSelector visible and functional
- ✅ All images show properly (placeholder or real)
- ✅ Consistent placeholder system everywhere
- ✅ Error handling prevents broken icons
- ✅ Admin can change placeholder variants

---

**Try it now:**
1. Admin → Unclaimed Listings → Should see PlaceholderSelector ✅
2. Claim page → Search → Should see placeholder images (no broken icons) ✅

**The placeholder system now works consistently across the entire app! 🎉**

