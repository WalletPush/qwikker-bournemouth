# Simplified Franchise Google Places Setup

## Problem Statement

The franchise Google Places configuration was too complex, requiring multiple inputs (separate public/server keys, manual coordinates, etc.) before onboarding would work. This created friction for new franchise setup.

---

## Solution: Simplified Single-Key Setup

### Goal
A new franchise can paste **ONE API key**, click save, and onboarding autocomplete works immediately on localhost with `?city=` and later on subdomains.

### Changes Implemented

---

## 1. Simplified UI Component

**File**: `components/hq/franchise-google-places-config.tsx`

### Key Changes:

#### **Single API Key Input**
- Shows ONE field: "Google Places API Key"
- On save, automatically duplicates this key into both `google_places_public_key` and `google_places_server_key`
- No need for user to understand the difference between client/server keys

#### **Auto-Geocode Center Button**
- New "Set Center Automatically" button
- Geocodes `${displayName}, ${countryName}` using Google Geocoding API
- Automatically populates `city_center_lat` and `city_center_lng`
- Falls back to legacy `lat`/`lng` if center not set

#### **Optional Advanced Settings**
- Radii fields hidden in collapsible "Advanced Settings" section
- Pre-filled with sensible defaults:
  - Onboarding: 35km (35,000m)
  - Import Default: 75km (75,000m)
  - Import Max: 200km (200,000m)
- Radius presets available: Small Town, Coastal (BCP), Metro, Large Metro

#### **Improved View Mode**
- Shows simplified status: API Key configured ✓ or ✗
- Shows center coordinates or "Auto-detected" if using legacy fallback
- Clear call-to-action for unconfigured franchises

---

## 2. New API Route: Geocode Center

**File**: `app/api/hq/franchises/[id]/geocode-center/route.ts`

### Purpose
Auto-geocode city center coordinates using Google Geocoding API.

### Request
```typescript
POST /api/hq/franchises/[id]/geocode-center

{
  query: "Bournemouth, United Kingdom",  // City name + country
  apiKey: "AIza..."                       // Google API key
}
```

### Response
```typescript
{
  ok: true,
  lat: 50.7192,
  lng: -1.8808,
  formatted_address: "Bournemouth, UK"
}
```

### Usage
Called when user clicks "Set Center Automatically" button.

---

## 3. Updated API Route: Save Configuration

**File**: `app/api/hq/franchises/[id]/google-places/route.ts`

### Key Changes:

#### **Accept Single API Key**
```typescript
// Old (required separate keys)
{
  google_places_public_key: "AIza...",
  google_places_server_key: "AIza..."
}

// New (single key, auto-duplicated)
{
  google_places_api_key: "AIza..."
  // OR still accept separate keys for backwards compatibility
}
```

#### **Server-Side Duplication**
```typescript
if (config.google_places_api_key) {
  publicKey = config.google_places_api_key
  serverKey = config.google_places_api_key
}
```

---

## 4. Fallback to Legacy Fields

### `/api/tenant/config` (Client-Side Config)

**File**: `app/api/tenant/config/route.ts`

```typescript
// Query includes legacy fields
.select(`
  city,
  google_places_public_key,
  city_center_lat,
  city_center_lng,
  lat,           // LEGACY
  lng,           // LEGACY
  ...
`)

// Use new fields first, fallback to legacy
const centerLat = config.city_center_lat ?? config.lat ?? null
const centerLng = config.city_center_lng ?? config.lng ?? null
```

**Returns**:
```typescript
{
  ok: true,
  city: "bournemouth",
  center: { lat: 50.7192, lng: -1.8808 },  // Uses fallback if needed
  onboardingRadiusMeters: 35000,            // With defaults
  meta: {
    usingLegacyCenter: true  // Debug info
  }
}
```

### `/api/google/places-details` (Server-Side Validation)

**File**: `app/api/google/places-details/route.ts`

```typescript
// Query includes legacy fields
.select('city, google_places_server_key, google_places_api_key, city_center_lat, city_center_lng, lat, lng, ...')

// Fallback chain for API key
const apiKey = 
  config.google_places_server_key ||      // New field
  config.google_places_api_key ||         // Legacy field
  FALLBACK_API_KEY                         // Env variable (dev only)

// Fallback for coordinates
const centerLat = config.city_center_lat ?? config.lat
const centerLng = config.city_center_lng ?? config.lng
```

