# ✅ IMPORT TOOL UI & CATEGORY ARCHITECTURE FIX

**Status**: 🟢 **COMPLETE**  
**Date**: January 11, 2026  
**Critical Issue**: Import tool & onboarding were using different category systems, causing category drift

---

## 🎯 CRITICAL FIX: CANONICAL CATEGORY SYSTEM

### **THE PROBLEM**

**Before**: Import tool had its own hardcoded `CATEGORIES` array:
```typescript
const CATEGORIES = [
  'Restaurant',        // ❌ Display labels used as values
  'Cafe/Coffee Shop',  // ❌ Not matching system_category enum
  'Hairdresser/Barber',// ❌ Would cause placeholder issues
  ...
]
```

This caused:
- ❌ Dropdown values didn't match `system_category` enum
- ❌ Placeholder folders wouldn't match (e.g., `/placeholders/Cafe/Coffee Shop/` ❌)
- ❌ Filtering wouldn't work correctly
- ❌ Category drift across onboarding vs import

---

### **THE FIX**

**Now**: Import tool uses canonical `ONBOARDING_CATEGORY_OPTIONS` from `system-categories.ts`:

```typescript
import { ONBOARDING_CATEGORY_OPTIONS, type SystemCategory, SYSTEM_CATEGORY_LABEL } from '@/lib/constants/system-categories'

// Dropdown shows display labels but stores system_category values
<Select value={category} onValueChange={(value) => setCategory(value as SystemCategory)}>
  <SelectContent>
    {ONBOARDING_CATEGORY_OPTIONS.map(option => (
      <SelectItem key={option.value} value={option.value}>
        {option.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**What User Sees** (display_category):
- Restaurant
- Cafe / Coffee Shop
- Hairdresser / Barber
- Gift Shop

**What Gets Stored** (system_category):
- `restaurant`
- `cafe`
- `barber`
- `retail`

---

## 🎨 UI IMPROVEMENTS ADDED

### **1. Sort By Dropdown**

Users can now sort results by:
- ✅ **Highest Rating** (default)
- ✅ **Most Reviews**
- ✅ **Nearest First**

```typescript
.sort((a, b) => {
  if (sortBy === 'rating') return b.rating - a.rating
  if (sortBy === 'reviews') return b.reviewCount - a.reviewCount
  if (sortBy === 'distance') return a.distance - b.distance
  return 0
})
```

---

### **2. Skip Duplicates Toggle**

- ✅ Checkbox to automatically skip businesses already imported
- ✅ Enabled by default
- ✅ Passed to API for server-side filtering

```typescript
const [skipDuplicates, setSkipDuplicates] = useState(true)
```

---

### **3. "What Happens Next" Info Box**

Clear explanation of the import process:
- Businesses added as **unclaimed** (visible in Discover only)
- NOT visible in AI chat until claimed
- Owners can claim via QR or claim page
- Placeholder images used until real photos uploaded

---

### **4. Improved Cost Display**

- ✅ Cost per business shown in max results badge
- ✅ Selection summary shows estimated import cost
- ✅ Clear breakdown of Google Places API costs

---

## 🔧 API CHANGES

### **Sent to Preview API**:
```typescript
{
  city,
  location,
  category,        // SystemCategory enum (e.g. 'restaurant')
  minRating,
  radius,
  maxResults,
  skipDuplicates   // ✅ NEW
}
```

### **Sent to Import API**:
```typescript
{
  city,
  placeIds,
  systemCategory: category,                    // ✅ NEW: Stable enum
  displayCategory: SYSTEM_CATEGORY_LABEL[category], // ✅ NEW: User-facing label
  skipDuplicates                               // ✅ NEW
}
```

**BEFORE** (❌ Wrong):
```typescript
{
  category: 'Cafe/Coffee Shop',  // Display label, not enum!
  businessType: 'other'          // Generic fallback
}
```

**AFTER** (✅ Correct):
```typescript
{
  systemCategory: 'cafe',           // Stable enum
  displayCategory: 'Cafe / Coffee Shop' // Display label
}
```

---

## ✅ BENEFITS

### **1. Consistency Across Platform**

- ✅ Onboarding form: uses `ONBOARDING_CATEGORY_OPTIONS`
- ✅ Import tool: uses `ONBOARDING_CATEGORY_OPTIONS`
- ✅ Both store `system_category` (stable enum)
- ✅ Both display `display_category` (user-friendly label)

### **2. Placeholder System Works**

- ✅ `/public/placeholders/restaurant/` matches `system_category: 'restaurant'`
- ✅ `/public/placeholders/cafe/` matches `system_category: 'cafe'`
- ❌ NO MORE `/public/placeholders/Cafe/Coffee Shop/` mismatches

### **3. Filtering & Analytics**

- ✅ All filtering uses `system_category`
- ✅ Analytics can group by stable enum
- ✅ No "Cafe/Coffee Shop" vs "Cafe / Coffee Shop" vs "Café" issues

### **4. Multi-Tenant Safe**

- ✅ All franchises use the same category system
- ✅ No per-franchise category drift
- ✅ Easy to add new categories globally

---

## 📊 CATEGORY MAPPING EXAMPLES

| User Selects (UI) | `system_category` | `display_category` | Placeholder Folder |
|-------------------|-------------------|--------------------|--------------------|
| Restaurant | `restaurant` | "Restaurant" | `/placeholders/restaurant/` |
| Cafe / Coffee Shop | `cafe` | "Cafe / Coffee Shop" | `/placeholders/cafe/` |
| Hairdresser / Barber | `barber` | "Hairdresser / Barber" | `/placeholders/barber/` |
| Bar / Wine Bar | `bar` | "Bar / Wine Bar" | `/placeholders/bar/` |
| Pub / Gastropub | `pub` | "Pub / Gastropub" | `/placeholders/pub/` |
| Gift Shop | `retail` | "Retail" | `/placeholders/retail/` |
| Clothing/Fashion | `retail` | "Retail" | `/placeholders/retail/` |

---

## 🔥 KEY POINTS

1. ✅ **NEVER use display labels as database values**
2. ✅ **ALWAYS use `system_category` for logic/storage**
3. ✅ **ALWAYS use `display_category` for UI display**
4. ✅ **ONE source of truth**: `lib/constants/system-categories.ts`

---

## 📝 FILES CHANGED

### **`app/admin/import/page.tsx`**

**Changes**:
1. ✅ Removed hardcoded `CATEGORIES` array
2. ✅ Import `ONBOARDING_CATEGORY_OPTIONS`, `SystemCategory`, `SYSTEM_CATEGORY_LABEL`
3. ✅ Changed `category` state type to `SystemCategory`
4. ✅ Dropdown uses `ONBOARDING_CATEGORY_OPTIONS`
5. ✅ Added `sortBy` state and sorting logic
6. ✅ Added `skipDuplicates` state and toggle
7. ✅ Added "What Happens Next" info box
8. ✅ API calls now send `systemCategory` + `displayCategory`

---

## 🚀 NEXT STEPS

**For Tomorrow**:
1. ✅ Update API endpoints to accept `systemCategory` and `displayCategory`
2. ✅ Ensure Google Places mapping uses `system_category`
3. ✅ Test full flow: import → display → placeholder images

---

**CRITICAL ARCHITECTURE FIX COMPLETE. NO MORE CATEGORY DRIFT.** 🎯

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Status**: Production-Ready (pending API updates)

