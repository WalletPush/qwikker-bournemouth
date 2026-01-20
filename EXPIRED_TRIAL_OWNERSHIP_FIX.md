# Expired Trial Ownership Bug Fix

## Problem
Mike's Pool Bar (expired trial, claimed/approved Oct 2025) was showing:
- ❌ "Business Must Claim Before Upgrading" lock screen
- ❌ Full-screen overlay blocking all controls
- ❌ Treating it like an UNCLAIMED listing

**BUT**: Mike's Pool Bar **IS CLAIMED** (has `owner_user_id`, status = 'approved')

---

## Root Cause
**Two separate bugs:**

### 1. Missing `owner_user_id` in CRM Data
`/lib/actions/admin-crm-actions.ts` line 346:
- Was returning `user_id` but **NOT** `owner_user_id`
- These are DIFFERENT fields:
  - `user_id` = auth user who created profile
  - `owner_user_id` = business owner who claimed listing
- Without `owner_user_id`, all businesses appeared "unclaimed"

### 2. Wrong Lock Condition
`/components/admin/tier-management-card.tsx` line 281:
```typescript
const isUnclaimed = !business?.owner_user_id  // ❌ TOO BROAD!
```
- This locked **ANY business** without `owner_user_id`
- Including expired trials that were actually claimed!

---

## Fixes Applied

### **Fix 1: Return `owner_user_id` in CRM Data**
**File:** `/lib/actions/admin-crm-actions.ts`  
**Line:** 347 (added)

```typescript
return {
  id: business.id,
  user_id: business.user_id,
  owner_user_id: business.owner_user_id, // ✅ ADD THIS!
  business_name: business.business_name,
  // ...
}
```

✅ Now CRM cards receive the ownership data they need!

### **Fix 2: Check Status + Owner for Unclaimed**
**File:** `/components/admin/tier-management-card.tsx`  
**Line:** 281-282

**Before:**
```typescript
const isUnclaimed = !business?.owner_user_id
```

**After:**
```typescript
// ✅ FIXED: Only lock for UNCLAIMED, not for expired trials!
const isUnclaimed = !business?.owner_user_id && business?.status === 'unclaimed'
```

✅ Now only **truly unclaimed** listings are locked!

### **Fix 3: Don't Downgrade Tier on Expiry**
**Files:**
- `/supabase/functions/cleanup_expired_trials.sql` (lines 53-59)
- `/supabase/migrations/20260119000001_setup_expired_trial_cleanup_cron.sql` (lines 115-121)

**Removed:**
```sql
-- ❌ DON'T DO THIS:
UPDATE business_profiles
SET 
  business_tier = 'starter',
  plan = 'starter',
  updated_at = NOW()
WHERE id = v_business.id;
```

**Why:** 
- User wants expired trials to **stay as `free_trial`**
- So they appear in "Expired Trials" tab
- And can be reactivated/upgraded easily

✅ Now expired trials keep their `free_trial` tier!

---

## Canonical Logic (as user requested)

### **3 Independent States:**

#### **1. Ownership State**
```typescript
const isClaimed = !!business.owner_user_id
const isUnclaimed = !business.owner_user_id && business.status === 'unclaimed'
```

#### **2. Entitlement State**
```typescript
const now = new Date()
const sub = business.subscription?.[0] || business.subscription
const trialExpired = sub?.is_in_free_trial && sub?.free_trial_end_date && new Date(sub.free_trial_end_date) < now
const trialActive = sub?.is_in_free_trial && sub?.free_trial_end_date && new Date(sub.free_trial_end_date) >= now
const paidActive = sub?.status === 'active' && !sub?.is_in_free_trial
const isEntitled = paidActive || trialActive
```

#### **3. Visibility State**
```typescript
const isVisibleToUsers = isEntitled && business.status === 'approved'
```

### **Key Rules:**
✅ **Locks depend on ownership** (unclaimed ONLY)  
✅ **"Live/Expired" depends on entitlement** (trial dates)  
✅ **Visibility depends on both** (entitled + approved)

---

## Expected Behavior After Fix

### **Mike's Pool Bar (Expired Trial, Claimed):**
- ✅ **NO lock screen** - full controls visible
- ✅ Can see Tier Management
- ✅ Can see Trial Extension
- ✅ Can see Upgrade options
- ✅ Status shows "EXPIRED" (red)
- ✅ Tier shows "Starter"
- ✅ Listing status: "Trial expired - not visible to users"

### **Naked Coffee (Unclaimed):**
- ⚠️ **Lock screen appears** - correct!
- ⚠️ Must claim before controls accessible
- ⚠️ Shows "Current Status: Unclaimed"

### **Live Businesses (Active Paid/Trial):**
- ✅ No lock screen
- ✅ Status shows "LIVE"
- ✅ Full controls accessible

---

## Files Changed
1. `/lib/actions/admin-crm-actions.ts` - Added `owner_user_id` to return
2. `/components/admin/tier-management-card.tsx` - Fixed `isUnclaimed` check
3. `/supabase/functions/cleanup_expired_trials.sql` - Removed tier downgrade
4. `/supabase/migrations/20260119000001_setup_expired_trial_cleanup_cron.sql` - Removed tier downgrade

---

## Testing Steps
1. Navigate to **Admin Dashboard → Expired Trials**
2. Click on **Mike's Pool Bar** (or any expired trial)
3. Verify:
   - [ ] **NO** "Business Must Claim" lock screen ✅
   - [ ] Can see Tier Management controls ✅
   - [ ] Can see "Extend Trial" button ✅
   - [ ] Status badge shows "EXPIRED" (red) ✅
   - [ ] Tier shows "Starter" ✅
   - [ ] Can click tier options and save ✅

4. Test unclaimed business (if any):
   - [ ] **DOES** show lock screen ⚠️
   - [ ] Controls are blocked ⚠️
   - [ ] Says "Current Status: Unclaimed" ⚠️

---

## Related Docs
- `EXPIRED_TRIAL_CRM_FIX.md` - Previous fix (status badges, listing text)
- `EXPIRED_TRIALS_SYSTEM.md` - Auto-cleanup cron system
- `UNCLAIMED_BUSINESS_CRM_FIXES.md` - Original unclaimed safety logic

---

## Key Takeaway
**Expired trials are CLAIMED listings with expired entitlement.**  
They must NOT be locked like unclaimed listings!

The fix ensures:
- ✅ Only `status === 'unclaimed'` triggers locks
- ✅ `owner_user_id` is properly passed through
- ✅ Expired trials keep `free_trial` tier (not downgraded)
- ✅ Admin can reactivate/upgrade expired trials easily
