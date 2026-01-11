# ✅ Geocoding Optimization - Production-Ready Implementation

**Status:** Code complete, ready for testing  
**Date:** January 11, 2026

---

## 🎯 **What Was Fixed**

Based on real-world gotchas, implemented the following hardening:

### 1️⃣ **Numeric Casting & Validation**
**Problem:** Supabase NUMERIC columns return as strings → Google API rejects silently

**Solution:**
```typescript
const latNum = typeof lat === 'string' ? parseFloat(lat) : lat
const lngNum = typeof lng === 'string' ? parseFloat(lng) : lng

// Validate finite
if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
  throw new Error(`Invalid coords: ${lat}, ${lng}`)
}

// Validate range
if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
  throw new Error(`Coordinates out of valid range`)
}
```

**Prevents:** Silent failures when database returns `"50.7192"` instead of `50.7192`

---

### 2️⃣ **Removed Approximate Seeding**
**Problem:** Seeding approx coords prevents precise geocoding from ever running

**Before:**
```sql
UPDATE franchise_crm_configs
SET lat = 50.7192, lng = -1.8808  -- Approximate
WHERE city = 'bournemouth';
```

**After:**
```sql
-- Leave NULL, geocode precisely on first use
-- Ensures city center is exact, not "close enough"
```

**Result:** First import geocodes to **exact** city center using Google's Geocoding API

---

### 3️⃣ **Radius Clamping**
**Problem:** Google Places API has practical limits (too small = no results, too large = inaccurate)

**Solution:**
```typescript
const radiusMeters = Math.max(500, Math.min(radius, 50000))
// Min: 500m, Max: 50km
```

**Prevents:**
- Empty searches from 100m radius
- Inaccurate results from 200km radius
- API errors from invalid values

---

### 4️⃣ **Better Error Messages**
**Before:**
```
error: 'Google Places API key not configured for this franchise.'
```

**After:**
```
error: 'Google Places API key not configured for bournemouth. 
        Please add it in Admin > Franchise Setup before importing businesses.'
```

**Includes:** Clear city name + actionable next step

---

## 📂 **Files Changed**

### 1. **Database Migration** ✅
**File:** `supabase/migrations/20260111000000_add_geocode_to_franchise_configs.sql`

**Changes:**
- Added `lat NUMERIC(10, 7)` and `lng NUMERIC(10, 7)` columns
- Added index on (lat, lng)
- **Removed** approximate coordinate seeding
- Columns default to NULL (precise geocoding on first use)

---

### 2. **Preview API Route** ✅
**File:** `app/api/admin/import-businesses/preview/route.ts`

**Changes:**
- Fetch `lat`, `lng` from franchise config
- If NULL → geocode once → cache
- **Numeric casting** for lat/lng (handles Supabase string returns)
- **Coordinate validation** (finite, in range)
- **Radius clamping** (500m - 50km)
- Use `latNum`/`lngNum`/`radiusMeters` in all calculations
- Better error messages

**Lines changed:**
- 70: SELECT includes `lat, lng, display_name`
- 74-82: Better error handling for missing config/API key
- 94-160: Geocoding + caching logic with validation
- 161-177: Numeric casting & radius clamping
- 184-214: Use validated numeric values in Places API request
- 247-258: Use validated values in distance calculations
- 269, 301: Use validated values in response formatting

---

### 3. **Documentation** ✅
**Files:**
- `GEOCODING_OPTIMIZATION.md` - Technical implementation details
- `IMPORT_TOOL_PREFLIGHT_CHECKLIST.md` - Step-by-step setup guide

---

## ✅ **What's Ready**

**Code:**
- [x] Migration created
- [x] Preview API hardened with real-world fixes
- [x] Import API verified (no changes needed)
- [x] Numeric casting implemented
- [x] Radius clamping implemented
- [x] Error messages improved
- [x] No linter errors

**Documentation:**
- [x] Technical docs updated
- [x] Pre-flight checklist created
- [x] Common issues documented
- [x] Cost estimates provided

---

## ⏳ **What's Pending (User Actions)**

**Required before import tool works:**

1. **Google Cloud Setup** ⏳
   - [ ] Enable billing
   - [ ] Enable Places API (New) + Geocoding API
   - [ ] Create & restrict API key
   - [ ] Set billing alerts

2. **Supabase Setup** ⏳
   - [ ] Run migration
   - [ ] Add API key to `franchise_crm_configs`

3. **Testing** ⏳
   - [ ] First preview (geocodes + caches)
   - [ ] Second preview (uses cache)
   - [ ] Import 1 test business

**See:** `IMPORT_TOOL_PREFLIGHT_CHECKLIST.md` for detailed steps

---

## 🔍 **How to Verify It Works**

### **Test 1: First Preview (Geocoding)**
```
Expected console logs:
📍 No cached coordinates for bournemouth, geocoding "Bournemouth, UK"...
💾 Caching coordinates for bournemouth: 50.7192, -1.8808
✅ Coordinates cached - future searches will skip geocoding
📍 Search center: 50.7192, -1.8808 | Radius: 4828m
```

### **Test 2: Second Preview (Cache Hit)**
```
Expected console logs:
✅ Using cached coordinates for bournemouth: 50.7192, -1.8808
📍 Search center: 50.7192, -1.8808 | Radius: 4828m
```

### **Test 3: Database Check**
```sql
SELECT city, lat, lng FROM franchise_crm_configs;
```

**After first import:**
```
city         | lat       | lng
-------------|-----------|----------
bournemouth  | 50.7192   | -1.8808
```

---

## 💰 **Cost Impact**

### **Before Optimization**
- Geocoding: 2 calls per import session
- Annual (100 imports): 200 geocoding calls = £1

### **After Optimization**
- Geocoding: **1 call per franchise (lifetime)**
- Annual (100 imports): **1 geocoding call = £0.005**

**Savings:** £1/year (negligible cost, but eliminates latency/reliability risk)

---

## 🚀 **Next Steps**

1. **Read:** `IMPORT_TOOL_PREFLIGHT_CHECKLIST.md`
2. **Complete:** Google Cloud setup (billing + APIs)
3. **Run:** Migration in Supabase
4. **Add:** Google Places API key to database
5. **Test:** Preview with 10 results
6. **Import:** 1 test business
7. **Verify:** Business appears in admin dashboard

---

## 🎓 **Technical Notes**

### **Why No Seeding?**
- Seeded coords prevent precise geocoding
- Google's geocoding is more accurate than manual coordinates
- First import is only ~200ms slower (negligible)
- Subsequent imports benefit from cache

### **Why Clamp Radius?**
- < 500m: Often returns 0 results (too specific)
- > 50km: Google's accuracy degrades (too broad)
- Sweet spot: 1-10km for local discovery

### **Why Cast to Number?**
- Supabase client library behavior varies
- Some configs return NUMERIC as string
- Google API expects actual numbers
- Defensive coding prevents silent failures

---

**Implementation complete. Ready for user testing! 🎉**

