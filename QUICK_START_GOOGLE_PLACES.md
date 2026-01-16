# Quick Start: Google Places Multi-Tenant Setup

## 🚀 Immediate Next Steps (5 minutes)

### 1. Run the Migration

```bash
# Connect to your Supabase database
psql -h db.xxx.supabase.co -U postgres -d postgres

# Run migration
\i supabase/migrations/20260116000000_franchise_google_places_config.sql

# Verify columns added
\d franchise_crm_configs
```

**Expected output:** New columns visible (google_places_public_key, city_center_lat, etc.)

---

### 2. Test Locally

```bash
# Start dev server
pnpm dev

# Open browser
http://localhost:3000/onboarding?city=bournemouth
```

**What you'll see:**
- ⚠️ "Google Places not configured" message
- This is CORRECT - keys aren't set yet

---

### 3. Get Google API Keys (One-Time Setup)

#### **Option A: Quick Test (Use Existing Global Key)**

If you already have `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` in `.env.local`:

```sql
-- Update Bournemouth franchise with your dev key
UPDATE franchise_crm_configs
SET 
  google_places_public_key = 'AIza...your-key-here',
  google_places_server_key = 'AIza...your-key-here',
  city_center_lat = 50.7192,
  city_center_lng = -1.8808,
  onboarding_search_radius_m = 35000,
  import_search_radius_m = 75000,
  import_max_radius_m = 200000
WHERE city = 'bournemouth';
```

**Now test again:**
```
http://localhost:3000/onboarding?city=bournemouth
```

✅ You should see: `City: bournemouth | Radius: 35km | Key: yes`

---

#### **Option B: Production Setup (Per-Franchise Keys)**

1. **Create Google Cloud Project:**
   - Go to: https://console.cloud.google.com/
   - Click "New Project" → Name it "QWIKKER Bournemouth"
   - Enable APIs: "Places API" and "Maps JavaScript API"

2. **Create TWO API keys:**

   **Key 1: Public (Client-Side)**
   - Create Credentials → API Key
   - Restrict: HTTP referrers
   - Add: `http://localhost:3000/*`, `https://bournemouth.qwikker.co.uk/*`
   - Copy key

   **Key 2: Server (Server-Side)**
   - Create Credentials → API Key  
   - Restrict: IP addresses
   - Add your server IPs
   - Copy key

3. **Update franchise config in database:**
   ```sql
   UPDATE franchise_crm_configs
   SET 
     google_places_public_key = 'AIza...public-key',
     google_places_server_key = 'AIza...server-key'
   WHERE city = 'bournemouth';
   ```

---

### 4. Test Onboarding Flow

```
http://localhost:3000/onboarding?city=bournemouth
```

**Test Steps:**
1. Click "Verify with Google"
2. Type: "costa coffee" → See autocomplete suggestions
3. Click a result → Form auto-fills
4. ✅ Success! Google Places working

**Test Radius Enforcement:**
1. Select a business FAR away (e.g., type "costa coffee london")
2. Click result
3. ❌ Expected error: "Business outside coverage area"

---

## 🎯 What Changed (Summary)

### Backend:
✅ Database migration adds Google Places config per franchise  
✅ `/api/tenant/config` returns franchise API key + geo settings  
✅ `/api/google/places-details` enforces radius with Haversine  
✅ HQ Admin API for updating franchise config  

### Frontend:
✅ New `GooglePlacesAutocompleteV2` component (controlled input, no warnings)  
✅ Onboarding form uses new component  
✅ Debug output in DEV mode  
✅ Graceful error handling  

### HQ Admin UI:
✅ Franchise Google Places config editor  
✅ Radius preset templates  
✅ View/Edit mode with validation  

---

## 🧪 Quick Tests

### ✅ Test 1: Config API
```bash
curl http://localhost:3000/api/tenant/config?city=bournemouth
```

**Expected:**
```json
{
  "ok": true,
  "city": "bournemouth",
  "googlePlacesPublicKey": "AIza...",
  "center": { "lat": 50.7192, "lng": -1.8808 },
  "onboardingRadiusMeters": 35000
}
```

### ✅ Test 2: Places Details
```bash
curl -X POST http://localhost:3000/api/google/places-details \
  -H "Content-Type: application/json" \
  -H "Host: localhost:3000" \
  -d '{"placeId":"ChIJQR4GgDXxc0gRsAISm_p_uMg"}'
```

**Expected:** Business details with lat/lng

### ✅ Test 3: Radius Enforcement
```bash
# Use a place ID from London (far from Bournemouth)
curl -X POST http://localhost:3000/api/google/places-details?city=bournemouth \
  -H "Content-Type: application/json" \
  -d '{"placeId":"ChIJV...london-place-id"}'
```

**Expected:**
```json
{
  "error": "Business outside coverage area",
  "message": "This business is 180km from bournemouth center..."
}
```

---

## 🐛 Troubleshooting

### "Google Places API key not configured"
**Check:**
```sql
SELECT city, 
       google_places_public_key IS NOT NULL as has_public_key,
       google_places_server_key IS NOT NULL as has_server_key,
       city_center_lat,
       city_center_lng
FROM franchise_crm_configs
WHERE city = 'bournemouth';
```

**Should show:** `has_public_key: true`, `has_server_key: true`

---

### Autocomplete not showing results
**Check browser console:**
```
Failed to load Google Maps script
```

**Fix:** Check API key restrictions in Google Cloud Console.  
Add `http://localhost:3000/*` to HTTP referrers.

---

### "Unable to determine franchise city"
**Using:** `http://localhost:3000/onboarding` (no ?city param)

**Fix:** Add `?city=bournemouth` for localhost testing

---

## 📝 Production Deployment Checklist

Before deploying to production:

- [ ] Migration run in production database
- [ ] At least one franchise has API keys configured
- [ ] API keys restricted properly (HTTP referrers for public, IP for server)
- [ ] City center coordinates set
- [ ] Tested on actual subdomain (e.g., bournemouth.qwikker.co.uk)
- [ ] Verified no ?city= override works on real subdomains
- [ ] No console warnings
- [ ] Debug output off (`NODE_ENV=production`)

---

## 🎓 Resources

- **Full Documentation:** `MULTI_TENANT_GOOGLE_PLACES_IMPLEMENTATION.md`
- **Migration File:** `supabase/migrations/20260116000000_franchise_google_places_config.sql`
- **Tenant Config API:** `app/api/tenant/config/route.ts`
- **Places Details API:** `app/api/google/places-details/route.ts`
- **Autocomplete Component:** `components/ui/google-places-autocomplete-v2.tsx`
- **HQ Admin Component:** `components/hq/franchise-google-places-config.tsx`

---

## ⏱️ Time Estimate

- **Setup Google Cloud:** 10 minutes
- **Update database:** 2 minutes
- **Test locally:** 5 minutes
- **Deploy to staging:** 10 minutes

**Total: ~30 minutes from zero to working**

---

**Status: READY FOR TESTING** ✅

Run migration → Add API keys → Test onboarding → Deploy!
