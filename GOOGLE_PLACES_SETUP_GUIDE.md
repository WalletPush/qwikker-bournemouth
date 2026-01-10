# Google Places API (New) - Complete Setup Guide

## ⚠️ CRITICAL: We Use Places API (New) - NOT Legacy

**All endpoints use `places.googleapis.com/v1/...` - NOT the old `maps.googleapis.com/maps/api/place/...`**

---

## 1. APIs Used

### Primary APIs:
- ✅ **Places API (New)** - For searching and getting business details
- ✅ **Geocoding API** - For converting city names to coordinates

### NOT Used (Legacy):
- ❌ ~~Places API (Legacy)~~ - Old version, don't enable this one
- ❌ ~~Maps JavaScript API~~ - Not needed (all server-side)
- ❌ ~~Maps Static API~~ - Not needed (using photo proxy)

---

## 2. Exact Data Flow

### Step 1: Preview Search (Costs ~£0.02-0.10)
1. **Geocoding API** - Convert "Bournemouth, UK" → lat/lng
   - `GET maps.googleapis.com/maps/api/geocode/json`
   - Cost: ~£0.004 per search

2. **Nearby Search (New)** - Find businesses
   - `POST places.googleapis.com/v1/places:searchNearby`
   - FieldMask: Only request what we need (saves money!)
   - Cost: ~£0.019 per search (2-3 searches per category)

### Step 2: Import (Costs ~£0.014 per business)
3. **Place Details (New)** - Get full info for selected businesses
   - `GET places.googleapis.com/v1/{placeId}`
   - FieldMask: Only essential fields
   - Cost: ~£0.014 per business

### Step 3: Photo Display (Costs ~£0.006 per photo view)
4. **Place Photos (New)** - Load images when users view them
   - `GET places.googleapis.com/v1/{photoName}/media`
   - Proxied server-side (never expose API key!)
   - Cost: £0.006 per photo load

---

## 3. Security Architecture

### ✅ CORRECT: Server-Side Only
```
User Browser → QWIKKER API → Google Places API
                 ↑
           (API key stored here, never exposed)
```

### ❌ WRONG: Frontend Exposure
```
User Browser → Google Places API directly
                 ↑
           (API key exposed = security risk!)
```

**How QWIKKER does it:**
- API key stored in `franchise_crm_configs` table (database)
- All Google API calls happen in `/api/admin/import-businesses/*`
- Photos proxied through `/api/google-photo` endpoint
- Frontend NEVER sees the API key

---

## 4. Google Cloud Console Setup

### Step 1: Enable APIs
1. Go to https://console.cloud.google.com/
2. Select your project (or create new one)
3. Go to **APIs & Services → Library**
4. Enable these 2 APIs:
   - ✅ **Places API (New)**
   - ✅ **Geocoding API**

### Step 2: Create API Key
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → API Key**
3. Copy the key (you'll paste this in QWIKKER admin)

### Step 3: Restrict the API Key

#### Application Restrictions:
**Option A: IP Address (Recommended for Vercel)**
- Add your Vercel deployment IP
- More secure for server-side only use

**Option B: None (for development)**
- Use this for local testing
- Switch to IP restriction in production

#### API Restrictions:
**ONLY enable these 2:**
1. ✅ Places API (New)
2. ✅ Geocoding API

**Do NOT enable:**
- ❌ Places API (without "New")
- ❌ Maps JavaScript API
- ❌ Maps Static API
- ❌ Anything else

### Step 4: Set Quotas (Optional but Recommended)
1. Go to **APIs & Services → Quotas**
2. Set daily limits:
   - **Geocoding API:** 100 requests/day
   - **Nearby Search (New):** 500 requests/day
   - **Place Details (New):** 1,000 requests/day
   - **Place Photos (New):** 5,000 requests/day

### Step 5: Set Budget Alerts
1. Go to **Billing → Budgets & alerts**
2. Create budget:
   - Name: "Google Places Budget"
   - Amount: £50/month (adjust as needed)
   - Alert at: 50%, 90%, 100%

---

## 5. Add API Key to QWIKKER

1. Log into your QWIKKER admin dashboard
2. Go to **Setup → Franchise Setup**
3. Scroll to **Google Places API Key**
4. Paste your API key
5. Click **Save Changes**

The key is stored in your database (not in code), so each franchise can use their own key and billing.

---

## 6. Cost Examples

### Import 200 Businesses (One-Time):
- 1× Geocoding: £0.004
- 3× Nearby Search: £0.057
- 200× Place Details: £2.80
- **Total: ~£2.86**

### Monthly Photo Views (Ongoing):
- 1,000 users view business photos: £6.00
- 10,000 users view photos: £60.00

### Caching Strategy:
- Photos cached for 7 days on Vercel Edge
- Reduces repeat costs by ~90%
- 10,000 views = only ~1,000 API calls = £6

---

## 7. Testing Your Setup

### Test 1: Check API is Enabled
```bash
curl "https://places.googleapis.com/v1/places/ChIJN1t_tDeuEmsRUsoyG83frY4?key=YOUR_KEY" \
  -H 'X-Goog-FieldMask: displayName'
```

Expected: Returns Sydney Opera House data

### Test 2: Search in QWIKKER
1. Go to `/admin/import`
2. Search for 5 restaurants in your city
3. Check console for any errors
4. Should see preview results

### Test 3: Import 1 Business
1. Select 1 business from preview
2. Click "Import Selected"
3. Watch progress modal
4. Check admin dashboard → Unclaimed Listings

---

## 8. Troubleshooting

### Error: "API key not configured"
- Check you saved the key in Franchise Setup
- Verify the `city` field matches (e.g., "bournemouth")

### Error: "This API project is not authorized"
- Enable "Places API (New)" in Google Cloud Console
- Wait 1-2 minutes for it to activate

### Error: "The provided API key is invalid"
- Check for extra spaces when pasting
- Regenerate key in Google Cloud Console

### Error: "You have exceeded your quota"
- Check Google Cloud Console → Quotas
- Increase limits or wait until daily reset

### Photos not loading:
- Photo names expire after ~24 hours
- Our proxy fetches fresh names automatically
- Check `/api/google-photo` endpoint logs

---

## 9. Policy Compliance

### What QWIKKER Does:
✅ Never caches photo names (they can expire)
✅ Proxies photos server-side (no key exposure)
✅ Limited performance caching (7 days max)
✅ Uses Places API (New) exclusively

### What QWIKKER Does NOT Do:
❌ Store/rehost Google images permanently
❌ Expose API keys to frontend
❌ Cache photo names long-term
❌ Violate Google's terms of service

---

## 10. Production Checklist

Before launching:
- [ ] API key restricted by IP address
- [ ] Budget alerts set up
- [ ] Quotas configured
- [ ] Tested import with 5 businesses
- [ ] Photos loading correctly
- [ ] Key stored in database (not code)
- [ ] No API keys in GitHub
- [ ] Vercel environment variables NOT used (using DB instead)

---

## Support

**Google Places API Docs:**
- https://developers.google.com/maps/documentation/places/web-service/place-id
- https://developers.google.com/maps/documentation/places/web-service/search-nearby

**Pricing Calculator:**
- https://mapsplatform.google.com/pricing/

**QWIKKER Support:**
- Check console logs in `/api/admin/import-businesses/*`
- Monitor Vercel function logs
- Test with small batches first (5-10 businesses)

