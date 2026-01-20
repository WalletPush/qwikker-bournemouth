# 🔒 LOCKDOWN PATCH — CRITICAL BUG FIXED

**Status:** ✅ READY FOR TESTING

---

## CRITICAL BUG FIX

### ❌ **THE BUG (Line 59 in tier-management-card.tsx):**
```typescript
const [selectedTier, setSelectedTier] = useState<PlanTier>(currentTier || 'starter')
```

**Problem:** When `currentTier` is `null` (expired trials, free listings, unclaimed), it defaulted to `'starter'`, causing:
- ❌ "Starter" showing as selected for expired trials
- ❌ UI claiming a tier exists when it doesn't
- ❌ Exactly the bug we were trying to fix!

### ✅ **THE FIX:**
```typescript
const [selectedTier, setSelectedTier] = useState<PlanTier | null>(currentTier)
```

**Now:**
- ✅ `selectedTier` can be `null`
- ✅ No tier selected for expired trials
- ✅ UI shows "Select a tier above to view features"

---

## FILES CHANGED (FINAL)

### 1. **Fixed:** `types/database.ts`
- **Issue:** First line had pnpm warning text
- **Fix:** Removed corrupted line 1
- **Status:** ✅ Clean TypeScript file

### 2. **Fixed:** `tsconfig.json`
- **Added:** `qwikker-clean-export` to exclude list
- **Prevents:** Backup files from causing build errors

### 3. **Fixed:** `components/admin/tier-management-card.tsx`
**Changes:**
- Line 59: `PlanTier | null` (not `PlanTier`)
- Lines 397-411: Wrapped feature display in `{selectedTier ? ... : ...}`
- Added fallback UI when no tier selected

---

## SQL AUDIT QUERIES

### Query 1: Truth Table (All Businesses)

```sql
WITH latest_sub AS (
  SELECT DISTINCT ON (bs.business_id)
    bs.business_id,
    bs.status AS sub_status,
    bs.tier_id,
    st.tier_name,
    bs.is_in_free_trial,
    bs.free_trial_end_date,
    bs.current_period_end,
    bs.updated_at AS sub_updated_at
  FROM business_subscriptions bs
  LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
  ORDER BY bs.business_id, bs.updated_at DESC NULLS LAST
),
truth AS (
  SELECT
    bp.id,
    bp.business_name,
    bp.city,
    bp.status AS bp_status,
    bp.business_tier AS bp_tier,
    bp.plan AS bp_plan,
    bp.owner_user_id,
    bp.auto_imported,
    bp.google_place_id,
    ls.sub_status,
    ls.tier_name AS sub_tier_name,
    ls.is_in_free_trial,
    ls.free_trial_end_date,
    ls.current_period_end,
    CASE
      WHEN bp.owner_user_id IS NULL AND bp.status IN ('unclaimed','pending_claim') THEN 'UNCLAIMED'
      WHEN ls.business_id IS NULL THEN 'NO_SUB'
      WHEN ls.is_in_free_trial IS TRUE AND ls.free_trial_end_date IS NOT NULL AND ls.free_trial_end_date < NOW() THEN 'TRIAL_EXPIRED'
      WHEN ls.is_in_free_trial IS TRUE AND ls.free_trial_end_date IS NOT NULL AND ls.free_trial_end_date >= NOW() THEN 'TRIAL_ACTIVE'
      WHEN ls.sub_status = 'active' AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW()) THEN 'PAID_ACTIVE'
      WHEN ls.sub_status IS NOT NULL THEN 'PAID_LAPSED'
      ELSE 'UNKNOWN'
    END AS entitlement_state
  FROM business_profiles bp
  LEFT JOIN latest_sub ls ON ls.business_id = bp.id
  WHERE bp.city = 'bournemouth'
)
SELECT 
  business_name,
  entitlement_state,
  bp_tier AS profiles_tier,
  bp_plan AS profiles_plan,
  sub_tier_name AS subscription_tier,
  is_in_free_trial,
  free_trial_end_date,
  bp_status,
  owner_user_id IS NOT NULL AS has_owner
FROM truth
ORDER BY entitlement_state, bp_status, business_name;
```

### Query 2: Drift Detector (Groups)

