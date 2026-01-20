# CHAT DEALS LOCKDOWN - IMPLEMENTATION

**Date:** 2026-01-20  
**Status:** ✅ COMPLETE  
**Objective:** Ensure AI chat "current deals" NEVER shows expired offers or offers from ineligible businesses.

---

## 🎯 PROBLEM SOLVED

### Before (❌ BROKEN):
1. **Expired Offers Showing:** Chat displayed offers past their `valid_until` date
2. **Ineligible Business Offers:** Showed offers from:
   - Businesses with expired trials (e.g., Julie's Sports Pub, Venezy Burgers)
   - Auto-imported unclaimed businesses
   - Unapproved businesses
   - Businesses with no subscription
3. **No Date Validation:** `valid_from` and `valid_until` not checked
4. **No Subscription Check:** Only checked `business_offers.status='approved'`, not business eligibility

### After (✅ FIXED):
1. Created `chat_active_deals` view with dual gating:
   - **Business Eligibility:** INNER JOIN with `business_profiles_chat_eligible`
   - **Offer Validity:** Enforces `valid_until >= NOW()` and `valid_from <= NOW()`
2. Updated chat code to use view instead of direct `business_offers` queries
3. Offers sorted by `tier_priority` (spotlight first, then featured/trial, then starter)

---

## 📋 CHAT ACTIVE DEALS ELIGIBILITY RULES

### ✅ OFFER INCLUDED IF:

**Business Eligibility (via `business_profiles_chat_eligible`):**
- `business_profiles.status = 'approved'`
- Has `business_subscriptions` row with:
  - Paid active: `status='active'` AND `current_period_end >= NOW()`
  - OR trial active: `status='trial'` AND `is_in_free_trial=true` AND `free_trial_end_date >= NOW()`
- NOT `auto_imported` (unless explicitly claimed and approved)

**Offer Validity:**
- `business_offers.status = 'approved'`
- `valid_until IS NULL OR valid_until >= NOW()` (not expired)
- `valid_from IS NULL OR valid_from <= NOW()` (already started)

### ❌ OFFER EXCLUDED IF:

**Business Reasons:**
- No subscription
- Expired trial (`free_trial_end_date < NOW()`)
- Unapproved (`status != 'approved'`)
- Status IN ('unclaimed', 'pending_claim', 'claimed_free', 'incomplete')
- Auto-imported and unclaimed

**Offer Reasons:**
- Not approved (`status != 'approved'`)
- Expired (`valid_until < NOW()`)
- Future-dated (`valid_from > NOW()`)

---

## 🗂️ FILES CHANGED

### 1. **`/supabase/migrations/20260120000003_chat_active_deals_view.sql`**
- **Purpose:** Create subscription-based + date-gated active deals view
- **Key Features:**
  - INNER JOIN with `business_profiles_chat_eligible` (ensures only eligible businesses)
  - Date validation: `valid_until >= NOW()` AND `valid_from <= NOW()`
  - Returns `effective_tier`, `tier_priority` for sorting
  - Includes RPC function `get_chat_active_deals(city, limit)` for easy querying
- **View Schema:**
  ```sql
  offer_id, business_id, business_name, offer_name, offer_description,
  offer_value, valid_from, valid_until, city, effective_tier, tier_priority
  ```

### 2. **`/lib/ai/hybrid-chat.ts`** (3 changes)
- **Lines 148-159:** Changed offer counts query from `business_offers` to `chat_active_deals`
- **Lines 383-415:** Changed wallet actions query from `business_offers` to `chat_active_deals`
  - Now fetches `offer_id` instead of `id`
  - Orders by `tier_priority ASC, offer_updated_at DESC`
  - Logs tier distribution for debugging
- **Effect:** Hybrid chat now only shows active, valid offers from eligible businesses

### 3. **`/lib/ai/chat.ts`**
- **Lines 1120-1145:** Changed wallet actions query from `business_offers` to `chat_active_deals`
  - Now fetches `offer_id` instead of `id`
  - Orders by `tier_priority ASC, offer_updated_at DESC`
  - Uses 5 offer limit (down from 10 in hybrid)
- **Effect:** Legacy chat now only shows active, valid offers from eligible businesses

---

## 🧪 VERIFICATION QUERIES

### Query 1: Verify NO Expired Offers (Should Return 0)
```sql
-- This should return 0 - all offers in the view must be valid
SELECT COUNT(*) AS expired_offers_count
FROM chat_active_deals
WHERE valid_until IS NOT NULL 
  AND valid_until < NOW();
```

**✅ PASS IF:** `expired_offers_count = 0`

---

### Query 2: Verify NO Offers from Auto-Imported Businesses (Should Return 0)
```sql
-- This should return 0 - auto_imported businesses should be excluded
SELECT COUNT(*) AS auto_imported_offers_count
FROM chat_active_deals cad
JOIN business_profiles bp ON bp.id = cad.business_id
WHERE bp.auto_imported = true;
```

**✅ PASS IF:** `auto_imported_offers_count = 0`

---

### Query 3: Verify NO Offers from Expired Trials (Should Return 0)
```sql
-- This should return 0 - expired trials should be excluded
SELECT COUNT(*) AS expired_trial_offers_count
FROM chat_active_deals
WHERE is_in_free_trial = true
  AND free_trial_end_date IS NOT NULL
  AND free_trial_end_date < NOW();
```

**✅ PASS IF:** `expired_trial_offers_count = 0`

---

### Query 4: Show Tier Distribution (For Audit)
```sql
-- Show how many offers per tier are available
SELECT 
  effective_tier,
  COUNT(*) AS num_offers,
  COUNT(DISTINCT business_id) AS num_businesses
FROM chat_active_deals
WHERE city = 'bournemouth'
GROUP BY effective_tier
ORDER BY 
  CASE effective_tier
    WHEN 'spotlight' THEN 1
    WHEN 'featured' THEN 2
    WHEN 'starter' THEN 3
    ELSE 4
  END;
```

**✅ PASS IF:** All tiers are in ('spotlight', 'featured', 'starter') and num_offers > 0

---

### Query 5: Identify Excluded Offers (For Debugging)
```sql
-- Show which offers exist but are EXCLUDED from chat_active_deals and why
SELECT 
  bp.business_name,
  bp.status AS bp_status,
  bp.auto_imported,
  bo.offer_name,
  bo.status AS offer_status,
  bo.valid_from,
  bo.valid_until,
  CASE
    WHEN bp.id NOT IN (SELECT id FROM business_profiles_chat_eligible) THEN 'BUSINESS_NOT_ELIGIBLE'
    WHEN bo.status != 'approved' THEN 'OFFER_NOT_APPROVED'
    WHEN bo.valid_until IS NOT NULL AND bo.valid_until < NOW() THEN 'OFFER_EXPIRED'
    WHEN bo.valid_from IS NOT NULL AND bo.valid_from > NOW() THEN 'OFFER_FUTURE'
    ELSE 'OTHER'
  END AS exclusion_reason
FROM business_offers bo
JOIN business_profiles bp ON bp.id = bo.business_id
WHERE bo.id NOT IN (SELECT offer_id FROM chat_active_deals)
  AND bp.city = 'bournemouth'
ORDER BY exclusion_reason, bp.business_name;
```

**✅ PASS IF:** All exclusion reasons are valid (not 'OTHER')

---

### Query 6: Check Specific Business (Julie's Sports Pub, Venezy Burgers)
```sql
-- Verify that these specific businesses (reported as having expired trials) show NO offers
SELECT 
  bp.business_name,
  bp.status AS bp_status,
  COUNT(cad.offer_id) AS num_offers_in_chat,
  bs.status AS sub_status,
  bs.is_in_free_trial,
  bs.free_trial_end_date,
  CASE 
    WHEN bs.is_in_free_trial = true AND bs.free_trial_end_date < NOW() THEN 'TRIAL_EXPIRED'
    WHEN bs.is_in_free_trial = true AND bs.free_trial_end_date >= NOW() THEN 'TRIAL_ACTIVE'
    WHEN bs.status = 'active' THEN 'PAID_ACTIVE'
    ELSE 'OTHER'
  END AS subscription_state
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
LEFT JOIN chat_active_deals cad ON cad.business_id = bp.id
WHERE bp.business_name IN ('Julie''s Sports Pub', 'Venezy Burgers')
GROUP BY bp.business_name, bp.status, bs.status, bs.is_in_free_trial, bs.free_trial_end_date;
```

**✅ PASS IF:** 
- `num_offers_in_chat = 0` for expired trial businesses
- `subscription_state = 'TRIAL_EXPIRED'` for those businesses

---

## 🧪 MANUAL TEST CHECKLIST

### Test 1: Verify Expired Offers Don't Appear
1. Open QWIKKER app
2. Go to chat
3. Ask: "What are the current deals?"
4. **Check:** NO offers with past dates appear
5. **Check Console Logs:** Look for "Found X wallet actions (all from eligible businesses, all valid)"
6. Run Query 1 above (should return 0)

**✅ PASS IF:** No expired offers shown

---

### Test 2: Verify Expired Trial Businesses Don't Appear
1. Open admin CRM
2. Find a business with expired trial (e.g., Julie's Sports Pub if it exists)
3. Note the business ID
4. Go to chat
5. Ask: "Show me deals from Julie's Sports Pub"
6. **Check:** NO offers appear (or "No deals available" message)
7. Run Query 6 above for that specific business

**✅ PASS IF:** `num_offers_in_chat = 0`

---

### Test 3: Verify Auto-Imported Unclaimed Businesses Don't Appear
1. Go to admin CRM → Unclaimed Listings tab
2. Find an auto-imported business with offers (if any)
3. Note the business name
4. Go to chat
5. Ask: "Show me deals" (broad query)
6. **Check:** That unclaimed business does NOT appear
7. Run Query 2 above (should return 0)

**✅ PASS IF:** No auto-imported business offers shown

---

### Test 4: Verify Only Eligible Businesses Show Deals
1. Go to chat
2. Ask: "What deals are available?"
3. **Check Console Logs:** Look for tier distribution, e.g.:
   ```
   🎫 Tier distribution: David Menus(featured), Emma's Cafe(spotlight), ...
   ```
4. **Check:** All businesses shown are either spotlight, featured, or starter
5. Run Query 4 above

**✅ PASS IF:** All tiers are valid and no 'free_tier' or null

---

### Test 5: Verify Tier Priority Ordering
1. If you have offers from different tier businesses, chat should show:
   - Spotlight (Qwikker Picks) offers FIRST
   - Featured/Trial offers SECOND
   - Starter offers LAST
2. Within each tier, newest offers first (by `updated_at`)
3. Run Query 4 and check that spotlight has priority 1, featured has 2, starter has 3

**✅ PASS IF:** Offers appear in correct tier priority order

---

## 📊 BEFORE/AFTER COMPARISON

| Aspect | Before (❌) | After (✅) |
|--------|------------|----------|
| **Data Source** | `business_offers` (direct query) | `chat_active_deals` (gated view) |
| **Business Check** | Only joined `business_profiles` | INNER JOIN `business_profiles_chat_eligible` |
| **Date Validation** | None (`valid_until` ignored) | Enforced (`valid_until >= NOW()`) |
| **Trial Expiry Check** | None | Enforced (view excludes expired trials) |
| **Auto-Imported Check** | None | Enforced (view excludes auto-imported) |
| **Offer Status** | `status='approved'` only | `status='approved'` + date checks |
| **Sorting** | No sorting | `tier_priority ASC, updated_at DESC` |
| **Expired Offers** | Could appear | Guaranteed excluded |
| **Ineligible Business Offers** | Could appear | Guaranteed excluded |

---

## 🚀 DEPLOYMENT CHECKLIST

### Step 1: Apply Migration
```bash
cd /Users/qwikker/qwikkerdashboard

# Apply chat active deals view migration
psql YOUR_DB_URL < supabase/migrations/20260120000003_chat_active_deals_view.sql

# OR via Supabase CLI:
supabase db push
```

### Step 2: Verify Migration Applied
```sql
-- Check view exists and has data
SELECT COUNT(*) FROM chat_active_deals;

-- Check RPC function exists
SELECT get_chat_active_deals('bournemouth', 5);
```

### Step 3: Run Verification Queries (Above)
- Run Query 1-6 from "Verification Queries" section
- All must PASS

### Step 4: Test in Browser
1. Open QWIKKER app
2. Go to chat
3. Ask: "What are the current deals?"
4. Check console logs:
   - `🎫 Found X wallet actions (all from eligible businesses, all valid)`
   - `🎫 Tier distribution: ...`
5. Verify NO expired offers, NO ineligible business offers appear
6. Check offer dates are all in the future (not expired)

### Step 5: Test Specific Cases
1. Find a business with expired trial in admin CRM
2. Ask for deals from that business in chat
3. Verify ZERO offers appear

### Step 6: Deploy to Production
```bash
git add .
git commit -m "feat: chat deals lockdown - prevent expired offers and ineligible business leakage

- Create chat_active_deals view with dual gating (business eligibility + offer validity)
- Update hybrid-chat.ts and chat.ts to use gated view
- Enforce valid_until >= NOW() and valid_from <= NOW()
- Sort by tier_priority (spotlight first, then featured/trial, then starter)
- Add verification queries and test checklist"

git push origin main
```

---

## 🔧 MAINTENANCE

### Daily Check (Optional)
```sql
-- Run Query 1 daily (Verify NO Expired Offers)
SELECT COUNT(*) AS expired_offers_count
FROM chat_active_deals
WHERE valid_until IS NOT NULL AND valid_until < NOW();
```

If this ever returns > 0, investigate immediately - the view definition may have a bug.

---

### Weekly Audit (Recommended)
```sql
-- Run Query 5 weekly (Identify Excluded Offers)
-- Review exclusion reasons to ensure they're all valid
```

---

### When Adding New Tiers
1. Ensure new tier is added to `subscription_tiers` table
2. Update `business_profiles_chat_eligible` view to include new tier
3. Update `chat_active_deals` view if needed (usually automatic via INNER JOIN)
4. Re-run verification queries

---

## 🔍 TROUBLESHOOTING

### Issue: Offers Not Appearing in Chat

**Check 1: Is the business eligible?**
```sql
-- Check if business is in business_profiles_chat_eligible
SELECT * FROM business_profiles_chat_eligible 
WHERE business_name = 'BUSINESS_NAME';
```

If not found, business is ineligible (expired trial, unapproved, etc.)

**Check 2: Are the offers valid?**
```sql
-- Check if offers are in chat_active_deals
SELECT * FROM chat_active_deals
WHERE business_name = 'BUSINESS_NAME';
```

If not found, offers are expired or not approved.

**Check 3: Check raw offer data**
```sql
SELECT 
  offer_name,
  status,
  valid_from,
  valid_until,
  CASE
    WHEN status != 'approved' THEN 'NOT_APPROVED'
    WHEN valid_until < NOW() THEN 'EXPIRED'
    WHEN valid_from > NOW() THEN 'FUTURE'
    ELSE 'SHOULD_APPEAR'
  END AS reason
FROM business_offers
WHERE business_id = 'BUSINESS_ID';
```

---

### Issue: Expired Offers Appearing in Chat

**This should NOT happen.** If it does:
1. Check view definition:
   ```sql
   \d+ chat_active_deals
   ```
2. Verify WHERE clause includes date checks
3. Check if `valid_until` column has correct data type (should be TIMESTAMPTZ)
4. Run Query 1 (Verify NO Expired Offers) - if it returns > 0, view is broken

---

### Issue: Wrong Tier Priority

**Check tier_priority values:**
```sql
SELECT 
  business_name,
  effective_tier,
  tier_priority,
  sub_status,
  is_in_free_trial
FROM chat_active_deals
ORDER BY tier_priority
LIMIT 20;
```

Expected:
- spotlight → tier_priority = 1
- featured (paid or trial active) → tier_priority = 2
- starter → tier_priority = 3

---

## ✅ COMPLETION STATUS

| Task | Status |
|------|--------|
| Create `chat_active_deals` view | ✅ COMPLETE |
| Create `get_chat_active_deals()` RPC function | ✅ COMPLETE |
| Update hybrid-chat.ts offer counts query | ✅ COMPLETE |
| Update hybrid-chat.ts wallet actions query | ✅ COMPLETE |
| Update legacy chat.ts wallet actions query | ✅ COMPLETE |
| Create verification queries | ✅ COMPLETE |
| Create test checklist | ✅ COMPLETE |
| Document implementation | ✅ COMPLETE |

**Date Completed:** 2026-01-20  
**Ready for deployment:** ✅ YES

---

## 📞 SUPPORT

If chat shows unexpected offers:
1. Run Query 5 (Identify Excluded Offers) to see what's being filtered and why
2. Check business subscription status in admin CRM
3. Check offer validity dates in database
4. Run drift detector to identify data inconsistencies
5. Check browser console logs for "Tier distribution" message

**Related Documentation:**
- `/CHAT_LOCKDOWN_IMPLEMENTATION.md` - Business eligibility lockdown
- `/SUBSCRIPTION_STATUS_CONSTRAINT.md` - Subscription status rules
- `/ATOMIC_APPROVAL_IMPLEMENTATION.md` - Approval flow

**Contact:** Technical team for deployment support
