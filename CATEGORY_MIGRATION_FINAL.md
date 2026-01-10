# FINAL: Category Architecture - Ready to Migrate

## ✅ What's Been Prepared

### 1. **SQL Migration** (`add_system_category_to_business_profiles.sql`)
- Adds `google_types text[]` (raw Google data)
- Adds `system_category TEXT NOT NULL` (stable enum with CHECK constraint)
- Renames `business_category` → `display_category` (cosmetic label)
- Backfills all existing businesses
- Adds performance index
- Includes verification queries

### 2. **TypeScript Constants** (`lib/constants/system-categories.ts`)
- `SYSTEM_CATEGORIES` array (canonical list)
- `SystemCategory` type
- `SYSTEM_CATEGORY_LABEL` record (display labels)
- `mapGoogleTypesToSystemCategory()` function
- `getDisplayLabel()` helper
- `ONBOARDING_CATEGORY_OPTIONS` for forms

### 3. **Updated Placeholder System** (`lib/constants/category-placeholders.ts`)
- Now uses `SystemCategory` type (not strings)
- `getPlaceholder(systemCategory, googlePlaceId, variant)` signature
- Returns `SystemCategory[]` from `getAllPlaceholderCategories()`

---

## 🎯 The 3-Layer Architecture (Final)

### Layer 1: `google_types` (Database Only)
```typescript
google_types: ["cafe", "coffee_shop", "restaurant"]
```
- **Stored in:** `business_profiles.google_types`
- **Purpose:** Preserve raw Google Place API data
- **Used for:** Import debugging, re-mapping if needed
- **Never shown to:** Users

### Layer 2: `system_category` (The Core)
```typescript
system_category: "cafe"
```
- **Stored in:** `business_profiles.system_category`
- **Purpose:** Stable internal key
- **Drives:**
  - Placeholder selection: `/public/placeholders/cafe/`
  - AI filtering: `WHERE system_category = 'cafe'`
  - Discover filters
  - Analytics grouping
  - Pricing tiers
- **Never changes** unless admin corrects miscategorization
- **Type:** `SystemCategory` enum (16 values)

### Layer 3: `display_category` (UI Only)
```typescript
display_category: "Cafe / Coffee Shop"
```
- **Stored in:** `business_profiles.display_category`
- **Purpose:** User-facing label
- **Shown on:**
  - Business cards
  - Business detail pages
  - Onboarding dropdowns
  - Filter labels
- **Can be changed** anytime without breaking logic
- **Derived from:** `SYSTEM_CATEGORY_LABEL[system_category]`

---

## 📋 Migration Checklist

### ✅ Phase 1: Database (5 minutes)
```bash
# Run the migration
psql [your_connection_string] < add_system_category_to_business_profiles.sql
```

**What it does:**
1. Adds 3 new columns
2. Renames `business_category` → `display_category`
3. Backfills `system_category` from `display_category`
4. Adds CHECK constraint + index
5. Verifies results

**Safety:** Non-destructive, keeps all existing data

### ⏳ Phase 2: Update Code (30 minutes)

**Files to update:**

1. **Onboarding Form** - Store `system_category`, show `display_category`
   ```typescript
   import { ONBOARDING_CATEGORY_OPTIONS } from '@/lib/constants/system-categories'
   
   // Form options
   <select name="category">
     {ONBOARDING_CATEGORY_OPTIONS.map(opt => (
       <option key={opt.value} value={opt.value}>{opt.label}</option>
     ))}
   </select>
   
   // Save: system_category = form.category
   ```

2. **Import Tool** - Map Google types → system_category
   ```typescript
   import { mapGoogleTypesToSystemCategory } from '@/lib/constants/system-categories'
   
   const system_category = mapGoogleTypesToSystemCategory(place.types)
   const display_category = SYSTEM_CATEGORY_LABEL[system_category]
   
   // Save to DB:
   {
     google_types: place.types,
     system_category,
     display_category
   }
   ```

3. **Business Card Component** - Display `display_category`
   ```typescript
   <p className="text-sm text-gray-500">
     {business.display_category}
   </p>
   ```

4. **Discover Page Filters** - Filter by `system_category`
   ```typescript
   const { data } = await supabase
     .from('business_profiles')
     .select('*')
     .eq('system_category', selectedCategory) // ← system_category
   ```

5. **Placeholder Component** - Use `system_category`
   ```typescript
   import { getPlaceholder } from '@/lib/constants/category-placeholders'
   
   const placeholder = getPlaceholder(
     business.system_category, // ← not display_category!
     business.google_place_id,
     business.placeholder_variant
   )
   ```

### ⏳ Phase 3: Test (10 minutes)
- Existing businesses should display correctly
- Onboarding should save `system_category`
- Placeholders should load (once generated)
- Filters should work

---

## 🗂️ Placeholder Folder Structure (Now Stable!)

```
/public/placeholders/
  /restaurant/
    restaurant-abstract-01.v1.webp
    restaurant-abstract-02.v1.webp
    ...
  /cafe/
    cafe-abstract-01.v1.webp
    ...
  /bar/
    bar-abstract-01.v1.webp
    ...
  /barber/
    barber-abstract-01.v1.webp
    ...
  /dessert/
  /takeaway/
  /salon/
  /tattoo/
  /retail/
  /fitness/
  /sports/
  /hotel/
  /venue/
  /entertainment/
  /professional/
  /other/
```

**Key:** Folder names = `system_category` values (stable, never change!)

---

## 💡 Why This Fixes Everything

### Before (Broken):
```typescript
// Onboarding
business_category: "Cafe/Coffee Shop"

// Import from Google
business_category: "restaurant" // ← mismatch!

// Placeholder lookup
getPlaceholder("Cafe/Coffee Shop", ...) // ← doesn't match folder!
```

### After (Fixed):
```typescript
// Onboarding
system_category: "cafe"
display_category: "Cafe / Coffee Shop"

// Import from Google
system_category: "cafe" // ← consistent!
display_category: "Cafe / Coffee Shop"

// Placeholder lookup
getPlaceholder("cafe", ...) // ✅ /public/placeholders/cafe/
```

---

## 📊 Example Data After Migration

| ID | system_category | display_category | google_types |
|----|----------------|------------------|--------------|
| 1 | `cafe` | "Cafe / Coffee Shop" | `["cafe", "coffee_shop"]` |
| 2 | `restaurant` | "Restaurant" | `["restaurant", "meal_delivery"]` |
| 3 | `barber` | "Hairdresser / Barber" | `["hair_care", "barber_shop"]` |

**All systems use:** `system_category` (stable)  
**All UIs display:** `display_category` (cosmetic)  
**Import preserves:** `google_types` (debugging)

---

## 🚀 Next Steps (In Order)

1. **✅ Run SQL migration** (5 min)
2. **✅ Update 5 code files** (30 min)
3. **✅ Test locally** (10 min)
4. **✅ THEN generate placeholders** with correct `system_category` keys (30 min)
5. **✅ THEN build import tool** with Google type mapping

---

## 🎯 Status

**Database:** ✅ Ready to migrate  
**Code:** ✅ Constants ready, components pending update  
**Placeholders:** ⏳ Blocked until migration complete  
**Import Tool:** ⏳ Blocked until migration complete

---

**Ready to run the migration?** 

```bash
psql [your_connection_string] < add_system_category_to_business_profiles.sql
```

This is the foundation for everything else! 🏗️

