# Import Tool Pre-Flight Checklist

**CRITICAL:** Complete this checklist before attempting to import businesses.

---

## ✅ **Google Cloud Setup** (REQUIRED)

### 1. Enable Billing
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Navigate to **Billing**
- [ ] Enable billing for your project
- [ ] Add a valid payment method

### 2. Enable Required APIs
- [ ] Go to **APIs & Services** > **Library**
- [ ] Enable the following APIs:
  - **Places API (New)** ✅ (v1 endpoints)
  - **Geocoding API** ✅ (for city center lookup)
  - **Maps JavaScript API** ❌ (NOT needed for import tool)
  - **Maps Static API** ❌ (NOT needed for import tool)

### 3. Create & Restrict API Key
- [ ] Go to **APIs & Services** > **Credentials**
- [ ] Create API Key (or use existing)
- [ ] **Click "Restrict Key"**
- [ ] Set **Application restrictions**:
  - **IP addresses** (recommended for server-side):
    - Add your Vercel deployment IPs
    - Or use "None" if using HTTP referrers instead
  - **OR HTTP referrers** (if calling from frontend):
    - Add `*.vercel.app/*`
    - Add your production domain(s)
- [ ] Set **API restrictions**:
  - Select "Restrict key"
  - Enable ONLY:
    - ✅ Places API (New)
    - ✅ Geocoding API
- [ ] **Save** the restricted key

### 4. Set Billing Alerts (Recommended)
- [ ] Go to **Billing** > **Budgets & Alerts**
- [ ] Create budget: £50/month (or your limit)
- [ ] Set alert at 50%, 75%, 90%

---

## ✅ **Supabase Setup** (REQUIRED)

### 1. Run Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20260111000000_add_geocode_to_franchise_configs.sql
```

- [ ] Migration completed successfully
- [ ] No errors in logs

### 2. Verify Columns Added
```sql
SELECT city, lat, lng, google_places_api_key 
FROM franchise_crm_configs;
```

**Expected:**
- `lat` and `lng` columns exist
- Values are NULL (will be populated on first import)
- `google_places_api_key` is NULL (needs to be set)

### 3. Add Google Places API Key to Database
```sql
UPDATE franchise_crm_configs
SET google_places_api_key = 'YOUR_GOOGLE_API_KEY_HERE'
WHERE city = 'bournemouth';  -- or your city
```

- [ ] API key added to database
- [ ] Verify key is correct (no typos)

### 4. Verify Key is Loaded
```sql
SELECT 
  city, 
  CASE 
    WHEN google_places_api_key IS NOT NULL THEN '✅ Set' 
    ELSE '❌ Missing' 
  END as api_key_status,
  CASE 
    WHEN lat IS NOT NULL AND lng IS NOT NULL THEN '✅ Cached' 
    ELSE '⏳ Will geocode on first use' 
  END as coords_status