---

## 5. Database Defaults

**File**: `supabase/migrations/20260116000000_franchise_google_places_config.sql`

Already includes sensible defaults:
```sql
ADD COLUMN IF NOT EXISTS onboarding_search_radius_m integer DEFAULT 35000,
ADD COLUMN IF NOT EXISTS import_search_radius_m integer DEFAULT 75000,
ADD COLUMN IF NOT EXISTS import_max_radius_m integer DEFAULT 200000;
```

---

## Setup Flow (For Franchise Admins)

### Before (Complex)
1. Get TWO separate API keys from Google
2. Understand difference between public vs server keys
3. Configure HTTP referrer restrictions
4. Configure IP address restrictions
5. Manually find lat/lng coordinates on latlong.net
6. Copy/paste coordinates
7. Configure 3 different radius values
8. Save configuration
9. Test onboarding

### After (Simple)
1. Get ONE API key from Google
2. Paste key in HQ admin UI
3. Click "Set Center Automatically" (optional)
4. Click "Save Configuration"
5. Done! Onboarding works immediately

---

## Usage Examples

### Localhost Development
```bash
# Option 1: Use query parameter
http://localhost:3000/onboarding?city=bournemouth

# Option 2: Set environment variable
# Add to .env.local:
DEV_DEFAULT_CITY=bournemouth

# Then access normally:
http://localhost:3000/onboarding
```

### Production
```bash
# City derived from subdomain automatically
https://bournemouth.qwikker.com/onboarding
```

---

## Backwards Compatibility

✅ **Old franchises with separate keys** - Still work  
✅ **Old franchises with legacy lat/lng** - Fallback works  
✅ **New franchises with single key** - Auto-duplicated  
✅ **Franchises without any config** - Graceful error messages

---

## File Changes Summary

### Modified Files
1. `components/hq/franchise-google-places-config.tsx` - Simplified UI
2. `app/api/hq/franchises/[id]/google-places/route.ts` - Single key handling
3. `app/api/tenant/config/route.ts` - Legacy fallback
4. `app/api/google/places-details/route.ts` - Legacy fallback

### New Files
1. `app/api/hq/franchises/[id]/geocode-center/route.ts` - Auto-geocode API

### Unchanged (Works As-Is)
- Import tool still works
- Onboarding form unchanged
- Google Places autocomplete component unchanged
- Migration already has correct defaults

---

## Testing Checklist

### New Franchise Setup
- [ ] Can save config with just ONE API key
- [ ] Click "Set Center Automatically" geocodes correctly
- [ ] Advanced settings show with defaults
- [ ] Save succeeds
- [ ] Onboarding works on localhost?city=X
- [ ] Onboarding works on production subdomain

### Legacy Franchise
- [ ] Existing keys still work
- [ ] Legacy lat/lng used if city_center not set
- [ ] Meta field shows `usingLegacyCenter: true`
- [ ] Onboarding still works
- [ ] Import tool still works

### Edge Cases
- [ ] No API key - shows "not configured" message
- [ ] No center coords - uses legacy fallback
- [ ] No legacy coords - shows "auto-detected" warning
- [ ] Invalid API key - geocode fails gracefully

---

## Benefits

✅ **Faster setup** - 1 key instead of 2+ steps  
✅ **Less confusion** - No need to understand public vs server keys  
✅ **Auto-geocode** - No manual coordinate lookup  
✅ **Smart defaults** - Radii pre-configured  
✅ **Graceful fallbacks** - Works with legacy data  
✅ **Better UX** - Collapsible advanced settings  

---

## Next Steps (Optional Enhancements)

1. **Add API key validation** - Test key before saving
2. **Show API usage stats** - Help franchises monitor costs
3. **Multi-key support** - Allow different keys for different domains
4. **Radius visualization** - Map showing coverage area
5. **Auto-detect radius** - Based on city size from census data

---

**Implementation Date**: 2026-01-16  
**Status**: ✅ Complete - Ready for Testing
