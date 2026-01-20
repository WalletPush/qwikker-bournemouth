# CHAT LOCKDOWN - QUICK REFERENCE

**Status:** ✅ COMPLETE  
**Date:** 2026-01-20

---

## 🎯 WHAT WAS FIXED

1. **NEON NEXUS Bug:** Trial subscriptions were being created with wrong `tier_id` (pointed to 'starter' instead of 'trial')
2. **Stale Column Usage:** Chat code was using `business_profiles.business_tier` instead of subscription data
3. **Free Listing Leakage:** No enforcement that businesses must have valid subscriptions to appear in chat

---

## ✅ SOLUTION

Created `business_profiles_chat_eligible` view that:
- Joins `business_profiles` + `business_subscriptions` + `subscription_tiers`
- Computes `effective_tier` from subscription (NOT from stale `business_tier` column)
- Enforces: `status='approved'` + valid subscription + (paid active OR trial active)
- Excludes: unclaimed, pending_claim, claimed_free, incomplete, expired trials, no subscription

---

## 📁 FILES CHANGED

1. **`/supabase/migrations/20260120000001_fix_trial_tier_mismatch.sql`** - Fixes NEON NEXUS data
2. **`/supabase/migrations/20260120000002_chat_eligible_view.sql`** - Creates new view
3. **`/lib/actions/admin-crm-actions.ts`** - Fixed tier lookup bug + added guard
4. **`/lib/ai/hybrid-chat.ts`** - Uses new view instead of `business_profiles_ai_eligible`
5. **`/lib/ai/chat.ts`** - Uses new view instead of `business_profiles`

---

## 🚀 DEPLOYMENT

```bash
cd /Users/qwikker/qwikkerdashboard

# Apply migrations
supabase db push

# Verify
psql YOUR_DB_URL -c "SELECT COUNT(*) FROM business_profiles_chat_eligible;"
```

---

## 🧪 VERIFICATION (Quick)

```sql
-- Should return 0 (NO free listings in chat)
SELECT COUNT(*) FROM business_profiles_chat_eligible 
WHERE effective_tier IS NULL OR sub_tier_name IS NULL OR status != 'approved';

-- Should show tier distribution (spotlight, featured, starter ONLY)
SELECT effective_tier, COUNT(*) FROM business_profiles_chat_eligible GROUP BY 1;
```

---

## 📊 EXPECTED RESULTS

### Chat Eligibility
- **Spotlight (Qwikker Picks):** Paid active, tier_name='spotlight'
- **Featured:** Paid active, tier_name='featured' OR trial active
- **Starter:** Paid active, tier_name='starter'

### Excluded
- All unclaimed/imported businesses (no subscription)
- Expired trials (free_trial_end_date < now)
- Unapproved businesses (status != 'approved')
- Businesses with status IN ('claimed_free', 'incomplete', 'pending_claim')

---

## 🔍 TROUBLESHOOTING

**If a business should appear but doesn't:**
```sql
-- Check eligibility status
SELECT * FROM business_profiles_chat_eligible WHERE business_name = 'NAME';

-- If not found, check why:
SELECT 
  bp.business_name,
  bp.status,
  bs.status AS sub_status,
  bs.is_in_free_trial,
  bs.free_trial_end_date,
  st.tier_name
FROM business_profiles bp
LEFT JOIN business_subscriptions bs ON bs.business_id = bp.id
LEFT JOIN subscription_tiers st ON st.id = bs.tier_id
WHERE bp.business_name = 'NAME';
```

**If a business appears but shouldn't:**
- This shouldn't happen - view filters strictly
- If it does, check view definition for bugs

---

## 📖 FULL DOCS

See: `/CHAT_LOCKDOWN_IMPLEMENTATION.md` for complete documentation.
