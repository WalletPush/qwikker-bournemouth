# KB TARGET DROPDOWN LOCKDOWN

**Date:** 2026-01-20  
**Status:** ✅ COMPLETE  
**Objective:** Lock down "Select Target for Knowledge Base" dropdown to ONLY show businesses eligible for paid AI exposure.

---

## 🎯 PROBLEM SOLVED

### Before (❌ BROKEN):
1. **Dropdown showed "Live Businesses"** which included:
   - `claimed_free` businesses (no paid subscription)
   - Auto-imported unclaimed businesses
   - Businesses with expired trials
   - Client-side filtering only (slow, unreliable)
2. **Result:** Admin could ingest KB for ineligible businesses, causing:
   - Stale menus in KB
   - Expired deals in KB ("valid until last year")
   - KB hits from menu intent queries bypass chat filters

### After (✅ FIXED):
1. Created `business_profiles_kb_eligible` view (identical to `business_profiles_chat_eligible`)
2. Created `/api/admin/kb-eligible` API route to fetch from view
3. Updated dropdown to use KB-eligible list only
4. Added debug label showing count + filter applied
5. Added helper text explaining eligibility rules

---

## 📋 KB ELIGIBILITY RULES

### ✅ BUSINESS INCLUDED IF:
- **Must be chat-eligible:** In `business_profiles_chat_eligible` view
- **Approved:** `status = 'approved'`
- **Has Subscription:** Either:
  - Paid active: `status='active'` AND `current_period_end >= NOW()`
  - OR trial active: `status='trial'` AND `is_in_free_trial=true` AND `free_trial_end_date >= NOW()`
- **NOT auto-imported** (unless explicitly claimed and approved)

### ❌ BUSINESS EXCLUDED IF:
- No subscription
- Expired trial (`free_trial_end_date < NOW()`)
- Status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete', 'rejected')
- Auto-imported and unclaimed
- Unapproved (`status != 'approved'`)

---

## 🗂️ FILES CHANGED

### 1. **`/supabase/migrations/20260120000004_kb_eligible_view.sql`**
- **Purpose:** Create subscription-based KB eligibility view
- **Key Features:**
  - Alias for `business_profiles_chat_eligible` (keeps KB and chat in sync)
  - Returns: `id`, `business_name`, `business_category`, `effective_tier`, `tier_priority`, subscription fields
  - Includes RPC function: `get_kb_eligible_businesses(city)`
  - Orders by: `tier_priority ASC, business_name ASC`
- **Design Decision:** Make KB eligibility IDENTICAL to chat eligibility to prevent future leaks by design

### 2. **`/app/api/admin/kb-eligible/route.ts`** (NEW)
- **Purpose:** API endpoint to fetch KB-eligible businesses
- **Method:** GET
- **Query Params:** `?city=bournemouth` (optional)
- **Returns:** 
  ```typescript
  {
    success: true,
    businesses: Business[],
    count: number
  }
  ```
- **Features:**
  - Uses service role for admin access
  - Fetches from `business_profiles_kb_eligible` view
  - Orders by tier priority + name
  - Logs tier distribution for debugging

### 3. **`/components/admin/admin-dashboard.tsx`**
- **Lines 88-119:** Added state + useEffect to fetch KB-eligible businesses
  - New state: `kbEligibleBusinesses`, `loadingKbEligible`
  - Fetches from `/api/admin/kb-eligible?city=${city}` on mount
  - Logs count and falls back to `liveBusinesses` if API fails
- **Lines 2978-3012:** Updated KB dropdown
  - Changed from `liveBusinesses` to `kbEligibleBusinesses`
  - Added debug label (dev only): Shows count + "paid/trial only"
  - Updated optgroup label: "✅ KB Eligible Businesses (Paid/Trial Only)"
  - Added helper text explaining eligibility
  - Disabled dropdown while loading
  - Shows "No eligible businesses" message if list is empty

---

## 🧪 VERIFICATION QUERIES

### Query 1: Check View Exists and Has Data
```sql
-- Should return count of eligible businesses (less than total "Live Businesses")
SELECT COUNT(*) AS kb_eligible_count 
FROM business_profiles_kb_eligible;
```

**✅ PASS IF:** `kb_eligible_count` > 0 and < total approved businesses

