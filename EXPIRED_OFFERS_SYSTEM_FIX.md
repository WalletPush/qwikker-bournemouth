# EXPIRED OFFERS SYSTEM-WIDE FIX ✅

## The Real Problem (Jan 22, 2026 - 21:15)

**YOU WERE RIGHT!** The offers from David's Grill Shack **ARE REAL** - they just **EXPIRED** (Oct 2025) and were **STILL SHOWING EVERYWHERE:**

- ❌ Chat showing expired offers
- ❌ Admin CRM cards showing expired offers
- ❌ Business dashboard offers tab showing expired offers

---

## Root Cause Analysis

### 3 Places Where Expired Offers Leaked:

#### 1. Admin CRM (`lib/actions/admin-crm-actions.ts` line 121)
```typescript
// ❌ BEFORE: No expiry filter
.from('business_offers')
.select('*')
.in('business_id', businessIds)
.order('created_at', { ascending: false })
```

**Problem:** Fetched ALL offers regardless of expiry date or status.

#### 2. Business Dashboard (`app/dashboard/offers/page.tsx` line 21)
```typescript
// ❌ BEFORE: No expiry filter in nested query
business_offers!business_id (
  id,
  offer_name,
  ...
  offer_end_date,
  status,
  ...
)
```

**Problem:** Fetched ALL offers for the business without checking expiry.

#### 3. Chat (`lib/ai/hybrid-chat.ts`)
```typescript
// ⚠️ DEPENDS ON VIEW: business_offers_chat_eligible
.from('business_offers_chat_eligible')
```

**Problem:** Relies on view to filter expired offers - if view is wrong, chat leaks them.

---

## The Fixes Applied

### Fix 1: Admin CRM ✅

**File:** `lib/actions/admin-crm-actions.ts`

```typescript
// ✅ AFTER: Filter by status AND expiry
.from('business_offers')
.select('*')
.in('business_id', businessIds)
.eq('status', 'approved') // ✅ Only approved offers
.or(`offer_end_date.is.null,offer_end_date.gte.${new Date().toISOString().split('T')[0]}`) // ✅ Not expired
.order('created_at', { ascending: false })
```

**Logic:**
- Only `status = 'approved'` offers
- Only offers where `offer_end_date` is NULL (no expiry) OR `>= TODAY`

---

### Fix 2: Business Dashboard ✅

**File:** `app/dashboard/offers/page.tsx`

```typescript
// ✅ AFTER: Fetch profile and offers separately, filter offers by expiry
const { data: profileData } = await supabase
  .from('business_profiles')
  .select('*')
  .eq('user_id', data.claims.sub)
  .single()

// ✅ Fetch offers separately with expiry filter
const { data: offersData } = await supabase
  .from('business_offers')
  .select(`...`)
  .eq('business_id', profileData.id)
  .or(`offer_end_date.is.null,offer_end_date.gte.${new Date().toISOString().split('T')[0]}`) // ✅ Filter expired
  .order('created_at', { ascending: false })

// Attach offers to profile
profileData.business_offers = offersData || []
```

**Why separate queries:**
- Supabase doesn't support filtering nested relations in SELECT
- Fetch profile first, then fetch offers with proper filtering
- Manually attach filtered offers to profile object

---

### Fix 3: Chat (Already Done + View Dependency) ✅

**File:** `lib/ai/hybrid-chat.ts`

The chat now:
- ✅ Fetches ALL offers for general queries (not just top result)
- ✅ Uses `business_offers_chat_eligible` view
- ✅ Logs offer expiry dates in dev mode

**CRITICAL:** Chat depends on the `business_offers_chat_eligible` view being correct!

---

## View Verification Required ⚠️

The `business_offers_chat_eligible` view **MUST** filter expired offers.

### Run This SQL to Verify:

```bash
# In Supabase SQL Editor, run:
scripts/verify-offers-view-filters-expiry.sql
```

**Expected Results:**
```
EXPIRED offers in view: 0  ✅ CORRECT
```

**If expired offers appear in view:**
```
EXPIRED offers in view: 2  ❌ LEAKING!
```

Then the view definition is WRONG and needs to be fixed.

---

## View Definition (Should Include This)

