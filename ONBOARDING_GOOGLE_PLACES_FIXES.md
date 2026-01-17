# Onboarding Google Places Fixes - Complete

## Problem Statement

Localhost onboarding was failing with:
- `/api/tenant/config` returning 404 "No config found"
- Server logs showing `TypeError: fetch failed`
- Uncontrolled-to-controlled input warnings in React
- Google Maps "included multiple times" errors causing runtime crashes
- Scary "franchise configuration missing" messages shown to users

---

## All Fixes Applied

### 1. ✅ Fixed `/api/tenant/config` Supabase Client

**File**: `app/api/tenant/config/route.ts`

**Changes**:
```typescript
// BEFORE: Using createAdminClient()
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()

// AFTER: Using createServiceRoleClient() (same as import tool)
import { createServiceRoleClient } from '@/lib/supabase/server'
const supabase = createServiceRoleClient()
```

**Why**: `createAdminClient` was causing fetch failures. Switched to `createServiceRoleClient` which works consistently across all routes.

**Security**: Still only returns public key, never server key. All sensitive fields filtered out.

**Added**: Comment explaining Google keys are stored per-franchise in DB, only Supabase env vars required.

---

### 2. ✅ Localhost Works Without `?city=` Every Time

**File**: `lib/utils/tenant-city.ts` (Already implemented correctly)

**How it works**:
```typescript
// Step 5: Fallback host - optional environment variable default
if (fallback) {
  const envCity = process.env.DEV_DEFAULT_CITY || ''
  if (envCity) {
    console.log(`[Tenant City] Using DEV_DEFAULT_CITY: ${envCity}`)
    return { ok: true, city: envCity, source: 'env', ... }
  }
}
```

**Usage**:
```bash
# Add to .env.local
DEV_DEFAULT_CITY=bournemouth

# Then just:
http://localhost:3000/onboarding
# Works! No ?city= needed
```

**Security**: Only works on fallback hosts (localhost, vercel preview). Real subdomains still derive city from hostname only.

---

### 3. ✅ Clean UX Messaging (No "Franchise Config Missing")

**File**: `components/ui/google-places-autocomplete-v2.tsx`

**BEFORE** (scary):
```typescript
setError(config.message || 'Google Places not configured')
// User sees: "No franchise configuration found for city: bournemouth"
```

**AFTER** (friendly):
```typescript
setError('unavailable')
// User sees: "Google search is temporarily unavailable. 
//             Please continue with 'Create Listing' below."
```

**Changes**:
- No mention of "franchise", "config", "API key", or "city"
- Blue info box (not red error box)
- Friendly copy suggesting manual entry
- Technical details only in dev console

---

### 4. ✅ Fixed Uncontrolled → Controlled Input Warning

**File**: `components/ui/google-address-autocomplete.tsx`

**BEFORE**:
```typescript
value={value}
// Warning: value could be undefined
```

**AFTER**:
```typescript
value={value ?? ''}
// Always a string, never undefined
```

**Impact**: React warning disappears. Input always controlled.

---

### 5. ✅ Singleton Google Maps Loader (Prevents "Included Multiple Times")

**New File**: `lib/google/loadGoogleMaps.ts`

**Problem**: Both `GooglePlacesAutocompleteV2` and `GoogleAddressAutocomplete` were loading the Google Maps script, causing:
- "You have included the Google Maps JavaScript API multiple times"
- Runtime errors: `undefined is not an object (evaluating 'a.oJ')`
- Crashes in Google's internal singleton state

**Solution**: Singleton loader ensures script loads only once

```typescript
export function loadGoogleMaps(apiKey: string): Promise<void> {
  // Already loaded? Done
  if (window.google?.maps?.places) return Promise.resolve()

  // Already loading? Reuse same promise
  if (window.__qwikkerGoogleMapsPromise) return window.__qwikkerGoogleMapsPromise

  // Start loading (creates singleton promise)
  window.__qwikkerGoogleMapsPromise = new Promise((resolve, reject) => {
    // Check for existing script tag first
    const existing = document.getElementById('qwikker-google-maps')
    if (existing) {
      // Wait for it instead of creating new one
      existing.addEventListener('load', () => resolve())
      return
    }

    // Create script tag with unique ID
    const script = document.createElement('script')
    script.id = 'qwikker-google-maps'
    script.src = `...`
    document.head.appendChild(script)
  })

  return window.__qwikkerGoogleMapsPromise
}
```