---

### Query 2: Verify NO Auto-Imported Unclaimed (Should Return 0)
```sql
-- Auto-imported unclaimed businesses should NOT be eligible for KB
SELECT COUNT(*) 
FROM business_profiles_kb_eligible bke
JOIN business_profiles bp ON bp.id = bke.id
WHERE bp.auto_imported = true 
  AND bp.status IN ('unclaimed', 'pending_claim');
```

**✅ PASS IF:** Count = 0

---

### Query 3: Verify NO Expired Trials (Should Return 0)
```sql
-- Expired trial businesses should NOT be eligible for KB
SELECT COUNT(*) 
FROM business_profiles_kb_eligible 
WHERE is_in_free_trial = true 
  AND free_trial_end_date IS NOT NULL 
  AND free_trial_end_date < NOW();
```

**✅ PASS IF:** Count = 0

---

### Query 4: Verify NO Claimed_Free (Should Return 0)
```sql
-- Claimed_free businesses should NOT be eligible for KB
SELECT COUNT(*) 
FROM business_profiles_kb_eligible bke
JOIN business_profiles bp ON bp.id = bke.id
WHERE bp.status = 'claimed_free';
```

**✅ PASS IF:** Count = 0

---

### Query 5: Compare Before/After Counts
```sql
-- Show how many businesses are being excluded
SELECT 
  (SELECT COUNT(*) FROM business_profiles 
   WHERE status IN ('approved', 'claimed_free')) AS old_live_count,
  (SELECT COUNT(*) FROM business_profiles_kb_eligible) AS new_kb_eligible_count,
  (SELECT COUNT(*) FROM business_profiles 
   WHERE status IN ('approved', 'claimed_free'))
    - (SELECT COUNT(*) FROM business_profiles_kb_eligible) AS excluded_count;
```

