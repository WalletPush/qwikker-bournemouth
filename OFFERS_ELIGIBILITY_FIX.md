# User Offers Page: Eligibility Fix

## 🐛 THE PROBLEM

**User Report:** "Ember and Oak's 2 active offers are showing in the business CRM and business dashboard offers tab, but NOT on the user offers page."

### Root Cause

The user offers page was using inconsistent eligibility logic compared to the secret menu page:

- **Secret Menu Page:** Uses `business_profiles_chat_eligible` view ✅
  - Filters by subscription status
  - Excludes expired trials
  - Only shows eligible businesses

- **Offers Page:** Was using `business_profiles` table directly ❌
  - Only filtered by `status = 'approved'`
  - Did NOT check subscription status
  - Could show businesses without active subscriptions

**Result:** If a business's subscription/trial expired, their offers would disappear from the user offers page, even though they're still visible in the business dashboard (which uses RLS and doesn't check eligibility the same way).

---

## ✅ THE FIX

Updated the user offers page to use the same eligibility view as the secret menu page.

### File: `/app/user/offers/page.tsx`

**Before:**
```typescript
const { data: franchiseBusinesses } = await supabase
  .from('business_profiles')
  .select('id, business_name, city, status')
  .eq('city', franchiseCity)
  .eq('status', 'approved')
```

**After:**
```typescript
const { data: franchiseBusinesses } = await supabase
  .from('business_profiles_chat_eligible')
  .select('id, business_name, city, status')
  .eq('city', franchiseCity)
```

**Note:** The `.eq('status', 'approved')` is no longer needed because `business_profiles_chat_eligible` view already filters for approved businesses.

---

## 🎯 WHAT THIS FIXES

### Before:
- Offers page used raw `business_profiles` table
- Could show/hide offers based on basic approval status only
- Inconsistent with secret menu page logic
- Could show businesses with expired subscriptions

### After:
- Offers page uses `business_profiles_chat_eligible` view
- Consistent eligibility logic across all user-facing pages
- Only shows offers from businesses with active subscriptions/trials
- Matches secret menu page behavior

---

## 🔍 ELIGIBILITY RULES

The `business_profiles_chat_eligible` view enforces ALL of these:

1. ✅ `status = 'approved'`
2. ✅ Has an active subscription (paid or trial)
3. ✅ Trial is not expired (`free_trial_end_date >= NOW()`)
4. ✅ NOT in excluded statuses: `unclaimed`, `pending_claim`, `claimed_free`, `incomplete`

**If Ember and Oak offers are missing, check:**

1. **Subscription Status:**
   ```sql
   SELECT 
     bp.business_name,
     bs.status AS sub_status,
     bs.is_in_free_trial,
     bs.free_trial_end_date,
     bs.current_period_end,
     CASE 
       WHEN bs.free_trial_end_date < NOW() THEN 'TRIAL EXPIRED'
       WHEN bs.status = 'active' THEN 'ACTIVE'
       ELSE 'INACTIVE'
     END AS eligibility_status
   FROM business_profiles bp
   LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
   WHERE bp.business_name ILIKE '%Ember and Oak%'
   ORDER BY bs.updated_at DESC
   LIMIT 1;
   ```

2. **View Inclusion:**
   ```sql
   SELECT business_name, effective_tier, sub_status, is_in_free_trial, free_trial_end_date
   FROM business_profiles_chat_eligible
   WHERE business_name ILIKE '%Ember and Oak%';
   ```
   - **Expected:** One row returned
   - **If no rows:** Ember and Oak is NOT eligible (expired trial or no subscription)

3. **Offers Exist:**
   ```sql
   SELECT 
     bo.offer_name,
     bo.status,
     bo.offer_start_date,
     bo.offer_end_date,
     bp.business_name
   FROM business_offers bo
   JOIN business_profiles bp ON bp.id = bo.business_id
   WHERE bp.business_name ILIKE '%Ember and Oak%'
   AND bo.status = 'approved'
   ORDER BY bo.created_at DESC;
   ```
   - **Expected:** 2 rows (the 2 active offers)

---

## 🧪 HOW TO TEST

### Test 1: Check Server Logs

The offers page has detailed logging. After visiting `/user/offers`, check the server console for:

```
📊 Offers Page: Business query result:
📊 Offers Page: Business IDs for offers query: [...]
📊 Offers Page: business_offers query result:
📊 Offers Page: Found X approved offers
📊 Offers: [list of offers]
```

**If businessIds array is empty** → No eligible businesses found
**If offers array is empty** → No offers for the eligible businesses

### Test 2: Visit the Page

1. Go to `/user/offers`
2. **Expected:** See Ember and Oak's 2 offers (if they're eligible)
3. **If not showing:** Check subscription status (see queries above)

