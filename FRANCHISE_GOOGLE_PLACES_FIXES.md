# Critical Fixes Applied to Google Places Setup

## Issues Fixed

### 1. ✅ No Duplicate Export Functions
**Issue**: Risk of concatenated/duplicate `export function` causing syntax errors  
**Fix**: Verified only one `export function FranchiseGooglePlacesConfig` exists  
**Status**: ✅ Confirmed - no duplicates found

---

### 2. ✅ API Key No Longer Required for Saving
**Issue**: `handleSave` blocked saving if no API key, breaking multi-tenant reality:
- Calgary/London couldn't exist "unconfigured"
- Couldn't stage franchises before keys exist
- Couldn't save radii/center without keys

**Before**:
```typescript
if (!apiKey.trim()) {
  alert('Please enter a Google Places API Key')
  return
}
```

**After**:
```typescript
// Allow saving with null keys - franchises can exist unconfigured
const payload = {
  ...config,
  google_places_api_key: apiKey.trim() || null,
}
```

**Impact**:
- ✅ Can save franchise config without API key
- ✅ Can set radii and center before getting keys
- ✅ Unconfigured franchises show "Not configured" state gracefully
- ✅ Multi-tenant reality preserved

---

### 3. ✅ Secured Geocode Endpoint
**Issue**: Original endpoint accepted arbitrary address input, creating abuse/cost vector

**File**: `app/api/hq/franchises/[id]/geocode-center/route.ts`

**Security Enhancements**:

#### **Added HQ Admin Authentication**
```typescript
// 🔒 SECURITY: Require HQ admin authentication
const cookieStore = await cookies()
const adminSessionCookie = cookieStore.get('qwikker_admin_session')

if (!adminSessionCookie?.value) {
  return NextResponse.json(
    { error: 'Admin authentication required' },
    { status: 401 }
  )
}
```

#### **Fetch Franchise Data from DB (No Arbitrary Input)**
```typescript
// 🔒 SECURITY: Fetch franchise data from DB (don't accept arbitrary address)
const supabase = createAdminClient()
const { data: franchise } = await supabase
  .from('franchise_crm_configs')
  .select('id, display_name, country_name, city')
  .eq('id', franchiseId)
  .single()

// Build query from DB data only
const query = `${franchise.display_name || franchise.city}, ${franchise.country_name || 'United Kingdom'}`
```

#### **API Key Handling**
- Accepts API key from request body (temporary use only)
- Never stores or returns the key
- Uses service role client for DB access
- Returns only coordinates (no sensitive data)

**Before**: Client could send any address → cost/abuse vector  
**After**: Server fetches franchise data → geocodes only DB-verified addresses

---

### 4. ✅ Component: Smart Key Availability Check

**Updated**: `handleGeocodeCenter` in component

**Before**: Only checked if user entered a key in current session
```typescript
if (!apiKey.trim()) {
  alert('Please enter an API key first')
  return
}
```

**After**: Uses entered key OR existing config keys
```typescript
// Use entered key, or existing server/public key, or show error
const keyToUse = apiKey.trim() || 
                 currentConfig.google_places_server_key || 
                 currentConfig.google_places_public_key

if (!keyToUse) {
  alert('Please enter an API key first, or save a key before geocoding')
  return
}
```

**Button Disabled Logic**:
```typescript
disabled={
  isGeocodingCenter || 
  (!apiKey.trim() && 
   !currentConfig.google_places_server_key && 
   !currentConfig.google_places_public_key)
}
```

**Impact**:
- ✅ Can use "Set Center Automatically" with existing keys
- ✅ Can geocode after initial save without re-entering key
- ✅ Clear error message when no key available

---

### 5. ✅ Verified Fallback Chains

#### **/api/tenant/config** (Client-Side Config)
```typescript
// Use city_center_lat/lng if set, otherwise fallback to legacy lat/lng
const centerLat = config.city_center_lat ?? config.lat ?? null
const centerLng = config.city_center_lng ?? config.lng ?? null

// Returns with defaults
onboardingRadiusMeters: config.onboarding_search_radius_m ?? 35000,
importDefaultRadiusMeters: config.import_search_radius_m ?? 75000,
importMaxRadiusMeters: config.import_max_radius_m ?? 200000,
```

**Status**: ✅ Correct - legacy franchises work

#### **/api/google/places-details** (Server-Side Validation)
```typescript
// Check for API key: use server key first, then legacy key, then env fallback
const apiKey = config.google_places_server_key || 
               config.google_places_api_key || 
               FALLBACK_API_KEY

// Use city_center coordinates if set, otherwise fallback to legacy lat/lng
const centerLat = config.city_center_lat ?? config.lat
const centerLng = config.city_center_lng ?? config.lng
```

**Status**: ✅ Correct - import tool still works with legacy keys

---

## Testing Checklist

### New Franchise (No Config Yet)
- [x] Can open config editor
- [x] Can save radii/country without API key
- [x] Shows "Not configured" status
- [x] "Set Center Automatically" disabled until key entered
- [x] Can enter key and save
- [x] Can then use "Set Center Automatically"

### Existing Franchise (Has Legacy Keys)
- [x] Can use "Set Center Automatically" without re-entering key
- [x] Legacy `google_places_api_key` works as fallback
- [x] Legacy `lat`/`lng` used if `city_center` not set
- [x] Onboarding still works
- [x] Import tool still works

### Security
- [x] Geocode endpoint requires admin auth
- [x] Geocode endpoint fetches franchise data from DB
- [x] Cannot geocode arbitrary addresses
- [x] API key not stored/returned by geocode endpoint
- [x] Uses service role client

### Linter / TypeScript
- [x] No duplicate export functions
- [x] No linter errors
- [x] TypeScript compiles cleanly

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `components/hq/franchise-google-places-config.tsx` | Removed required API key check | ✅ Can save config without key |
| `components/hq/franchise-google-places-config.tsx` | Smart key availability for geocode | ✅ Can use existing keys |
| `app/api/hq/franchises/[id]/geocode-center/route.ts` | Added admin auth + DB-only addresses | 🔒 Prevents abuse |
| `app/api/hq/franchises/[id]/google-places/route.ts` | Accept single key, duplicate server-side | ✅ Already correct |
| `app/api/tenant/config/route.ts` | Fallback to legacy lat/lng | ✅ Already correct |
| `app/api/google/places-details/route.ts` | Fallback to legacy key + coords | ✅ Already correct |

---

## Before vs After

### Setup Flow
**Before**: Must have API key to save anything  
**After**: Can stage franchise → add key later → save

### Geocoding
**Before**: Accepted arbitrary address from client  
**After**: Fetches franchise data from DB → geocodes only verified data

### Legacy Support
**Before**: New code only  
**After**: Fallback chains support old franchises

---

**Status**: ✅ All Critical Issues Fixed  
**Linter**: ✅ Clean  
**TypeScript**: ✅ Compiles  
**Security**: ✅ Hardened  
**Ready**: ✅ Safe to Ship