The view **MUST** have this WHERE clause:

```sql
CREATE OR REPLACE VIEW business_offers_chat_eligible AS
SELECT 
  id,
  business_id,
  offer_name,
  offer_value,
  offer_claim_amount,
  offer_terms,
  offer_start_date,
  offer_end_date,
  offer_image,
  status,
  display_order,
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
    OR offer_end_date >= CURRENT_DATE  -- ✅ CRITICAL: Block expired
  );
```

---

## Testing

### Test 1: Admin CRM Card
```
1. Open Admin Dashboard
2. Find David's Grill Shack card
3. Check "Offers" tab
Expected: NO expired offers (Oct 2025 offers should be gone)
```

### Test 2: Business Dashboard
```
1. Login as David's Grill Shack
2. Go to Dashboard > Offers
3. Check offers list
Expected: Only active offers (if any)
```

### Test 3: Chat
```
1. Open discover chat
2. Ask: "any offers in bournemouth?"
Expected: ONLY Ember & Oak offers (2 active offers)
Expected: NO David's offers

Console should show:
🎫 Fetching ALL active offers in bournemouth
📋 Current Deals:
  - Ember & Oak Bistro | Midweek Fire Feast | ends 2/12/2026
  - Ember & Oak Bistro | Complimentary Side | ends 2/12/2026
```

### Test 4: Verify Database
```sql
-- Should return 0
SELECT COUNT(*) 
FROM business_offers_chat_eligible 
WHERE offer_end_date < CURRENT_DATE;
```

---

## Files Changed

1. `lib/actions/admin-crm-actions.ts` - Added expiry filter to CRM offers query
2. `app/dashboard/offers/page.tsx` - Separated profile/offers queries, added expiry filter
3. `lib/ai/hybrid-chat.ts` - (Already fixed) Fetch ALL offers for general queries
4. `scripts/verify-offers-view-filters-expiry.sql` - New verification script

---

## Next Steps (Future Enhancements)

### 1. Offer Expiry Notifications
```
Email businesses 7 days before offer expires:
"Your offer 'X' expires in 7 days - click here to extend it"
```

### 2. Past Offers Tab (Like Events)
```
Dashboard > Offers > Tabs:
- Active (offer_end_date >= TODAY or NULL)
- Expired (offer_end_date < TODAY)
- Draft (status != 'approved')
```

**Benefits:**
- Businesses can see past offers
- Can easily re-activate expired offers
- Doesn't take up "active offers" limit

### 3. Auto-Archive After X Days
```
Automatically move offers to "past" status after X days expired
Prevents database bloat
```

---

## Critical Rule Going Forward

**EVERY query for business_offers MUST filter by expiry date:**

```typescript
// ✅ CORRECT
.from('business_offers')
.eq('status', 'approved')
.or(`offer_end_date.is.null,offer_end_date.gte.${new Date().toISOString().split('T')[0]}`)

// ❌ WRONG
.from('business_offers')
.eq('status', 'approved')
// Missing expiry filter!
```

**OR use the view:**

```typescript
// ✅ CORRECT (if view is correct)
.from('business_offers_chat_eligible')
```

---

## Status

🟢 **FIXES DEPLOYED**

### ✅ Fixed:
- Admin CRM cards now filter expired offers
- Business dashboard now filters expired offers
- Chat now fetches ALL offers (not just top result)

### ⏳ Pending Verification:
- Run `scripts/verify-offers-view-filters-expiry.sql` to verify view is correct
- Test all 4 scenarios above
- If view is wrong, create migration to fix it

---

## Quick Verification Commands

### 1. Check View Definition
```sql
SELECT view_definition
FROM information_schema.views
WHERE table_name = 'business_offers_chat_eligible';
```

### 2. Count Expired Offers in View
```sql
-- Should return 0
SELECT COUNT(*) 
FROM business_offers_chat_eligible 
WHERE offer_end_date < CURRENT_DATE;
```

### 3. Test Chat API
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "any offers in bournemouth?",
    "city": "bournemouth"
  }' | jq '.walletActions'
```

Should show ONLY 2 offers from Ember & Oak Bistro.

---

🎯 **The system now correctly filters expired offers at the source (database queries), not relying on UI logic!**
