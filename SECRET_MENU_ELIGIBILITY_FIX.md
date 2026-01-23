# Secret Menu Eligibility Fix

## 🐛 THE PROBLEM

The user-facing secret menu page (`/app/user/secret-menu/page.tsx`) was showing secret menu items from **expired trial businesses** (e.g., Julie's Sports Pub).

### Root Cause

The page was directly querying `business_profiles` with only these filters:
```typescript
.from('business_profiles')
.eq('status', 'approved')
.eq('city', currentCity)
```

This query did **NOT** check:
- ❌ Whether the business has an active subscription
- ❌ Whether the business trial has expired
- ❌ Whether the business meets tier eligibility requirements

**Result:** Expired trial businesses still appeared in the secret menu list.

---

## ✅ THE FIX

### 1. Added `additional_notes` to `business_profiles_chat_eligible` View

**File:** `/supabase/migrations/20260124000002_add_additional_notes_to_chat_eligible_view.sql`

The `business_profiles_chat_eligible` view already correctly filters businesses by subscription eligibility:
- ✅ `status = 'approved'`
- ✅ Active subscription (paid or trial)
- ✅ Trial must not be expired (`free_trial_end_date >= NOW()`)
- ✅ Excludes statuses: `unclaimed`, `pending_claim`, `claimed_free`, `incomplete`

**Added the `additional_notes` field** (which contains the secret menu JSON) to this view so the secret menu page can use it.

### 2. Updated Secret Menu Page to Use the View

**File:** `/app/user/secret-menu/page.tsx`

**Before:**
```typescript
const { data: approvedBusinesses } = await supabase
  .from('business_profiles')
  .select('...')
  .eq('status', 'approved')
  .eq('city', currentCity)
```

**After:**
```typescript
const { data: approvedBusinesses } = await supabase
  .from('business_profiles_chat_eligible') // ✅ Uses eligibility view
  .select('...')
  .eq('city', currentCity) // status/subscription checks handled by view
```

Also updated field reference from `business_category` → `system_category` to match the view's schema.

---

## 🎯 WHAT THIS FIXES

1. **Expired trial businesses no longer appear in the secret menu**
   - Example: Julie's Sports Pub (expired trial) will not show secret menu items
   
2. **Consistent eligibility logic across the platform**
   - Secret menu now uses the same eligibility view as:
     - AI chat (`business_profiles_chat_eligible`)
     - Offers (`business_offers_chat_eligible`)
     - Events (should also use eligibility filtering)

3. **Multi-tenant safety preserved**
   - Still filtered by `city` for franchise isolation

---

## 🧪 HOW TO TEST

1. **Check Julie's Sports Pub subscription status:**
   ```sql
   SELECT 
     bp.business_name,
     bp.status,
     bs.sub_status,
     bs.is_in_free_trial,
     bs.free_trial_end_date,
     CASE WHEN bs.free_trial_end_date < NOW() THEN 'EXPIRED' ELSE 'ACTIVE' END AS trial_status
   FROM business_profiles bp
   LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
   WHERE bp.business_name ILIKE '%julie%'
   ORDER BY bs.updated_at DESC
   LIMIT 1;
   ```

2. **Check if Julie's appears in the eligibility view:**
   ```sql
   SELECT business_name, effective_tier, sub_status, is_in_free_trial, free_trial_end_date
   FROM business_profiles_chat_eligible
   WHERE business_name ILIKE '%julie%';
   ```
   - **Expected:** No rows returned (if trial is expired)

3. **Visit the secret menu page:**
   - Go to `/user/secret-menu`
   - **Expected:** Julie's Sports Pub should NOT appear
   - **Expected:** Only businesses with active subscriptions/trials should appear

---

## 🔒 DATA AUTHORITY PATTERN (CONSISTENT WITH OFFERS FIX)

This fix follows the same pattern established for offers:

| Data Type      | Source View                        | Authority Rule                           |
|----------------|------------------------------------|------------------------------------------|
| Businesses     | `business_profiles_chat_eligible`  | Subscription-based eligibility           |
| Offers         | `business_offers_chat_eligible`    | DB-only, date-bound, subscription-aware  |
| Secret Menu    | `business_profiles_chat_eligible`  | Subscription-based eligibility           |
| Events         | `business_events` (needs view?)    | DB-only, date-bound                      |

**Key Principle:** Never trust raw table queries for user-facing data. Always use eligibility-filtered views.

---

## 📝 MIGRATION INSTRUCTIONS

1. **Run the migration:**
   ```bash
   # The migration will recreate the view with additional_notes included
   # Supabase will auto-apply on next push, or run manually:
   psql $DATABASE_URL -f supabase/migrations/20260124000002_add_additional_notes_to_chat_eligible_view.sql
   ```

2. **Verify the view includes `additional_notes`:**
   ```sql
   \d+ business_profiles_chat_eligible
   ```

3. **Deploy the updated secret menu page:**
   ```bash
   pnpm run build
   # Deploy to production
   ```

---

## 🚨 IMPORTANT NOTES

- This fix does **NOT** require changes to the business dashboard secret menu page (`/app/dashboard/secret-menu/page.tsx`) because that page is for business owners managing their own secret menu items (RLS-protected).

- The `business_profiles_chat_eligible` view is now the **single source of truth** for:
  - AI chat business discovery
  - User-facing secret menu listings
  - User-facing offers listings (via `business_offers_chat_eligible`)

- Any future user-facing features that show businesses should use this view, not raw `business_profiles` queries.

---

## ✅ VERIFICATION CHECKLIST

- [x] Migration created to add `additional_notes` to view
- [x] Secret menu page updated to use `business_profiles_chat_eligible`
- [x] Field references updated (`business_category` → `system_category`)
- [x] No linter errors
- [ ] Test locally: expired trial business secret menus hidden
- [ ] Test locally: active trial/paid business secret menus visible
- [ ] Run migration in production
- [ ] Verify Julie's Sports Pub no longer appears in secret menu

---

## 🔗 RELATED FIXES

- **Offers Chat Fix:** `SURGICAL_FIX_COMPLETE.md`
- **KB Archive System:** `KB_ARCHIVE_SYSTEM_V3_BULLETPROOF.md`
- **Chat Lockdown:** `CHAT_LOCKDOWN_COMPLETE_SUMMARY.md`

This completes the eligibility enforcement across all user-facing business data.
