# Google Places API Setup Guide 🗺️

## Problem: Google Places Not Working on Onboarding Form

If you're seeing:
- "Google verification is temporarily unavailable" message
- Google Places input not showing autocomplete suggestions
- Error in console: "Google Places API key not configured"

**Root Cause:** The `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` environment variable is not set in your `.env.local` file.

---

## Solution: Set Up Google Places API Key

### Step 1: Get a Google Places API Key

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project:**
   - Click the project dropdown at the top
   - Click "New Project" or select an existing one

3. **Enable the Places API:**
   - Go to "APIs & Services" → "Library"
   - Search for "Places API"
   - Click "Places API" (the new one, not the legacy)
   - Click "Enable"
   
   **Also enable** (for full functionality):
   - "Maps JavaScript API" (for the autocomplete widget)
   - "Geocoding API" (optional, for address validation)

4. **Create an API Key:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key that appears

5. **Restrict the API Key (Recommended for Production):**
   - Click on your newly created API key
   - Under "Application restrictions":
     - For development: Choose "None" or "HTTP referrers" and add `http://localhost:3000/*`
     - For production: Choose "HTTP referrers" and add your domain (e.g., `https://bournemouth.qwikker.co.uk/*`)
   - Under "API restrictions":
     - Select "Restrict key"
     - Check:
       - ✅ Places API
       - ✅ Maps JavaScript API
       - ✅ Geocoding API (optional)
   - Click "Save"

---

### Step 2: Add API Keys to Your `.env.local` File

1. **Open `.env.local`** in the root of your project
   - If it doesn't exist, create it: `touch .env.local`

2. **Add BOTH API keys:**
   ```bash
   # Google Places API (Client-side - for autocomplete in browser)
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...your-key-here

   # Google Places API (Server-side - for secure details fetch)
   GOOGLE_PLACES_SERVER_KEY=AIza...your-key-here
   ```

   **Note:** You can use the SAME key for both, or create two separate keys:
   - **Client-side key** (`NEXT_PUBLIC_*`) = Used in the browser for autocomplete
   - **Server-side key** = Used in API routes to fetch business details securely

3. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev
   ```

---

### Step 3: Test That It's Working

1. **Go to the onboarding page:**
   - Navigate to: `http://localhost:3000/onboarding`

2. **Select "Verify with Google":**
   - Click the "Verify with Google" card
   - You should see a search input that says "Search for your business on Google"

3. **Start typing a business name:**
   - Type something like "Starbucks London"
   - You should see a dropdown with Google Places suggestions
   - If it works, you'll see real businesses from Google

4. **Check the browser console:**
   - Open DevTools (F12)
   - Go to Console tab
   - You should see: `📍 Place selected: [Business Name] [place_id]`

---

## Common Issues & Fixes

### Issue 1: "Google Places API key not configured"
**Cause:** API key not in `.env.local` or wrong variable name

**Fix:**
- Check `.env.local` has `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=...`
- Variable name must be EXACT (case-sensitive)
- Restart dev server after adding

---

### Issue 2: "Failed to load Google Places API"
**Cause:** API key is invalid, expired, or doesn't have Places API enabled

**Fix:**
- Go to Google Cloud Console
- Check that "Places API" and "Maps JavaScript API" are both ENABLED
- Check that your API key restrictions aren't blocking localhost
- Try creating a new API key

---

### Issue 3: Autocomplete dropdown not appearing
**Cause:** "Maps JavaScript API" not enabled

**Fix:**
- Go to Google Cloud Console → APIs & Services → Library
- Search for "Maps JavaScript API"
- Click "Enable"
- Restart dev server

---

### Issue 4: "This API project is not authorized to use this API"
**Cause:** API key restrictions are too strict

**Fix:**
- Go to Google Cloud Console → Credentials
- Click on your API key
- Under "Application restrictions":
  - Set to "None" for development
  - Or add `http://localhost:3000/*` to "HTTP referrers"
- Click "Save"

---

### Issue 5: Works on localhost but not production
**Cause:** API key restricted to localhost only

