# CRITICAL: Category Architecture Fix

## What ChatGPT Identified

You're treating "category" as one field, but it's actually **THREE separate concepts**:

1. **Google Types** (import-only, never shown to users)
2. **System Category** (stable enum, drives everything)
3. **Display Category** (cosmetic label, can change anytime)

This is causing a fundamental mismatch between:
- Onboarding categories (user-facing labels)
- Import tool categories (Google-driven)
- Placeholder system (needs stable keys)

---

## The Fix (3-Layer Architecture)

### Layer 1: Google Types (Import-Only)
```typescript
google_types: ["cafe", "coffee_shop", "restaurant"]
```
- Raw data from Google Places API
- Used ONLY during import to map → system_category
- Never exposed to users
- Multiple types per business

### Layer 2: System Category (THE CORE)
```typescript
system_category: "cafe" // ← Stable enum
```
- **THE MOST IMPORTANT FIELD**
- Drives:
  - Placeholder image selection (`/public/placeholders/cafe/`)
  - AI filtering and prompts
  - Discover page filtering
  - Analytics and pricing
  - Database queries
- **Never changes** unless admin corrects miscategorization
- Fixed enum (15-18 values max)

### Layer 3: Display Category (Cosmetic)
```typescript
display_category: "Cafe / Coffee Shop" // ← What users see
```
- Purely cosmetic
- Shown on:
  - Business cards
  - Business detail pages
  - Onboarding dropdowns
  - Filter labels
- Can be changed anytime without breaking logic
- Derived from system_category for consistency

---

## Database Changes

### Current Schema:
```sql
business_profiles:
  business_category TEXT -- Used for everything (wrong!)
```

### New Schema:
```sql
business_profiles:
  system_category TEXT NOT NULL CHECK (...) -- Stable enum
  display_category TEXT                    -- Cosmetic label
  google_types TEXT[]                       -- Raw Google data (optional)
```

---

## Migration Steps

### Step 1: Run SQL Migration
```bash
psql [connection_string] < add_system_category_to_business_profiles.sql
```

**What it does:**
1. Adds `system_category` column with CHECK constraint
2. Renames `business_category` → `display_category`
3. Backfills `system_category` from existing `business_category`
4. Removes old CHECK constraint on display_category
5. Makes `system_category` NOT NULL

### Step 2: Update Codebase

**Files created:**
- `lib/constants/system-categories.ts` - Enum + mapping logic
- `add_system_category_to_business_profiles.sql` - Database migration

**Files to update:**
- ✅ `lib/constants/category-placeholders.ts` - Now uses `SystemCategory` type
- ⏳ Onboarding form - Use `system_category` as value, `display_category` as label
- ⏳ Import tool - Map `google_types` → `system_category`
- ⏳ Discover page - Filter by `system_category`, display `display_category`
- ⏳ Business card component - Show `display_category`
- ⏳ Admin CRM - Allow editing `system_category` + `display_category`

---

## Mapping Table (Copy/Paste Ready)

| Onboarding Label (Display) | System Category | Google Types (Examples) |
|----------------------------|----------------|------------------------|
| Restaurant | `restaurant` | `restaurant`, `pizza_restaurant` |
| Cafe / Coffee Shop | `cafe` | `cafe`, `coffee_shop` |
| Bar / Pub | `bar` | `bar`, `night_club`, `pub` |
| Dessert / Ice Cream | `dessert` | `bakery`, `ice_cream_shop` |
| Takeaway / Street Food | `takeaway` | `meal_takeaway`, `fast_food_restaurant` |
| Salon / Spa | `salon` | `beauty_salon`, `spa` |
| Hairdresser / Barber | `barber` | `hair_salon`, `barber_shop` |
| Tattoo / Piercing | `tattoo` | `tattoo_shop`, `piercing_shop` |
| Clothing / Fashion / Gifts | `retail` | `clothing_store`, `gift_shop` |
| Fitness / Gym | `fitness` | `gym`, `fitness_center` |
| Sports / Outdoors | `sports` | `sporting_goods_store` |
| Hotel / BnB | `hotel` | `lodging`, `hotel` |
| Venue / Event Space | `venue` | `event_venue`, `wedding_venue` |
| Entertainment / Attractions | `entertainment` | `tourist_attraction`, `museum` |
| Professional Services | `professional` | `lawyer`, `accounting` |
| Other | `other` | `establishment` |