```sql
WITH latest_sub AS (
  SELECT DISTINCT ON (bs.business_id)
    bs.business_id,
    bs.status AS sub_status,
    bs.tier_id,
    st.tier_name,
    bs.is_in_free_trial,
    bs.free_trial_end_date,
    bs.current_period_end,
    bs.updated_at AS sub_updated_at
  FROM business_subscriptions bs
  LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
  ORDER BY bs.business_id, bs.updated_at DESC NULLS LAST
)
SELECT
  CASE
    WHEN bp.owner_user_id IS NULL AND bp.status IN ('unclaimed','pending_claim') THEN 'UNCLAIMED'
    WHEN ls.business_id IS NULL THEN 'NO_SUB'
    WHEN ls.is_in_free_trial IS TRUE AND ls.free_trial_end_date IS NOT NULL AND ls.free_trial_end_date < NOW() THEN 'TRIAL_EXPIRED'
    WHEN ls.is_in_free_trial IS TRUE AND ls.free_trial_end_date IS NOT NULL AND ls.free_trial_end_date >= NOW() THEN 'TRIAL_ACTIVE'
    WHEN ls.sub_status = 'active' AND (ls.current_period_end IS NULL OR ls.current_period_end >= NOW()) THEN 'PAID_ACTIVE'
    WHEN ls.sub_status IS NOT NULL THEN 'PAID_LAPSED'
    ELSE 'UNKNOWN'
  END AS entitlement_state,
  bp.business_tier AS bp_tier,
  bp.plan AS bp_plan,
  ls.sub_status,
  ls.tier_name AS sub_tier_name,
  COUNT(*) AS n
FROM business_profiles bp
LEFT JOIN latest_sub ls ON ls.business_id = bp.id
WHERE bp.city = 'bournemouth'
GROUP BY 1,2,3,4,5
ORDER BY 1, n DESC;
```

**Look for:**
- ❌ `TRIAL_EXPIRED` with `bp_plan='featured'` → Stale data!
- ❌ `PAID_ACTIVE` with `bp_tier != sub_tier_name` → Drift!
- ✅ `NO_SUB` with `bp_tier=NULL` → Correct!

---

## MANUAL TESTS (5 SCENARIOS)

### Test 1: Expired Trial
**Business:** Mike's Pool Bar, Venezy, Julie's Sports Pub

**Expected:**
- [ ] Header badge: "Trial Expired" (red)
- [ ] Mini card tier: "N/A"
- [ ] Tier Management: Red warning box
- [ ] **NO tier selected** (not "Starter"!)
- [ ] Features section: "Select a tier above..."
- [ ] Status: "EXPIRED"
- [ ] Controls: UNLOCKED

**Console Check:**
```
🔍 Getting current tier from entitlement:
  state: 'TRIAL_EXPIRED'
  tierNameOrNull: null
  
currentTier: null  ✅ KEY!
selectedTier: null ✅ KEY!
```

---

### Test 2: Unclaimed Import
**Expected:**
- [ ] Lock overlay: "Business Must Claim Before Upgrading"
- [ ] Header: "Unclaimed"
- [ ] NO tier selection possible

---

### Test 3: Free Listing (No Subscription)
**Expected:**
- [ ] Header: "Free Listing" (green)
- [ ] NO tier selected
- [ ] Controls: UNLOCKED

---

### Test 4: Active Paid (Alexandra's - Spotlight)
**Expected:**
- [ ] Header: "Spotlight" (gold)
- [ ] Spotlight tier shows "Current" label
- [ ] Status: "LIVE"

---

### Test 5: Active Trial
**Expected:**
- [ ] Header: "Free Trial" (blue)
- [ ] Trial tier shows "Current" label
- [ ] Days remaining shown
- [ ] Status: "LIVE"

---

## VERIFICATION CHECKLIST

**Before Testing:**
1. ✅ Fixed `types/database.ts` (removed pnpm warning)
2. ✅ Fixed `tsconfig.json` (excluded backups)
3. ✅ Fixed `selectedTier` default (null, not 'starter')
4. ✅ Fixed UI to handle null tier
5. ✅ TypeCheck passes (pre-existing errors only)

**Run This:**
```bash
cd /Users/qwikker/qwikkerdashboard
pnpm typecheck  # Should pass (ignore pre-existing errors)
pnpm dev        # Start dev server
```

**Then Test:**
1. Open admin dashboard
2. Find expired trial business (Mike's, Venezy, Julie's)
3. **CRITICAL CHECK:** Tier Management section should show NO tier selected
4. Verify "Select a tier above..." message appears
5. Verify console logs show `currentTier: null`

---

## RED FLAGS TO WATCH

### 🚨 If "Starter" Still Shows:
**Cause:** React state not refreshing
**Fix:** Hard refresh (Cmd+Shift+R) or clear Next.js cache:
```bash
rm -rf .next
pnpm dev
```

### 🚨 If Features Section Crashes:
**Cause:** `tierDetails[selectedTier]` when `selectedTier` is null
**Status:** ✅ Fixed with conditional rendering

### 🚨 If Save Button Errors:
**Cause:** Trying to save with `selectedTier = null`
**Status:** ✅ Guarded by `if (!selectedTier) return`

---

## NEXT STEPS

1. **Run SQL audit queries** → Paste drift detector output for review
2. **Test expired trial business** → Verify NO tier selected
3. **Check console logs** → Confirm `currentTier: null`
4. **If tests pass** → Commit this patch
5. **If tests fail** → Report which scenario + console logs

---

**CRITICAL SUCCESS CRITERIA:**

Expired trials **MUST** show:
- ✅ Tier display: "N/A"
- ✅ `currentTier: null` in console
- ✅ `selectedTier: null` in console
- ✅ NO tier button shows "Current" or "✓ Selected"
- ✅ Features section: "Select a tier above..."

If ANY of these fail, the patch is not working correctly.
