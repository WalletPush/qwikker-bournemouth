# Import Tool Data Completeness

## What Gets Imported from Google Places API (New)

### ✅ **Essential Business Data** (imported by default)

| Field | Source | DB Column | Notes |
|-------|--------|-----------|-------|
| **Business Name** | `displayName.text` | `business_name` | Required |
| **Address** | `formattedAddress` | `address` | Full address string |
| **Phone** | `nationalPhoneNumber` | `phone` | Local format (e.g., "01202 123456") |
| **Website** | `websiteUri` | `website` | Full URL |
| **Rating** | `rating` | `rating` | e.g., 4.6 |
| **Review Count** | `userRatingCount` | `review_count` | e.g., 247 |
| **Latitude** | `location.latitude` | `latitude` | For maps & distance |
| **Longitude** | `location.longitude` | `longitude` | For maps & distance |
| **Opening Hours (Text)** | `regularOpeningHours.weekdayDescriptions` | `business_hours` | Human-readable |
| **Opening Hours (Structured)** | `regularOpeningHours.weekdayDescriptions` | `business_hours_structured` | JSON with all 7 days |
| **Google Place ID** | `id` | `google_place_id` | Unique identifier |
| **Photo Reference** | `photos[0].name` | `google_photo_name` | For server-side proxy |
| **Google Types** | `types[]` | `google_types` | Raw array from Google |

---

### 🔄 **Derived/System Fields** (set by QWIKKER)

| Field | Value | DB Column | Notes |
|-------|-------|-----------|-------|
| **System Category** | Mapped from Google types | `system_category` | Canonical enum (restaurant, cafe, bar, etc.) |
| **Display Category** | Label for system_category | `display_category` | Human-readable (e.g., "Restaurant", "Cafe/Coffee Shop") |
| **Business Type** | Same as system_category | `business_type` | Legacy field for backward compatibility |
| **City** | From admin form | `city` | Lowercase (e.g., "bournemouth") |
| **Town** | Capitalized city | `business_town` | Capitalized (e.g., "Bournemouth") |
| **Status** | `'unclaimed'` | `status` | Always unclaimed on import |
| **Visibility** | `'discover_only'` | `visibility` | Free tier (not in AI chat) |
| **Placeholder Variant** | `0` (neutral) | `placeholder_variant` | 🔒 Safety: always neutral |
| **Auto Imported** | `true` | `auto_imported` | Tracks import source |
| **User ID** | `null` | `user_id` | No owner yet |
| **Owner User ID** | `null` | `owner_user_id` | No owner yet |

---

### ❌ **What We DON'T Import** (added only when claimed)

These are **marketing fields** that should only come from verified business owners:

| Field | Why Not Imported | When It's Added |
|-------|------------------|-----------------|
| `business_tagline` | Should be business's own words | During claim process |
| `business_description` | Should be business's own words | During claim process |
| `logo_url` | Must be business's own logo | During claim process (required) |
| `hero_image_url` | Must be business's own photo | During claim process (required) |
| `images` (array) | Must be business's own photos | During claim process (required) |
| `featured_items` | Curated by owner | After claim (optional) |
| `offers` | Created by owner | After claim (optional) |
| `secret_menu` | Created by owner | After claim (optional) |

---

## Opening Hours Structure

### **If Google Provides Hours:**

We parse into this exact structure (matches DB constraint):

```json
{
  "timezone": "Europe/London",
  "last_updated": "2026-01-11T22:55:23.000Z",
  "monday":    { "open": "09:00", "close": "18:00", "closed": false },
  "tuesday":   { "open": "09:00", "close": "18:00", "closed": false },
  "wednesday": { "open": "09:00", "close": "18:00", "closed": false },
  "thursday":  { "open": "09:00", "close": "18:00", "closed": false },
  "friday":    { "open": "09:00", "close": "18:00", "closed": false },
  "saturday":  { "open": "09:00", "close": "18:00", "closed": false },
  "sunday":    { "open": "09:00", "close": "18:00", "closed": false }
}
```

**Closed days:**
```json
"monday": { "open": null, "close": null, "closed": true }
```

### **If Google Doesn't Provide Hours:**

Set both to `null`:
- `business_hours: null`
- `business_hours_structured: null`

This passes the DB constraint (nullable).

---

## Why This Approach Works

### ✅ **Populates Discover Cards Fully**
- Business name, rating, reviews, address, distance → all from Google
- Phone, website, hours → factual data from Google
- Placeholder image → neutral, category-based (never Google photo)

### ✅ **Prevents Misrepresentation**
- No marketing claims auto-imported
- Descriptions/taglines only from verified owners
- Real photos required before approval

### ✅ **Minimizes Future Admin Work**
- Most data already populated
- Admins only need to review claims, not fill in blanks
- Businesses can claim and immediately confirm/correct data

### ✅ **Complies with Google Terms**
- No caching/storing of Google photos (only photo reference)
- Factual data like phone/address is allowed
- Attribution via "View on Google Maps" link

---

## Field Masks Used

### **Preview API** (`searchNearby`)
```
id,displayName,rating,userRatingCount,types,location,businessStatus,photos
```
**Cost:** ~£0.025 per request (not per business)

### **Import API** (`Place Details`)
```
id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,rating,userRatingCount,types,location,businessStatus,regularOpeningHours,photos
```
**Cost:** ~£0.017 per business

---

## Next Steps

When business claims listing, they **must confirm/edit** all imported data:
- ✅ Name (can correct spelling/branding)
- ✅ Address (can update)
- ✅ Phone (can update)
- ✅ Website (can update)
- ✅ Hours (can update)
- 🔒 **Upload logo** (required)
- 🔒 **Upload hero image** (required)

This ensures accuracy while saving admin time! 🚀
