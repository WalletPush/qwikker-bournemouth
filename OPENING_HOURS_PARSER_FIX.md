# Opening Hours Parser - Final Fix

## ✅ All 3 Gotchas Fixed

### 1. ✅ **Correct Column Names**
**Before (WRONG):**
```typescript
opening_hours: openingHours
```

**After (CORRECT):**
```typescript
business_hours: businessHoursText,
business_hours_structured: businessHoursStructured
```

---

### 2. ✅ **Exact Schema Match**
**DB Constraint Requires:**
- NULL **OR**
- JSON with keys: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
- Each day: `{ open: "HH:MM", close: "HH:MM", closed: boolean }`

**Parser Now Outputs:**
```json
{
  "timezone": "Europe/London",
  "last_updated": "2026-01-11T23:15:00.000Z",
  "monday": { "open": "09:00", "close": "18:00", "closed": false },
  "tuesday": { "open": "09:00", "close": "18:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "18:00", "closed": false },
  "thursday": { "open": "09:00", "close": "18:00", "closed": false },
  "friday": { "open": "09:00", "close": "18:00", "closed": false },
  "saturday": { "open": "09:00", "close": "18:00", "closed": false },
  "sunday": { "open": null, "close": null, "closed": true }
}
```

**Closed Days:**
```json
"sunday": { "open": null, "close": null, "closed": true }
```

---

### 3. ✅ **Never Write Partial Hours**
**Safe Fallback Logic:**
- If Google gives weird/incomplete hours → `null`
- If can't parse all 7 days → `null`
- If any day format is unexpected → `null`

**This ensures:**
- ✅ Always passes DB constraint
- ✅ Never creates invalid data
- ✅ Gracefully handles edge cases

---

## Parser Functions Added

### `parseWeekdayDescriptionsToStructured()`
- Takes Google's `regularOpeningHours.weekdayDescriptions` array
- Returns `{ structured: JSON | null, text: string | null }`
- Conservative: bails to `null` if anything looks weird

**Input (Google):**
```javascript
[
  "Monday: 9:00 AM – 6:00 PM",
  "Tuesday: 9:00 AM – 6:00 PM",
  "Wednesday: Closed",
  // ... etc
]
```

**Output (QWIKKER):**
```javascript
{
  structured: { /* proper JSON */ },
  text: "Monday: 9:00 AM – 6:00 PM\nTuesday: 9:00 AM – 6:00 PM..."
}
```

---

### `normalizeTo24h()`
Converts Google's time formats to 24-hour `HH:MM`:
- "9:00 AM" → "09:00"
- "6:00 PM" → "18:00"
- "09:00" → "09:00" (already 24h)
- Invalid → `null`

---

## FieldMask Updated

**Before:**
```
'X-Goog-FieldMask': '...regularOpeningHours,photos'
```

**After:**
```
'X-Goog-FieldMask': '...regularOpeningHours.weekdayDescriptions,photos'
```

**Why:** Without `.weekdayDescriptions`, Google returns the full `regularOpeningHours` object but might not include the array we need.

---

## Edge Cases Handled

| Scenario | Parser Behavior | DB Value |
|----------|----------------|----------|
| Google gives all 7 days | ✅ Parse to structured JSON | `{ monday: {...}, ... }` |
| Google gives < 7 days | ⚠️ Return null | `null` |
| Day says "Closed" | ✅ Parse as closed | `{ open: null, close: null, closed: true }` |
| Time format is weird | ⚠️ Return null | `null` |
| "Open 24 hours" | ⚠️ Return null | `null` |
| Multiple intervals per day | ⚠️ Return null | `null` |
| No hours from Google | ⚠️ Return null | `null` |

**All edge cases satisfy the DB constraint!**

---

## What Gets Inserted

**Database Insert:**
```typescript
{
  business_name: place.displayName?.text || 'Unknown',
  address: place.formattedAddress || '',
  phone: place.nationalPhoneNumber || null,
  website: place.websiteUri || null,
  rating: place.rating || null,
  review_count: place.userRatingCount || null,
  latitude: place.location?.latitude || null,
  longitude: place.location?.longitude || null,
  business_hours: businessHoursText,              // ✅ Human-readable
  business_hours_structured: businessHoursStructured, // ✅ Proper JSON or null
  google_place_id: placeId,
  google_photo_name: place.photos?.[0]?.name || null,
  system_category: systemCategory,
  display_category: displayCategory,
  google_types: googleTypes,
  placeholder_variant: 0,
  status: 'unclaimed',
  visibility: 'discover_only',
  auto_imported: true,
  user_id: null,
  owner_user_id: null
}
```

---

## Testing Checklist

✅ **Test Cases:**
1. Import business with standard hours (Mon-Sun)
2. Import business with some closed days
3. Import business with no hours from Google
4. Verify `business_hours` (text) displays correctly
5. Verify `business_hours_structured` (JSON) is valid
6. Verify no DB constraint errors

---

## Files Changed

1. `app/api/admin/import-businesses/import/route.ts`
   - Added `parseWeekdayDescriptionsToStructured()` function
   - Added `normalizeTo24h()` function
   - Updated FieldMask to include `regularOpeningHours.weekdayDescriptions`
   - Fixed insert to use `business_hours` and `business_hours_structured`

---

## Result

✅ **Now correctly imports opening hours:**
- Matches DB constraint exactly
- Handles all edge cases safely
- Never creates partial/invalid data
- Human-readable text + structured JSON
- All 7 days or `null` (no partial weeks)

**Ready to import 200+ businesses!** 🚀

