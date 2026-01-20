# Expired Trial CRM Display Fix

## Problem Summary
Expired trial businesses were showing incorrect information in the admin CRM:
- ❌ Status badge showing "LIVE" instead of "EXPIRED"
- ❌ Tier showing "Featured" instead of "Starter"
- ❌ "Subscription Upgrades Locked" message appearing (should only be for UNCLAIMED)
- ❌ Listing Management showing "Currently live and visible to users"
- ❌ Activity feed missing "Trial expired" entry

## Root Cause
The CRM card logic was checking `business.trial_days_remaining < 0` to detect expired trials, but `admin-crm-actions.ts` was setting expired trials to `trial_days_remaining = 0` (not negative!), causing the condition to fail.

## Fixes Applied

### 1. Status Badge (`comprehensive-business-crm-card.tsx`)
**Lines 723-771** - Fixed both collapsed card view and expanded CRM view

**Before:**
```typescript
(business.trial_days_remaining !== null && business.trial_days_remaining < 0) ||
(business.subscription?.is_in_free_trial && ...)
```

**After:**
```typescript
business.trial_status === 'expired'
```

✅ Now shows **"EXPIRED"** badge in red for expired trials

### 2. Tier Display
**Lines 698-723** - Fixed tier badge in collapsed card

**Before:**
```typescript
business.subscription?.is_in_free_trial ? 'Free Trial'
```

**After:**
```typescript
business.trial_status === 'active' ? 'Free Trial'
: business.trial_status === 'expired' ? 'Starter'
```

✅ Now shows **"Starter"** for expired trials

### 3. Subscription Upgrades Lock
**Line 2057** - Fixed control panel access

**Before:**
```typescript
{!isClaimed ? ( // Locked controls
```

**After:**
```typescript
{business.status === 'unclaimed' || isUnclaimed ? ( // Locked controls
```

✅ Now ONLY locks controls for UNCLAIMED businesses, NOT expired trials
✅ Expired trials can now be upgraded or have trial extended

### 4. Listing Management Status
**Lines 2126-2132** - Fixed listing status text

**Before:**
```typescript
{business.status === 'approved' ? 'Currently live and visible to users'
```

**After:**
```typescript
{business.trial_status === 'expired' ? 'Trial expired - not visible to users'
 : business.status === 'approved' ? 'Currently live and visible to users'
```

✅ Now shows **"Trial expired - not visible to users"**

### 5. Activity Feed
**Lines 362-369** - Added trial expiry event

**New Code:**
```typescript
// Trial expired event
if (business.trial_status === 'expired' && business.subscription?.free_trial_end_date) {
  events.push({
    id: eventId++,
    type: 'trial_expired',
    message: `Trial expired on ${date}`,
    timestamp: business.subscription.free_trial_end_date,
    user: 'System'
  })
}
```

✅ Now shows **"Trial expired on [date]"** entry in activity feed

## Expected Behavior After Fix

### Expired Trial CRM Card (List View):
- **Tier Badge:** Starter (grey)
- **Status Badge:** EXPIRED (red)
- **Billing:** Shows expiry date

### Expired Trial CRM Panel (Expanded):
- **Status:** EXPIRED (red, not green)
- **Tier:** Starter
- **Business Controls:**
  - ✅ **NO "Subscription Upgrades Locked"** message
  - ✅ Full access to Tier Management
  - ✅ Trial Extension controls visible
- **Listing Management:** "Trial expired - not visible to users"
- **Activity Feed:** "Trial expired on [date]" entry

### Live/Active Businesses (Unchanged):
- ✅ Still show "LIVE" status
- ✅ Still show correct tier
- ✅ Controls still accessible

### Unclaimed Businesses (Unchanged):
- ⚠️ Still show "Subscription Upgrades Locked"
- ⚠️ Controls remain locked until claimed

## Files Changed
- `/components/admin/comprehensive-business-crm-card.tsx` (5 fixes)

## Testing Steps
1. Navigate to **Admin Dashboard → Expired Trials** tab
2. Open Mike's Pool Bar (or any expired trial)
3. Verify:
   - [ ] Status badge shows "EXPIRED" (red)
   - [ ] Tier shows "Starter"
   - [ ] No "Subscription Upgrades Locked" message
   - [ ] Tier Management controls visible and accessible
   - [ ] Trial Extension button visible
   - [ ] Listing status shows "Trial expired - not visible to users"
   - [ ] Activity feed includes "Trial expired on [date]"
4. Test "Extend Trial" functionality:
   - [ ] Clicking extend trial works
   - [ ] After extending, business moves to "Live Listings" tab
   - [ ] Status changes to "LIVE"
   - [ ] Tier changes to "Free Trial"

## Related Files
- `/lib/actions/admin-crm-actions.ts` - Already correctly sets `trial_status = 'expired'` and `trial_days_remaining = 0`
- `/supabase/functions/cleanup_expired_trials.sql` - Auto-cleanup cron (see EXPIRED_TRIALS_SYSTEM.md)
- `/supabase/functions/extend_trial.sql` - Trial extension logic

## Notes
- The fix uses `business.trial_status === 'expired'` instead of checking `trial_days_remaining < 0` for cleaner, more reliable logic
- All fixes are scoped to expired trials only and do NOT affect live listings, unclaimed businesses, or active trials
- The "Subscription Upgrades Locked" message now ONLY appears for unclaimed businesses (status = 'unclaimed'), as intended
