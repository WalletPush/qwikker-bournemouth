# ⚠️ SUBSCRIPTION STATUS CONSTRAINT

**CRITICAL:** `business_subscriptions.status` has a CHECK constraint.

---

## ALLOWED VALUES ONLY

```sql
CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'suspended'))
```

**DO NOT** try to set `status = 'expired'` - it will violate the constraint and fail.

---

## HOW TO HANDLE EXPIRED TRIALS

### ❌ WRONG:
```sql
UPDATE business_subscriptions
SET status = 'expired'  -- ❌ CONSTRAINT VIOLATION!
WHERE is_in_free_trial = true
  AND free_trial_end_date < NOW();
```

### ✅ CORRECT:
```sql
UPDATE business_subscriptions
SET status = 'cancelled'  -- ✅ Allowed status
WHERE is_in_free_trial = true
  AND free_trial_end_date < NOW();
```

---

## IDENTIFYING EXPIRED TRIALS

**Expired trial = all 3 conditions:**
1. `is_in_free_trial = true`
2. `free_trial_end_date < NOW()`
3. (Optional) `status = 'cancelled'` (if cleanup cron has run)

**SQL:**
```sql
SELECT *
FROM business_subscriptions
WHERE is_in_free_trial = true
  AND free_trial_end_date < NOW();
```

**JavaScript (Entitlement Helper):**
```typescript
// ✅ CORRECT: Compute from date, not status
if (sub.is_in_free_trial && sub.free_trial_end_date) {
  const endDate = new Date(sub.free_trial_end_date)
  const now = new Date()
  
  if (endDate < now) {
    // TRIAL EXPIRED
    return { state: 'TRIAL_EXPIRED', ... }
  }
}
```

---

## STATUS MEANINGS

| Status | Meaning | Use Case |
|--------|---------|----------|
| `trial` | Active trial | When `is_in_free_trial=true AND free_trial_end_date >= now` |
| `active` | Paid subscription active | When paid tier, not in trial |
| `past_due` | Payment failed | Stripe webhook, grace period |
| `cancelled` | Subscription ended | User cancelled, or trial expired (cleanup cron) |
| `suspended` | Admin suspended | Manual admin action |
| ~~`expired`~~ | ❌ NOT ALLOWED | Constraint violation |

---

## FILES FIXED

### ✅ Fixed to Use 'cancelled':
1. `/supabase/functions/cleanup_expired_trials.sql` (Line 48)
2. `/supabase/migrations/20260119000001_setup_expired_trial_cleanup_cron.sql` (Line 110)

### ✅ Already Correct (Use Date Logic):
1. `/lib/utils/entitlement-helpers.ts` (Line 111-145)
   - Computes `TRIAL_EXPIRED` from `free_trial_end_date < now()`
   - Does NOT rely on `status = 'expired'`

2. `/supabase/functions/detect_entitlement_drift.sql`
   - Uses `free_trial_end_date < NOW()` to detect expired trials
   - Does NOT check `status = 'expired'`

---

## ADMIN DASHBOARD LOGIC

**Expired Trial Detection:**
```typescript
const now = new Date()
const sub = business.subscription?.[0]

const isTrialExpired = 
  sub?.is_in_free_trial === true &&
  sub?.free_trial_end_date &&
  new Date(sub.free_trial_end_date) < now
```

**NOT:**
```typescript
const isTrialExpired = sub?.status === 'expired' // ❌ Never true!
```

---

## STRIPE WEBHOOK MAPPING

When Stripe sends webhook events:

| Stripe Status | Our Status |
|--------------|-----------|
| `trialing` | `trial` |
| `active` | `active` |
| `past_due` | `past_due` |
| `canceled` | `cancelled` |
| `unpaid` | `suspended` |

**Note:** Stripe doesn't send `expired` status - they send `canceled` when a trial ends.

---

## CLEANUP CRON BEHAVIOR

**Daily at 2 AM UTC:**
1. Finds trials where `is_in_free_trial=true AND free_trial_end_date < NOW()`
2. Deletes their `knowledge_base` entries
3. Sets `status = 'cancelled'` (NOT 'expired')
4. Keeps `business_tier = 'free_trial'` (for admin "Expired Trials" tab)

---

## TESTING

### Test 1: Verify Constraint
```sql
-- This should FAIL:
UPDATE business_subscriptions
SET status = 'expired'
WHERE id = 'some-uuid';
-- Expected: ERROR: new row violates check constraint
```

### Test 2: Verify Expired Detection
```sql
-- This should SUCCEED and find expired trials:
SELECT 
  bp.business_name,
  bs.status,
  bs.is_in_free_trial,
  bs.free_trial_end_date,
  CASE 
    WHEN bs.is_in_free_trial = true AND bs.free_trial_end_date < NOW() 
    THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END AS computed_status
FROM business_profiles bp
JOIN business_subscriptions bs ON bp.id = bs.business_id
WHERE bs.is_in_free_trial = true;
```

---

## SUMMARY

✅ **DO:**
- Use `status = 'cancelled'` for ended subscriptions
- Compute expired trials from `is_in_free_trial=true AND free_trial_end_date < NOW()`
- Rely on date logic, not status

❌ **DON'T:**
- Use `status = 'expired'` (constraint violation)
- Check `status === 'expired'` in code (always false)
- Assume status alone indicates trial expiry

---

**Last Updated:** 2026-01-20  
**Files Modified:** 2 (cleanup functions)  
**Files Verified:** 2 (entitlement helpers, drift detector)
