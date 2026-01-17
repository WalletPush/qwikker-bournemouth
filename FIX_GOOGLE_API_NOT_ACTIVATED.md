# Fix: Google Maps API Not Activated Error

## Error
```
Google Maps JavaScript API error: ApiNotActivatedMapError
https://developers.google.com/maps/documentation/javascript/error-messages#api-not-activated-map-error
```

---

## What This Means

Your API key is valid, but the **required Google Cloud APIs are not enabled** in your Google Cloud project.

This is a Google Cloud Console configuration issue, NOT a code issue.

---

## Quick Fix (5 minutes)

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Select your project (the one with your API key)

### Step 2: Enable Required APIs

You need to enable **THREE** APIs:

#### 1. Maps JavaScript API
https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

- Click "Enable"
- Wait 30 seconds

#### 2. Places API (New)
https://console.cloud.google.com/apis/library/places-backend.googleapis.com

- Click "Enable"
- Wait 30 seconds

#### 3. Geocoding API (for server-side validation)
https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com

- Click "Enable"
- Wait 30 seconds

---

## Alternative: Enable All at Once

### Option A: Use `gcloud` CLI (fastest)

```bash
# Authenticate
gcloud auth login

# Set project (replace YOUR_PROJECT_ID)
gcloud config set project YOUR_PROJECT_ID

# Enable all three APIs
gcloud services enable \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  geocoding-backend.googleapis.com

# Done!
```

### Option B: Use Google Cloud Console UI

1. Go to: https://console.cloud.google.com/apis/library
2. Search for: "Maps JavaScript API" → Enable
3. Search for: "Places API" → Enable
4. Search for: "Geocoding API" → Enable

---

## Verify APIs are Enabled

```bash
# List enabled APIs
gcloud services list --enabled | grep -E "maps|places|geocoding"

# Expected output:
# maps-backend.googleapis.com          Maps JavaScript API
# places-backend.googleapis.com        Places API
# geocoding-backend.googleapis.com     Geocoding API
```

---

## After Enabling APIs

### 1. Wait 1-2 Minutes
Google needs to propagate the changes.

### 2. Hard Refresh Your Browser
```
Mac: Cmd + Shift + R
Windows/Linux: Ctrl + Shift + R
```

### 3. Check Your API Key

Go to: https://console.cloud.google.com/apis/credentials

Click on your API key and verify:

**Application restrictions**:
- HTTP referrers (recommended)
- Add your domains:
  - `localhost:*`
  - `*.vercel.app/*`
  - `*.qwikker.com/*`

**API restrictions**:
- ✅ Restrict key
- ✅ Select these APIs:
  - Maps JavaScript API
  - Places API
  - Geocoding API

---

## Common Issues

### Issue: "API key not valid"
**Problem**: Wrong API key in database  
**Fix**: Check `franchise_crm_configs.google_places_public_key` matches the key in Google Console

### Issue: "RefererNotAllowedMapError"
**Problem**: Domain not in HTTP referrer restrictions  
**Fix**: Add your domain to API key restrictions in Google Console

### Issue: "QuotaExceededError"
**Problem**: Free tier limits exceeded  
**Fix**: Enable billing or wait for quota reset

### Issue: Still not working after enabling
**Problem**: Browser cache or API propagation delay  
**Fix**: 
1. Wait 2 minutes
2. Hard refresh (Cmd+Shift+R)
3. Clear browser cache
4. Restart dev server

---

## Pricing (as of 2024)

### Free Tier (Monthly)
- **Maps JavaScript API**: 28,000 loads FREE
- **Places API**: $0.032 per request (no free tier)
- **Geocoding API**: 40,000 requests FREE

### Cost Per Request
- **Maps JS Load**: $7 per 1,000 loads (after free tier)
- **Places Autocomplete**: $2.83 per 1,000 requests
- **Places Details**: $17 per 1,000 requests
- **Geocoding**: $5 per 1,000 requests (after free tier)

### Budget Alert Recommendation
Set a budget alert in Google Cloud Console:
```
Recommended: $50/month alert
Absolute max: $200/month
```

---

## Verify It's Working

### 1. Open Browser Console
```javascript
// Check if Google Maps loaded
console.log(window.google?.maps?.version)
// Should show: "3.xx"

// Check Places API
console.log(!!window.google?.maps?.places)
// Should show: true
```

### 2. Check Network Tab
- Look for: `maps.googleapis.com/maps/api/js?key=...`
- Status should be: `200 OK`
- No red errors

### 3. Test Autocomplete
1. Go to: `http://localhost:3000/onboarding`
2. Click on: "Search for your business on Google"
3. Type: "coffee"
4. Should see: Dropdown with suggestions

---

## Quick Debug Script

Run this in your browser console while on the onboarding page:

```javascript
// Google Maps API Diagnostic
(function() {
  console.log('=== Google Maps API Diagnostic ===')
  
  // Check if loaded
  console.log('Loaded:', !!window.google?.maps)
  console.log('Version:', window.google?.maps?.version)
  console.log('Places:', !!window.google?.maps?.places)
  
  // Check script tag
  const script = document.getElementById('qwikker-google-maps')
  console.log('Script tag exists:', !!script)
  console.log('Script src:', script?.src)
  
  // Check for errors
  const errors = []
  const originalConsoleError = console.error
  console.error = function(...args) {
    if (args[0]?.toString().includes('Google')) {
      errors.push(args)
    }
    originalConsoleError.apply(console, args)
  }
  
  setTimeout(() => {
    console.log('Errors:', errors.length ? errors : 'None')
  }, 2000)
})()
```

---

## Still Not Working?

### 1. Check Database Config
```sql
SELECT 
  city,
  google_places_public_key,
  google_places_country,
  city_center_lat,
  city_center_lng
FROM franchise_crm_configs
WHERE city = 'bournemouth';
```

Expected:
- `google_places_public_key`: Should start with `AIza...`
- `city_center_lat`: Should be around `50.7192`
- `city_center_lng`: Should be around `-1.8808`

### 2. Check API Endpoint
```bash
# Test tenant config endpoint
curl http://localhost:3000/api/tenant/config?city=bournemouth

# Expected response:
{
  "ok": true,
  "city": "bournemouth",
  "googlePlacesPublicKey": "AIza...",
  "country": "gb",
  "center": { "lat": 50.7192, "lng": -1.8808 },
  "onboardingRadiusMeters": 35000
}
```

### 3. Check Dev Console Logs
```
[Tenant Config] city=bournemouth source=env fallback=true
[GooglePlaces] Google Maps API loaded successfully
[GooglePlaces] Services initialized
```

If you see these logs but still get API errors, it's definitely a Google Cloud Console API enablement issue.

---

## Summary

**Problem**: API key is valid but required APIs not enabled  
**Solution**: Enable Maps JavaScript API, Places API, and Geocoding API in Google Cloud Console  
**Time**: 5 minutes  
**Cost**: Free tier should cover development

---

## Links

- **Google Cloud Console**: https://console.cloud.google.com/
- **API Library**: https://console.cloud.google.com/apis/library
- **Credentials**: https://console.cloud.google.com/apis/credentials
- **Billing**: https://console.cloud.google.com/billing
- **Quota**: https://console.cloud.google.com/apis/api/maps-backend.googleapis.com/quotas

---

**TL;DR**: Go to Google Cloud Console → APIs & Services → Library → Enable "Maps JavaScript API", "Places API", and "Geocoding API". Wait 2 minutes. Hard refresh browser. Done! ✅