FROM franchise_crm_configs;
```

**Expected output:**
```
city         | api_key_status | coords_status
-------------|----------------|---------------------------
bournemouth  | ✅ Set         | ⏳ Will geocode on first use
```

---

## ✅ **Test Import Flow** (STRONGLY RECOMMENDED)

### 1. Test Preview (Small Radius)
- [ ] Go to `/admin/import`
- [ ] Set:
  - Location: "Bournemouth, UK"
  - Category: "Restaurant"
  - Min Rating: 4.4
  - Radius: 3 miles
  - Max Results: 10
- [ ] Click "Preview"
- [ ] Check console logs for:
  ```
  📍 No cached coordinates for bournemouth, geocoding...
  💾 Caching coordinates for bournemouth: 50.xxxx, -1.xxxx
  ✅ Coordinates cached - future searches will skip geocoding
  📍 Search center: 50.xxxx, -1.xxxx | Radius: 4828m
  ```
- [ ] Verify results:
  - Shows 1-10 businesses
  - All have ratings ≥ 4.4
  - Distances look reasonable
  - No error messages

### 2. Test Preview Again (Verify Caching)
- [ ] Run preview again with same settings
- [ ] Check console logs for:
  ```
  ✅ Using cached coordinates for bournemouth: 50.xxxx, -1.xxxx
  ```
- [ ] Should be **faster** than first run (no geocoding)

### 3. Test Different Radius
- [ ] Change radius to 6 miles
- [ ] Click "Preview"
- [ ] Verify:
  - More results than 3-mile search
  - All within ~10km
  - Still uses cached coordinates

### 4. Test Import (1 Business)
- [ ] Select **ONE** business from preview
- [ ] Click "Import Selected"
- [ ] Watch progress bar
- [ ] Verify:
  - Import completes successfully
  - Business appears in admin dashboard
  - Status = "unclaimed"
  - Has placeholder image
  - Category is correct

### 5. Test Skip Duplicates
- [ ] Run same preview again
- [ ] Try to import the same business
- [ ] Verify it's automatically skipped (if toggle enabled)

---

## ⚠️ **Common Issues & Fixes**

### Issue: "Google Places API key not configured"
**Fix:** Run Step 3 of Supabase Setup (add API key to database)

### Issue: "Could not find location: Bournemouth, UK"
**Possible causes:**
1. API key doesn't have Geocoding API enabled
2. API key restrictions are too strict
3. Billing not enabled

**Fix:** Check Google Cloud Console > APIs & Services > Enabled APIs

### Issue: "Invalid coordinates stored"
**Possible causes:**
1. Database returned lat/lng as strings but parsing failed
2. Corrupted data in database

**Fix:** 
```sql
UPDATE franchise_crm_configs 
SET lat = NULL, lng = NULL 
WHERE city = 'bournemouth';
```
Then try preview again (will re-geocode)

### Issue: Preview returns 0 results
**Possible causes:**
1. Radius too small
2. Rating threshold too high (try 4.4 minimum)
3. Category has no businesses in area

**Fix:** 
- Increase radius to 10 miles
- Try different category
- Verify location is correct

### Issue: "Request failed with status 403"
**Possible causes:**
1. API key restrictions too strict
2. Wrong referrer/IP
3. API not enabled

**Fix:** 
- Check API key restrictions in Google Cloud Console
- Temporarily set to "Unrestricted" to test
- Verify IP address matches server IP

---

## 🎯 **Success Criteria**

You're ready to import businesses when:

- [x] ✅ Google Cloud billing enabled
- [x] ✅ Places API (New) + Geocoding API enabled
- [x] ✅ API key created & restricted
- [x] ✅ API key added to Supabase
- [x] ✅ Migration run successfully
- [x] ✅ Preview returns results
- [x] ✅ Coordinates are cached (second preview faster)
- [x] ✅ Test import (1 business) succeeds
- [x] ✅ Business appears as "unclaimed" in admin dashboard

---

## 📊 **Cost Estimates**

Based on Google Places API (New) pricing (as of 2024):

### Per Import Session (typical)
- Geocoding (once per franchise): £0.005
- Nearby Search: £0.019 per type searched
- Place Details: £0.014 per business imported

### Example: Import 50 Bournemouth restaurants
- Geocoding: £0.005 (one-time)
- Search: £0.019 × 2 types = £0.038
- Import: £0.014 × 50 = £0.70
- **Total: ~£0.74**

### Example: Import 200 businesses across 5 categories
- Geocoding: £0 (cached after first use)
- Search: £0.019 × 10 types = £0.19
- Import: £0.014 × 200 = £2.80
- **Total: ~£2.99**

### Monthly (100 imports, 2000 businesses)
- **Estimated: £30-50/month**

---

## 🔒 **Security Checklist**

- [ ] API key is **restricted** (not unrestricted)
- [ ] API key is stored in **database**, not in code
- [ ] API key is **never logged** to console
- [ ] Billing alerts set (prevent runaway costs)
- [ ] Only **Places API (New)** and **Geocoding API** enabled
- [ ] Import tool restricted to **admin users only**

---

## 📝 **Next Steps After First Successful Import**

1. **Review imported business:**
   - Check data quality (address, phone, website)
   - Verify placeholder image is appropriate
   - Confirm category mapping is correct

2. **Test claim flow:**
   - Visit `/claim/[business-slug]`
   - Verify business info displays correctly
   - Test claim submission (requires account)

3. **Test admin approval:**
   - Review claim in admin dashboard
   - Verify updated data is shown
   - Approve claim and check business dashboard access

4. **Scale up imports:**
   - Import 10 businesses per category
   - Monitor Google Cloud costs
   - Check for any duplicate imports

---

**Last updated:** January 11, 2026

