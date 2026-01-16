# Quick Start: Deploy Imported Business Fixes

## 🚀 3-Step Deployment

### Step 1: Run Database Migration
```bash
# Option A: Supabase CLI (recommended)
cd /Users/qwikker/qwikkerdashboard
supabase db push

# Option B: SQL Editor (Supabase Dashboard)
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy/paste: supabase/migrations/20260116000001_imported_defaults_fix.sql
# 3. Click "Run"
```

**What this does**:
- ✅ Removes trial_expiry default (stops auto-trial on imports)
- ✅ Adds trigger to normalize imported/unclaimed businesses
- ✅ Adds columns: google_primary_type, business_postcode

---

### Step 2: Run Backfill (Clean Existing Data)
```bash
# Option A: psql
psql "your-postgres-connection-string" < docs/backfills/2026_01_imported_normalize.sql

# Option B: SQL Editor (Supabase Dashboard)
# 1. Open SQL Editor
# 2. Copy/paste: docs/backfills/2026_01_imported_normalize.sql
# 3. Click "Run"
```

**What this does**:
- ✅ Sets existing imported businesses to plan='free'
- ✅ Clears trial dates, billing fields, offers
- ✅ Normalizes taglines

**Preview before running**:
```sql
-- See what will change
SELECT business_name, plan, trial_expiry, auto_imported, owner_user_id
FROM public.business_profiles
WHERE auto_imported = true AND owner_user_id IS NULL
LIMIT 10;
```

---

### Step 3: Deploy Frontend
```bash
# Commit and push
git add .
git commit -m "Fix imported/unclaimed business defaults + smart labeling"
git push origin main

# Vercel will auto-deploy
# Or manually trigger deployment
```

**What this updates**:
- ✅ Import pipeline stores richer Google data
- ✅ Business cards show cuisine-specific labels
- ✅ Hero lines never show blank
- ✅ Reviews link to correct Google Maps URL

---

## ✅ Verification Checklist

### 1. Check Momos Bento Bar (or any imported business)
```sql
SELECT 
  business_name,
  plan,
  trial_expiry,
  google_primary_type,
  google_types,
  business_tagline,
  auto_imported,
  owner_user_id
FROM business_profiles
WHERE business_name ILIKE '%momos%'
  OR business_name ILIKE '%nepalese%';
```

**Expected**:
- ✅ `plan = 'free'`
- ✅ `trial_expiry IS NULL`
- ✅ `auto_imported = true`
- ✅ `owner_user_id IS NULL`

---

### 2. Test Discover Page
Visit: `https://bournemouth.qwikker.com/user/discover`

**Check**:
- ✅ Imported restaurants show cuisine labels (e.g., "Nepalese restaurant")
- ✅ Taglines show "Nepalese restaurant in Bournemouth" (not blank)
- ✅ No "UNCLAIMED" badge shows on cards (only in detail view)

---

### 3. Test Business Detail Page
Click into Momos Bento Bar

**Check**:
- ✅ Hero shows "Nepalese restaurant in Bournemouth"
- ✅ "Claim this listing" banner appears (if unclaimed)
- ✅ Reviews tab links to Google Maps with `query_place_id` parameter

---

### 4. Test New Import
Admin panel → Import Businesses

**Check**:
- ✅ Import a new restaurant (e.g., Italian, Thai, Japanese)
- ✅ Check database: `plan='free'`, `trial_expiry IS NULL`
- ✅ Check UI: shows cuisine label (e.g., "Italian restaurant")
- ✅ Check: `google_primary_type` and `business_postcode` populated

---

## 🔧 Troubleshooting

### Issue: Trigger not working (imported businesses still get trial_expiry)
**Cause**: Trigger wasn't created or was disabled

**Fix**:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trg_normalize_imported_business_profiles';

-- Recreate trigger
\i supabase/migrations/20260116000001_imported_defaults_fix.sql
```

---

### Issue: Labels still showing blank or "Restaurant"
**Cause**: google_primary_type not populated (old imports)

**Options**:
1. **Re-import businesses** (gets fresh Google data with primaryType)
2. **Live with it** (fallback logic will show display_category or system_category)

**Test fallback**:
```sql
-- Check what data is available
SELECT 
  business_name,
  google_primary_type,
  google_types,
  display_category,
  system_category
FROM business_profiles
WHERE business_name ILIKE '%momos%';
```

If `google_types` contains cuisine types (e.g., `nepalese_restaurant`), labels should work.  
If not, re-import to fetch richer data.

---

### Issue: Claimed businesses affected by trigger
**Cause**: Shouldn't happen - trigger only runs when `owner_user_id IS NULL`

**Verify**:
```sql
-- Check for false positives
SELECT business_name, plan, owner_user_id, auto_imported
FROM business_profiles
WHERE owner_user_id IS NOT NULL
  AND plan = 'free'
  AND auto_imported = false;
```

Should be empty (or only manually set to free).

---

## 📊 Monitoring Queries

### Count imported/unclaimed businesses by plan
```sql
SELECT plan, COUNT(*) 
FROM business_profiles
WHERE auto_imported = true AND owner_user_id IS NULL
GROUP BY plan;
```

**Expected**: All should be `'free'`

---

### Find businesses with richer Google data
```sql
SELECT business_name, google_primary_type, google_types[1:3] as sample_types
FROM business_profiles
WHERE google_primary_type IS NOT NULL
LIMIT 10;
```

---

### Audit trial_expiry (should only be on claimed/paid)
```sql
SELECT 
  COUNT(*) as businesses_with_trial,
  COUNT(CASE WHEN auto_imported = true THEN 1 END) as imported_with_trial
FROM business_profiles
WHERE trial_expiry IS NOT NULL;
```

**Expected**: `imported_with_trial = 0`

---

## 🎯 Success Criteria

✅ **Database**: All imported businesses have `plan='free'`, `trial_expiry IS NULL`  
✅ **UI**: Business cards show cuisine labels (not blank, not just "Restaurant")  
✅ **Import**: New imports automatically normalize to free tier  
✅ **Claims**: Claiming flow still works (sets owner_user_id, upgrades plan)  
✅ **Signups**: Real business signups still get trials (owner_user_id set from start)

---

## 📚 Full Documentation
See: `IMPORTED_UNCLAIMED_BUSINESS_FIX.md` for detailed technical documentation.

---

**Last Updated**: 2026-01-16  
**Status**: ✅ Ready for Production