---

## Why This Fixes Everything

### Before (Broken):
```typescript
// Pizza place imported from Google
business_category: "Restaurant" // ← onboarding label

// Coffee shop onboarding
business_category: "Cafe/Coffee Shop" // ← different format!

// Placeholder lookup
getPlaceholder("Restaurant", ...) // ← maps to /placeholders/restaurant/
getPlaceholder("Cafe/Coffee Shop", ...) // ← doesn't match folder name!
```

**Problems:**
- Placeholder folders don't match
- AI prompts inconsistent
- Can't filter reliably
- Admin fixes break placeholders

### After (Fixed):
```typescript
// Pizza place imported from Google
system_category: "restaurant" // ← stable enum
display_category: "Restaurant" // ← cosmetic

// Coffee shop onboarding
system_category: "cafe" // ← stable enum
display_category: "Cafe / Coffee Shop" // ← cosmetic

// Placeholder lookup
getPlaceholder("restaurant", ...) // ✅ maps to /placeholders/restaurant/
getPlaceholder("cafe", ...) // ✅ maps to /placeholders/cafe/
```

**Fixed:**
- ✅ Placeholder folders match stable enum
- ✅ AI uses same enum
- ✅ Filtering is reliable
- ✅ Admin can fix category without breaking placeholders
- ✅ Display labels can change without breaking logic

---

## Impact on Your Current Work

### ✅ **This HELPS placeholders (doesn't break them)**

**Before fix:**
- Generate placeholders for "Restaurant" vs "Cafe/Coffee Shop"?
- What if onboarding says "Restaurant" but import says "pizza_restaurant"?
- Placeholder folders wouldn't match

**After fix:**
- Generate placeholders for `system_category` enum
- `/public/placeholders/restaurant/` ✅
- `/public/placeholders/cafe/` ✅
- `/public/placeholders/bar/` ✅
- Always matches, never breaks

### ✅ **This HELPS import tool**

**Correct flow:**
1. Google Places returns `types: ["pizza_restaurant", "meal_delivery"]`
2. Map to `system_category: "restaurant"` (stable)
3. Set `display_category: "Restaurant"` (derived from system_category)
4. Placeholder auto-selects `/placeholders/restaurant/` ✅

### ✅ **This HELPS AI**

**Before:**
```typescript
// Inconsistent
"Show me businesses in Cafe/Coffee Shop category"
"Show me businesses in Restaurant category"
```

**After:**
```typescript
// Consistent enum
`WHERE system_category = 'cafe'`
`WHERE system_category = 'restaurant'`
```

---

## Next Steps (In Order)

1. **✅ DONE:** Created migration SQL
2. **✅ DONE:** Created `system-categories.ts` enum
3. **✅ DONE:** Updated `category-placeholders.ts` to use `SystemCategory`
4. **⏳ TODO:** Run SQL migration on database
5. **⏳ TODO:** Update remaining files (onboarding, import, discover, business card)
6. **⏳ TODO:** Test with existing businesses (should work unchanged)
7. **✅ THEN:** Generate placeholders (now with correct system_category keys)
8. **✅ THEN:** Build import tool (maps Google types → system_category)

---

## Migration Safety

**Will this break existing businesses?**
**NO!** The migration:
- Backfills `system_category` from existing `business_category`
- Renames `business_category` → `display_category` (keeps data)
- All existing businesses keep working

**Example:**
```sql
-- Before migration:
business_category: "Cafe/Coffee Shop"

-- After migration:
system_category: "cafe"          -- NEW (auto-mapped)
display_category: "Cafe / Coffee Shop" -- RENAMED (same data)
```

---

## ChatGPT's Verdict

> "You're not wrong — you just reached the point where the platform outgrew a single category field. Splitting it into Google types, system_category, and display_category will save you months of pain later, especially when AI, filters, placeholders, analytics, and pricing all depend on it."

**This is the right architecture solidification at the right time.** 🎯

---

**Ready to run the migration?** This is blocking placeholders and import tool, so let's fix it now!