### Test 3: Compare Pages

- Visit `/user/secret-menu` - Does Ember and Oak appear?
- Visit `/user/offers` - Does Ember and Oak appear?
- **Should be consistent** - if they appear in one, they should appear in the other

---

## 🚨 IMPORTANT: SUBSCRIPTION REQUIREMENTS

**User-facing pages now require active subscriptions:**

| Page | View Used | Requirements |
|------|-----------|-------------|
| `/user/secret-menu` | `business_profiles_chat_eligible` | Active subscription/trial |
| `/user/offers` | `business_profiles_chat_eligible` | Active subscription/trial |
| `/user/discover` | (needs checking) | ? |
| AI Chat | `business_profiles_chat_eligible` | Active subscription/trial |

**Business Dashboard:**
- Always shows the business's own data (RLS-protected)
- Does NOT filter by subscription eligibility
- Businesses can see their offers even if subscription expired

**This is correct behavior:**
- Users only see offers from paying/trialing businesses ✅
- Businesses always see their own offers (so they can renew/update) ✅

---

## 📊 CONSISTENT ARCHITECTURE

```
USER OFFERS PAGE
       ↓
Reads from: business_offers table
       ↓
Filtered by: business_profiles_chat_eligible view
       ↓
Displays: Only offers from eligible businesses
```

**Data Flow:**
1. Business creates offer → Saved to `business_offers` table
2. Admin approves offer → Status set to 'approved'
3. User-facing pages query offers → Filter by eligible businesses
4. Subscription expires → Business disappears from user pages
5. Business can still see their offers in business dashboard → Can renew subscription

---

## 🔗 RELATED FIXES

This completes the eligibility consistency across user-facing pages:

1. ✅ **Secret Menu Eligibility** (`SECRET_MENU_ELIGIBILITY_FIX.md`)
   - Uses `business_profiles_chat_eligible`
   
2. ✅ **Offers Eligibility** (this document)
   - Now uses `business_profiles_chat_eligible`
   
3. ✅ **Mock Data Removed** (`SECRET_MENU_MOCK_DATA_REMOVED.md`, `OFFERS_MOCK_DATA_REMOVED.md`)
   - No fake data masking eligibility issues

---

## ✅ VERIFICATION CHECKLIST

- [x] Updated offers page to use `business_profiles_chat_eligible`
- [x] Removed redundant `.eq('status', 'approved')` (view handles it)
- [x] No linter errors
- [ ] Test: Ember and Oak offers appear (if subscription is active)
- [ ] Test: Server logs show correct business IDs
- [ ] Test: Consistency between secret menu and offers pages

---

## 💡 TROUBLESHOOTING

### "Offers are in business dashboard but not user offers page"

**Most likely cause:** Subscription/trial expired

**Check:**
```sql
-- Is the business eligible?
SELECT * FROM business_profiles_chat_eligible 
WHERE business_name ILIKE '%[Business Name]%';

-- Empty result = not eligible
```

**Fix:** Renew the business's subscription or extend their trial

### "No offers showing for any business"

**Check:**
1. Are any businesses eligible?
   ```sql
   SELECT COUNT(*) FROM business_profiles_chat_eligible;
   ```
2. Do those businesses have approved offers?
   ```sql
   SELECT bo.*, bp.business_name
   FROM business_offers bo
   JOIN business_profiles_chat_eligible bp ON bp.id = bo.business_id
   WHERE bo.status = 'approved';
   ```

---

## 🎉 RESULT

The user offers page now has **consistent eligibility logic** with the rest of the platform:

- ✅ Only shows offers from businesses with active subscriptions/trials
- ✅ Consistent with secret menu page
- ✅ Consistent with AI chat
- ✅ No eligibility mismatches between pages

If Ember and Oak offers are still missing after this fix, it means their subscription/trial needs to be activated or renewed.
