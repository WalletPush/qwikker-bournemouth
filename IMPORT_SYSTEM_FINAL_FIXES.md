# Import System Final Fixes

## Issues Fixed

### 1. ❌ **Referenced Non-Existent `business_locations` Table**
**Problem:** Import code tried to insert into a `business_locations` table that didn't exist.

**Solution:** Added lat/lng directly to `business_profiles` (simpler!)

**Migration:**
```sql
-- supabase/migrations/20260111000002_add_lat_lng_to_business_profiles.sql
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_business_profiles_location 
ON business_profiles (latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

---

### 2. ❌ **Incorrect Opening Hours Structure**
**Problem:** Import was creating a simple key-value format that didn't match the DB constraint.

**Before (wrong):**
```json
{
  "monday": "9:00 AM – 6:00 PM",
  "tuesday": "9:00 AM – 6:00 PM"
}
```

**After (correct):**
```json
{
  "timezone": "Europe/London",
  "last_updated": "2026-01-11T22:55:23.000Z",
  "monday": { "open": "09:00", "close": "18:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "18:00", "closed": false },
  "thursday": { "open": "09:00", "close": "18:00", "closed": false },
  "friday": { "open": "09:00", "close": "18:00", "closed": false },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false },
  "sunday": { "open": "09:00", "close": "18:00", "closed": false }
}
```

**Key Rules:**
- ✅ Must include ALL 7 days (monday through sunday)
- ✅ Each day has `open`, `close`, `closed` keys
- ✅ Closed days: `{ open: null, close: null, closed: true }`
- ✅ If no hours from Google: set `business_hours_structured: null`

---

## What Gets Imported Now

### ✅ **Complete Data Import**
- Business name, address, phone, website ✅
- Rating, review count ✅
- **Latitude & longitude** ✅ (NEW - for maps/distance)
- **Opening hours (text)** ✅ (NEW - human-readable)
- **Opening hours (structured)** ✅ (NEW - properly formatted JSON)
- Google Place ID, photo reference ✅
- Google types (raw array) ✅

### ✅ **System Fields**
- `system_category` (canonical enum) ✅
- `display_category` (UI label) ✅
- `placeholder_variant: 0` (neutral default) ✅
- `status: 'unclaimed'` ✅
- `visibility: 'discover_only'` ✅

---

## Result

**Discover cards now have:**
1. Complete business info (name, address, phone, website) ✅
2. Social proof (rating, reviews) ✅
3. Opening hours (text + structured) ✅
4. Distance calculation capability (lat/lng) ✅
5. Google Maps integration ready ✅

**Without:**
- ❌ Marketing claims (tagline/description)
- ❌ Owner photos (logo/hero)
- ❌ Offers or secret menu

This is the perfect balance:
- **Factual data** = imported automatically
- **Marketing data** = added only by verified owner

---

## Files Changed

1. `app/api/admin/import-businesses/import/route.ts`
   - Added `latitude`, `longitude` fields
   - Fixed opening hours structure
   - Added proper parsing logic

2. `supabase/migrations/20260111000002_add_lat_lng_to_business_profiles.sql`
   - Added lat/lng columns
   - Added location index

3. `IMPORT_DATA_COMPLETENESS.md`
   - Documented complete import strategy
   - Listed all fields and their sources
   - Explained opening hours structure

---

## Next Steps

1. ✅ Run the migration to add lat/lng columns
2. ✅ Test import with a real business
3. ✅ Verify opening hours display correctly
4. ✅ Verify "Open in Maps" link works with lat/lng
5. ✅ Verify distance calculations work

Then you're ready to import 200+ businesses! 🚀