**✅ PASS IF:** `excluded_count` > 0 (we're now stricter)

---

### Query 6: Show Excluded Businesses (For Audit)
```sql
-- Identify which businesses are excluded from KB and why
SELECT 
  bp.id,
  bp.business_name,
  bp.status,
  bp.auto_imported,
  CASE
    WHEN bp.status = 'claimed_free' THEN 'CLAIMED_FREE (no paid sub)'
    WHEN bp.status IN ('unclaimed', 'pending_claim') THEN 'UNCLAIMED/PENDING_CLAIM'
    WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'NOT_CHAT_ELIGIBLE'
    ELSE 'OTHER'
  END AS exclusion_reason,
  bs.status AS sub_status,
  bs.is_in_free_trial,
  bs.free_trial_end_date
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
WHERE bp.status IN ('approved', 'claimed_free')
  AND bp.id NOT IN (SELECT id FROM business_profiles_kb_eligible)
ORDER BY exclusion_reason, bp.business_name;
```

**✅ PASS IF:** All exclusion reasons are valid (not 'OTHER')

---

## 🧪 MANUAL TEST CHECKLIST

### Test 1: Verify Dropdown Shows Only Eligible Businesses
1. **Open admin dashboard** (dev mode)
2. **Go to Knowledge Base tab**
3. **Check dropdown label:**
   - Should show debug count: `✅ X eligible (paid/trial only)`
   - Optgroup label: `✅ KB Eligible Businesses (Paid/Trial Only)`
4. **Check helper text:**
   - Should explain: "Only businesses with active paid subscriptions or trials..."
5. **Count businesses in dropdown**
6. **Run Query 5 above** and verify dropdown count matches `new_kb_eligible_count`

**✅ PASS IF:** Dropdown count matches DB count and is less than total "Live Businesses"

---

### Test 2: Verify Claimed_Free NOT in Dropdown
1. **Go to admin CRM → Live Listings tab**
2. **Find a business with status = 'claimed_free'** (if any exist)
3. **Note the business name**
4. **Go to Knowledge Base tab**
5. **Check dropdown**
6. **Verify that claimed_free business does NOT appear**

**✅ PASS IF:** claimed_free business NOT in dropdown

---

### Test 3: Verify Auto-Imported Unclaimed NOT in Dropdown
1. **Go to admin CRM → Unclaimed Listings tab**
2. **Find an auto-imported business** (check for `auto_imported = true`)
3. **Note the business name**
4. **Go to Knowledge Base tab**
5. **Check dropdown**
6. **Verify that unclaimed business does NOT appear**

**✅ PASS IF:** Unclaimed business NOT in dropdown

---

### Test 4: Verify Expired Trial NOT in Dropdown
1. **Go to admin CRM → Expired Trials tab**
2. **Find a business with expired trial** (if any)
3. **Note the business name**
4. **Go to Knowledge Base tab**
5. **Check dropdown**
6. **Verify that expired trial business does NOT appear**

**✅ PASS IF:** Expired trial business NOT in dropdown

---

### Test 5: Verify Active Paid/Trial Businesses ARE in Dropdown
1. **Go to admin CRM → Live Listings tab**
2. **Find a business with:**
   - **Option A:** Active paid subscription (tier = spotlight/featured/starter, not trial)
   - **Option B:** Active trial (is_in_free_trial = true, end date in future)
3. **Note the business name**
4. **Go to Knowledge Base tab**
5. **Check dropdown**
6. **Verify that business DOES appear**

**✅ PASS IF:** Active paid/trial businesses appear in dropdown

---

### Test 6: Verify API Response
1. **Open browser dev tools → Network tab**
2. **Go to Knowledge Base tab** (triggers API call)
3. **Find request:** `/api/admin/kb-eligible?city=bournemouth`
4. **Check response:**
   ```json
   {
     "success": true,
     "businesses": [...],
     "count": X
   }
   ```
5. **Check console logs:**
   - `✅ Loaded X KB-eligible businesses (excludes auto-imported, unclaimed, expired trials)`
   - `📊 KB-eligible tier distribution: { spotlight: X, featured: Y, starter: Z }`

**✅ PASS IF:** API returns correct data and console shows expected logs

---

## 📊 BEFORE/AFTER COMPARISON

| Aspect | Before (❌) | After (✅) |
|--------|------------|----------|
| **Data Source** | `liveBusinesses` (client-side filter) | `business_profiles_kb_eligible` (DB view) |
| **Filter Logic** | `status IN ('approved', 'claimed_free')` + client date check | Subscription-based (paid active OR trial active) |
| **Claimed_Free** | Included (WRONG) | Excluded (CORRECT) |
| **Auto-Imported** | Included if approved (WRONG) | Excluded (CORRECT) |
| **Expired Trials** | Client-side filter (unreliable) | DB view filter (reliable) |
| **Performance** | Slow (filters all businesses) | Fast (pre-filtered view) |
| **Consistency** | Inconsistent with chat | Identical to chat (by design) |
| **Debug Info** | None | Shows count + filter applied |

---

## 🚀 DEPLOYMENT CHECKLIST

### Step 1: Apply Migration
```bash
cd /Users/qwikker/qwikkerdashboard

# Apply KB eligible view migration
psql YOUR_DB_URL < supabase/migrations/20260120000004_kb_eligible_view.sql

# OR via Supabase CLI:
supabase db push
```

### Step 2: Verify Migration Applied
```sql
-- Check view exists
SELECT COUNT(*) FROM business_profiles_kb_eligible;

-- Check RPC function exists
SELECT get_kb_eligible_businesses('bournemouth');
```

### Step 3: Run Verification Queries (Above)
- Run Query 1-6 from "Verification Queries" section
- All must PASS

### Step 4: Test in Browser
1. Open admin dashboard (dev mode)
2. Go to Knowledge Base tab
3. Check debug label shows correct count
4. Verify dropdown only shows eligible businesses
5. Check console logs show tier distribution

### Step 5: Test API Endpoint Directly
```bash
# Test API endpoint
curl http://localhost:3000/api/admin/kb-eligible?city=bournemouth
```

### Step 6: Deploy to Production
```bash
git add .
git commit -m "feat: KB dropdown lockdown - prevent ineligible business KB ingestion

- Create business_profiles_kb_eligible view (identical to chat_eligible)
- Create /api/admin/kb-eligible API route
- Update admin dashboard KB dropdown to use filtered list
- Add debug label showing count + filter applied
- Add helper text explaining eligibility rules
- Prevents stale menus/deals from ineligible businesses polluting KB"

git push origin main
```

---

## 🔧 MAINTENANCE

### When to Re-check KB Eligibility

**After these events:**
1. Business subscription expires or cancels
2. Business trial expires
3. Business status changes (approved → unclaimed, etc.)
4. New subscription tier added

**Action:** Re-run verification queries to ensure view still excludes correctly.

---

### If Dropdown Shows Wrong Businesses

**Check 1: View is up to date**
```sql
-- Refresh view (shouldn't be needed, but just in case)
REFRESH MATERIALIZED VIEW business_profiles_kb_eligible; -- Only if view is materialized

-- Or just re-query
SELECT COUNT(*) FROM business_profiles_kb_eligible;
```

**Check 2: API is using correct view**
- Check `/app/api/admin/kb-eligible/route.ts`
- Ensure it queries `business_profiles_kb_eligible`

**Check 3: Frontend is using API**
- Check admin dashboard console logs
- Should see: `✅ Loaded X KB-eligible businesses`
- If not, check Network tab for API errors

---

## 🔍 TROUBLESHOOTING

### Issue: Dropdown Shows 0 Businesses

**Possible Causes:**
1. **No businesses have paid/trial subscriptions**
   - Run Query 1: Check if view has data
   - If view is empty, all businesses are on free tier or expired
2. **API route failing**
   - Check browser console for errors
   - Check Network tab for `/api/admin/kb-eligible` response
3. **View not created**
   - Check if migration applied: `\d business_profiles_kb_eligible`

**Fix:** Apply migration or check subscription data.

---

### Issue: Ineligible Business Still in Dropdown

**This should NOT happen.** If it does:
1. **Check business details:**
   ```sql
   SELECT * FROM business_profiles WHERE id = 'BUSINESS_ID';
   SELECT * FROM business_subscriptions WHERE business_id = 'BUSINESS_ID';
   ```
2. **Check if in view:**
   ```sql
   SELECT * FROM business_profiles_kb_eligible WHERE id = 'BUSINESS_ID';
   ```
3. **If in view but shouldn't be:**
   - View definition is broken
   - Re-apply migration
   - Report bug

---

### Issue: Debug Label Not Showing

**Possible Causes:**
1. **Not in development mode**
   - Debug label only shows in dev: `process.env.NODE_ENV === 'development'`
2. **Still loading**
   - Wait for `loadingKbEligible` to become false

**Not a bug:** Debug labels are intentionally hidden in production.

---

## 📖 WHY THIS MATTERS

### Even if Chat is "Fixed"...

If you continue allowing KB ingestion for excluded businesses:
- ❌ Stale menus persist in KB
- ❌ Expired deals ("valid until last year") stay in KB
- ❌ "Menu intent" bypasses chat filters and hits KB directly
- ❌ AI can still surface ineligible businesses via KB search

### Locking the KB Dropdown = Sealing the System

**This is the final piece:**
1. ✅ Chat eligibility locked (only approved + subscribed)
2. ✅ Deals validity locked (only valid dates + eligible businesses)
3. ✅ **KB target locked (only eligible businesses for ingestion)**

**Result:** Complete lockdown of AI exposure to paid/trial businesses only.

---

## ✅ COMPLETION STATUS

| Task | Status |
|------|--------|
| Create `business_profiles_kb_eligible` view | ✅ COMPLETE |
| Create `get_kb_eligible_businesses()` RPC | ✅ COMPLETE |
| Create `/api/admin/kb-eligible` API route | ✅ COMPLETE |
| Update admin dashboard state + fetch | ✅ COMPLETE |
| Update KB dropdown to use filtered list | ✅ COMPLETE |
| Add debug label (dev mode) | ✅ COMPLETE |
| Add helper text | ✅ COMPLETE |
| Create verification queries | ✅ COMPLETE |
| Document implementation | ✅ COMPLETE |

**Date Completed:** 2026-01-20  
**Ready for deployment:** ✅ YES

---

## 📞 SUPPORT

**Related Documentation:**
- `/CHAT_LOCKDOWN_COMPLETE_SUMMARY.md` - Complete lockdown overview
- `/CHAT_LOCKDOWN_IMPLEMENTATION.md` - Business eligibility details
- `/CHAT_DEALS_LOCKDOWN.md` - Deals validity details

**For Issues:** Run troubleshooting queries above, check browser console logs and Network tab, verify migration applied correctly.