**Benefits**:
- ✅ **One script tag** regardless of how many components use it
- ✅ **Safe for React Strict Mode** (won't load twice)
- ✅ **Safe for route transitions**
- ✅ **No duplicate script errors**
- ✅ **No runtime crashes**

**Updated Components**:
- `components/ui/google-places-autocomplete-v2.tsx` - now uses singleton loader
- `components/ui/google-address-autocomplete.tsx` - now uses singleton loader

---

### 6. ✅ Dev-Only Sanity Logging

**File**: `app/api/tenant/config/route.ts`

**Added**:
```typescript
if (isDev) {
  console.debug(`[Tenant Config] city=${city} source=${cityRes.source} fallback=${cityRes.fallback}`)
}
```

**Output Example**:
```
[Tenant Config] city=bournemouth source=env fallback=true
```

**Never logs**: API keys or sensitive data

---

## Testing Checklist

### ✅ Localhost (Without `?city=`)
```bash
# Add to .env.local
DEV_DEFAULT_CITY=bournemouth

# Navigate to:
http://localhost:3000/onboarding

# Expected:
✅ Google Places loads
✅ Autocomplete works
✅ No console warnings
✅ No "included multiple times" error
✅ No uncontrolled input warning
```

### ✅ Localhost (With `?city=`)
```bash
http://localhost:3000/onboarding?city=bournemouth

# Expected:
✅ Works (query override takes precedence over env var)
✅ Console shows: city=bournemouth source=query fallback=true
```

### ✅ Vercel Preview
```bash
https://qwikkerdashboard-theta.vercel.app/onboarding?city=bournemouth

# Expected:
✅ Query override allowed (fallback host)
✅ Google Places works
✅ No duplicate script errors
```

### ✅ Production Subdomain
```bash
https://bournemouth.qwikker.com/onboarding

# Expected:
✅ City from hostname (bournemouth)
✅ Query override rejected (403) if attempted
✅ Google Places works
✅ No duplicate script errors
```

### ✅ Google Places Unavailable
```bash
# Scenario: API key not configured or service down

# Expected UI:
📘 Google search is temporarily unavailable.
   Please continue with "Create Listing" below.

# NO scary messages like:
❌ "No franchise configuration found"
❌ "Google Places API key not configured"
❌ "No config found for city: bournemouth"
```

---

## File Changes Summary

### Modified Files
1. ✅ `app/api/tenant/config/route.ts` - Fixed client, added note, clean logging
2. ✅ `components/ui/google-places-autocomplete-v2.tsx` - Singleton loader, clean UX
3. ✅ `components/ui/google-address-autocomplete.tsx` - Singleton loader, fixed input warning

### New Files
1. ✅ `lib/google/loadGoogleMaps.ts` - Singleton Google Maps loader

### Already Correct
- ✅ `lib/utils/tenant-city.ts` - DEV_DEFAULT_CITY already implemented
- ✅ Multi-tenant security preserved
- ✅ Import tool unchanged (still works)

---

## Developer Setup

### Required: `.env.local`
```bash
# Add this to make localhost "just work":
DEV_DEFAULT_CITY=bournemouth

# That's it! No ?city= needed anymore.
```

### Verification
```bash
# 1. Start dev server
pnpm dev

# 2. Open browser
http://localhost:3000/onboarding

# 3. Check console
[Tenant Config] city=bournemouth source=env fallback=true
[GooglePlaces] Google Maps API loaded successfully

# 4. Open DevTools → Elements
# Search for: id="qwikker-google-maps"
# Should see: ONE script tag

# 5. No warnings:
✅ No "included multiple times"
✅ No uncontrolled input warning
✅ No fetch errors
```

---

## Benefits

### For Users
✅ **No scary error messages** - friendly fallback guidance only  
✅ **Faster page loads** - single script load  
✅ **No crashes** - singleton prevents duplicate script issues  
✅ **Works on manual entry** - graceful degradation if Google unavailable

### For Developers
✅ **Works on localhost without `?city=`** - DEV_DEFAULT_CITY convenience  
✅ **No console warnings** - clean dev experience  
✅ **Clear debug logs** - easy troubleshooting  
✅ **Safe for Strict Mode** - React development mode compatible

### For Security
✅ **Multi-tenant safe** - no implicit defaults on production  
✅ **Query override blocked** - on real subdomains (403)  
✅ **Server-derived city** - hostname authority preserved  
✅ **No key leaks** - API keys never returned to client

---

## Root Cause Analysis

### Issue 1: `/api/tenant/config` 404
**Root Cause**: Using `createAdminClient()` which had fetch failures  
**Fix**: Switched to `createServiceRoleClient()` (same as import tool)  
**Status**: ✅ Resolved

### Issue 2: "Included Multiple Times"
**Root Cause**: Both autocomplete components loading Google Maps independently  
**Fix**: Singleton loader with script tag ID check  
**Status**: ✅ Resolved

### Issue 3: Uncontrolled Input Warning
**Root Cause**: `value={value}` where value could be undefined  
**Fix**: `value={value ?? ''}` ensures always string  
**Status**: ✅ Resolved

### Issue 4: Scary Error Messages
**Root Cause**: Exposing technical errors to end users  
**Fix**: Generic "temporarily unavailable" message, details in dev console only  
**Status**: ✅ Resolved

### Issue 5: Localhost Requires `?city=`
**Root Cause**: No default city in dev environment  
**Fix**: DEV_DEFAULT_CITY env var (already implemented, just needed docs)  
**Status**: ✅ Resolved

---

**Status**: ✅ All Issues Fixed  
**Linter**: ✅ Clean  
**Multi-Tenant**: ✅ Safe  
**UX**: ✅ Premium  
**Ready**: ✅ Ship It! 🚀
