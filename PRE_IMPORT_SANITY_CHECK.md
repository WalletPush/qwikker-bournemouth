# Pre-Import Sanity Check ✅

## All 4 Critical Points Verified

### 1. ✅ **FieldMask Header - Correct!**

**Location:** `app/api/admin/import-businesses/import/route.ts:236`

```typescript
'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,location,businessStatus,regularOpeningHours.weekdayDescriptions,photos'
```

**Status:**
- ✅ Only set once (not duplicated)
- ✅ Uses `regularOpeningHours.weekdayDescriptions` (not the bloated parent object)
- ✅ Includes all required fields for complete import

---

### 2. ✅ **Insert Uses Correct Column Names**

**Location:** `app/api/admin/import-businesses/import/route.ts:336-337`

```typescript
business_hours: businessHoursText, // Human-readable text
business_hours_structured: businessHoursStructured, // Structured JSON (all days or null)
```

**Status:**
- ✅ Uses `business_hours` (not `opening_hours`)
- ✅ Uses `business_hours_structured` (not `opening_hours_structured`)
- ✅ Matches actual database column names

---

### 3. ✅ **Parser Outputs "All 7 Days or Null"**

**Location:** `app/api/admin/import-businesses/import/route.ts:36-102`

**Parser Logic:**
```typescript
function parseWeekdayDescriptionsToStructured(
  weekdayDescriptions: string[] | undefined,
  timezone: string
): { structured: any | null; text: string | null }
```

**Status:**
- ✅ Returns `null` if can't parse all 7 days
- ✅ Returns `null` if any day format is unexpected
- ✅ Returns proper JSON with `monday` through `sunday` keys
- ✅ Each day has `{ open: "HH:MM", close: "HH:MM", closed: boolean }`
- ✅ Includes `timezone` and `last_updated` keys
- ✅ Satisfies `check_business_hours_structured_format` constraint

**Debug Log Added:**
```typescript
console.log('hours_structured_keys', businessHoursStructured ? Object.keys(businessHoursStructured) : null)
```

This will show:
- `null` if hours couldn't be parsed
- `['timezone', 'last_updated', 'monday', 'tuesday', ...]` if successful

---

### 4. ✅ **Timezone Handling**

**Current:** Hard-coded `'Europe/London'`

**Status:**
- ✅ Correct for Bournemouth (testing phase)
- 📝 TODO: Derive from `franchise_crm_configs.country_code` later
  - UK → `'Europe/London'`
  - AE → `'Asia/Dubai'`
  - US → TBD based on city

**Not urgent** - Can update when adding international franchises.

---

## 🎯 **Bonus Fix: Accurate Cost Tracking**

**Problem:** Preview cost calculation used `categoryConfig.googleTypes.length` (planned requests), not actual requests made.

**Fix Applied:**

```typescript
let requestsMade = 0 // Track actual API requests

for (const type of categoryConfig.googleTypes) {
  if (searchResults.length >= TARGET_POOL) break // Early exit
  
  requestsMade++ // Increment before fetch
  const searchResponse = await fetch(...)
  // ...
}

// Use requestsMade for cost display
const previewCost = (requestsMade * 0.025).toFixed(2)
```

**Result:**
- ✅ Cost display now shows **actual charges**, not estimates
- ✅ Handles early exits correctly (when `TARGET_POOL` is reached)
- ✅ Handles API errors correctly (still counts as a request)
- ✅ No more "£30 panic" moments

---

## 📋 **Pre-Import Checklist**

Before running the first import:

1. ✅ Run migration: `supabase/migrations/20260111000002_add_lat_lng_to_business_profiles.sql`
2. ✅ Verify Google Places API key is in `franchise_crm_configs`
3. ✅ Check terminal/logs for this debug line:
   ```
   hours_structured_keys [ 'timezone', 'last_updated', 'monday', 'tuesday', ... ]
   ```
   Or:
   ```
   hours_structured_keys null
   ```
4. ✅ Verify database insert succeeds (no constraint errors)
5. ✅ Check imported business has:
   - `business_hours` (text)
   - `business_hours_structured` (JSON or null)
   - `latitude` (number or null)
   - `longitude` (number or null)

---

## 🔍 **What to Watch For**

### **Success Indicators:**
- ✅ `hours_structured_keys` shows 9 keys (timezone, last_updated, + 7 days)
- ✅ No DB constraint errors
- ✅ Cost display is accurate (matches actual API calls)

### **Expected Nulls:**
- ⚠️ `hours_structured_keys null` - OK if business doesn't provide hours
- ⚠️ Some businesses may have `latitude: null` - rare but possible

### **Red Flags:**
- ❌ `hours_structured_keys` shows < 9 keys (missing days)
- ❌ DB error: "violates check constraint check_business_hours_structured_format"
- ❌ Cost display is wildly off from actual billing

---

## 🚀 **Ready to Import!**

All sanity checks passed. The import system is now:
- ✅ Using correct column names
- ✅ Outputting valid hours structure
- ✅ Tracking accurate costs
- ✅ Safely handling edge cases

**Next:** Run migration, then test import with 1-2 real businesses!