**Fix:**
- Go to Google Cloud Console → Credentials
- Click on your API key
- Under "Application restrictions" → "HTTP referrers"
- Add your production domain: `https://your-domain.com/*`
- Add subdomain wildcards if using multi-tenant: `https://*.qwikker.co.uk/*`
- Click "Save"

---

## Where Google Places Is Used

### 1. **Onboarding Form - Step 0 (Business Verification)**
- **File:** `components/simplified-onboarding-form.tsx`
- **Component:** `<GooglePlacesAutocomplete />`
- **Purpose:** Search for business on Google to auto-fill details
- **API Key Used:** `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

### 2. **Onboarding Form - Step 3 (Address Entry)**
- **File:** `components/simplified-onboarding-form.tsx`
- **Component:** `<GoogleAddressAutocomplete />`
- **Purpose:** Auto-fill address, town, and postcode
- **API Key Used:** `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

### 3. **Server-Side Business Details Fetch**
- **File:** `app/api/google/places-details/route.ts`
- **Purpose:** Securely fetch business details (rating, reviews, etc.)
- **API Key Used:** `GOOGLE_PLACES_SERVER_KEY`

---

## API Key Best Practices

### Development (Localhost)
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...dev-key
GOOGLE_PLACES_SERVER_KEY=AIza...dev-key

# Restriction: HTTP referrers → http://localhost:3000/*
```

### Production
```bash
# .env.production (or set in Vercel/hosting provider)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...prod-key
GOOGLE_PLACES_SERVER_KEY=AIza...prod-key

# Restriction: HTTP referrers → https://*.qwikker.co.uk/*
```

### Separate Keys (Recommended)
```bash
# Client-side key (less restrictive)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...public-key

# Server-side key (more restrictive)
GOOGLE_PLACES_SERVER_KEY=AIza...private-key
```

---

## Billing & Quotas

### Free Tier (Google Maps Platform)
- **$200 free credit per month** (automatically applied)
- **Places Autocomplete:** $2.83 per 1,000 requests
- **Place Details:** $17 per 1,000 requests

**Typical usage for QWIKKER:**
- ~10 signups/day = ~300/month
- Autocomplete: 300 requests = **$0.85/month**
- Place Details: 300 requests = **$5.10/month**
- **Total: ~$6/month** (well within free tier)

### Set Billing Alerts
1. Go to Google Cloud Console
2. Billing → Budgets & alerts
3. Set budget: $50/month
4. Set alert at 50%, 90%, 100%

---

## Environment Variables Reference

### Required for Google Places to Work:
```bash
# Client-side (browser autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIza...

# Server-side (secure details fetch)
GOOGLE_PLACES_SERVER_KEY=AIza...
```

### Optional (but recommended):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudinary (for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
```

---

## Testing Checklist

After setting up, verify these work:

### ✅ Step 0: Business Search (Google Verification)
- [ ] "Verify with Google" card visible
- [ ] Click "Verify with Google"
- [ ] Search input appears
- [ ] Type business name → suggestions appear
- [ ] Click suggestion → form auto-fills
- [ ] Console shows: `📍 Place selected: ...`

### ✅ Step 3: Address Autocomplete (Manual Listing)
- [ ] "Create Listing" card visible
- [ ] Click "Create Listing" → Continue
- [ ] Fill business name and category
- [ ] Get to Step 3 (Address)
- [ ] Type address → suggestions appear
- [ ] Click suggestion → town & postcode auto-fill
- [ ] Console shows: `📍 Address selected: ...`

---

## Need Help?

**Still not working?**
1. Check browser console for errors (F12 → Console)
2. Check Network tab for failed API requests
3. Verify API key is valid in Google Cloud Console
4. Try with a fresh API key (create new one)
5. Check that dev server was restarted after adding `.env.local`

**Common error messages and what they mean:**
- `"Google Places API key not configured"` → Variable not in `.env.local`
- `"Failed to load Google Places API"` → Network issue or invalid key
- `"This API project is not authorized"` → API not enabled or key restricted
- `"REQUEST_DENIED"` → API key restrictions blocking your domain

---

**Result:** Google Places autocomplete working on both business search (Step 0) and address entry (Step 3)! 🎉
