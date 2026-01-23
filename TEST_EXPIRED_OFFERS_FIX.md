# TEST EXPIRED OFFERS FIX NOW ⚡

## What Was Fixed

**YOU WERE RIGHT!** David's Grill Shack offers **ARE REAL** but **EXPIRED** (Oct 2025).

They were leaking in 3 places:
1. ✅ **Admin CRM** - Now filters expired
2. ✅ **Business Dashboard** - Now filters expired  
3. ✅ **Chat** - Now fetches ALL offers + depends on view

---

## Test Immediately

### 1. Restart Dev Server
```bash
pnpm dev
```

---

## Test Sequence

### Test 1: Chat (Most Critical) ⚡

#### Open Chat
```
http://localhost:3000/discover
```

#### Ask About Offers
```
User: "any offers in bournemouth?"
```

#### ✅ Expected Results:

**Console logs:**
```
🎫 Fetching ALL active offers in bournemouth
🎫 Found 2 wallet actions (all from eligible businesses, all valid)
📋 Current Deals:
  - Ember & Oak Bistro | Midweek Fire Feast | ends 2/12/2026
  - Ember & Oak Bistro | Complimentary Side | ends 2/12/2026
```

**Chat response should mention:**
- ✅ ONLY Ember & Oak Bistro (2 offers)
- ❌ NO David's Grill Shack
- ❌ NO expired offers

---

### Test 2: Admin CRM Card

#### Open Admin Dashboard
```
http://localhost:3000/admin
```

#### Find David's Grill Shack Card

#### Expand Card > Click "Offers" Tab

#### ✅ Expected Results:
- ❌ NO expired Oct 2025 offers
- ❌ NO "30% Off Mighty Mixed Grill"
- ❌ NO "15% Off Cocktails"
- Either shows "No active offers" or only current offers

---

### Test 3: Business Dashboard

#### Login as David's Grill Shack Owner
```
Use their credentials or test account
```

#### Navigate to Dashboard > Offers
```
http://localhost:3000/dashboard/offers
```

#### ✅ Expected Results:
- ❌ NO expired Oct 2025 offers visible
- Only active offers show (if any exist)

---

### Test 4: Verify Database View ⚡

#### Run in Supabase SQL Editor:
```sql
-- Should return 0
SELECT 
  'EXPIRED offers in view' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ LEAKING!'
    ELSE '✅ CORRECT'
  END as status
FROM business_offers_chat_eligible
WHERE offer_end_date < CURRENT_DATE;
```

#### ✅ Expected Result:
```
metric: "EXPIRED offers in view"
count: 0
status: "✅ CORRECT"
```

#### ❌ If count > 0:
The view definition is WRONG and needs to be fixed with a migration.

---

## Full Verification Script

Run this for complete diagnosis:

```sql
-- Run in Supabase SQL Editor
\i scripts/verify-offers-view-filters-expiry.sql
```

This will show:
- View definition
- Count of expired vs active offers
- Which offers are in the view
- Whether expired offers are leaking

---

## If Test 4 Fails (View Leaking Expired Offers)

### The view needs to be fixed with this migration:

```sql
-- Save as: supabase/migrations/YYYYMMDD_fix_offers_view_expiry.sql

DROP VIEW IF EXISTS business_offers_chat_eligible;

CREATE VIEW business_offers_chat_eligible AS
SELECT 
  id,
  business_id,
  offer_name,
  offer_type,
  offer_value,
  offer_claim_amount,
  offer_terms,
  offer_start_date,
  offer_end_date,
  offer_image,
  status,
  approved_by,
  approved_at,
  display_order,
  is_featured,
  created_at,
  updated_at,
  offer_description
FROM business_offers
WHERE 
  status = 'approved'
  AND (
    offer_start_date IS NULL 
    OR offer_start_date <= CURRENT_DATE
  )
  AND (
    offer_end_date IS NULL 
    OR offer_end_date >= CURRENT_DATE  -- ✅ Block expired
  );
```

---

## Quick Checklist

- [ ] Test 1: Chat shows only Ember & Oak (2 offers)
- [ ] Test 2: Admin CRM shows no David's expired offers
- [ ] Test 3: Business dashboard shows no expired offers
- [ ] Test 4: View filters expired correctly (count = 0)

---

## What Changed (Technical)

### 1. Admin CRM Query
**Before:** Fetched all offers  
**After:** Filters by `status='approved'` AND `offer_end_date >= TODAY`

### 2. Business Dashboard Query
**Before:** Nested query fetched all offers  
**After:** Separate query filters by expiry date

### 3. Chat Query
**Before:** Only fetched top result's offers  
**After:** Fetches ALL offers in city, relies on view filtering

---

## Status

🟢 **READY TO TEST**

All code fixes applied. View verification pending.

---

## If It Still Shows Expired Offers

### 1. Check Console Logs
Look for the `📋 Current Deals:` log - it shows ALL offers being fetched.

### 2. Check View
Run Test 4 SQL - if count > 0, the view is the problem.

### 3. Check Date Logic
Verify `new Date().toISOString().split('T')[0]` returns correct date:
```typescript
console.log(new Date().toISOString().split('T')[0])
// Should be: "2026-01-22"
```

---

🎯 **Start with Test 1 (Chat) - it's the fastest way to verify the fix!**
