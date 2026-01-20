# KB DROPDOWN LOCKDOWN - QUICK REFERENCE

**Status:** ✅ COMPLETE  
**Date:** 2026-01-20

---

## 🎯 WHAT WAS FIXED

1. **KB Dropdown Showed Ineligible Businesses:** Including claimed_free, auto-imported, expired trials
2. **Client-Side Filtering:** Slow, unreliable, inconsistent with chat
3. **No Subscription Check:** Only checked status, not subscription validity

---

## ✅ SOLUTION

Created `business_profiles_kb_eligible` view that:
- Aliases `business_profiles_chat_eligible` (keeps KB and chat in sync)
- Returns ONLY businesses with paid active OR trial active subscriptions
- Excludes: unclaimed, claimed_free, auto-imported, expired trials, unapproved

**Result:** "Select Target for Knowledge Base" dropdown now ONLY shows eligible businesses.

---

## 📁 FILES CHANGED

1. **`/supabase/migrations/20260120000004_kb_eligible_view.sql`** - Creates view + RPC
2. **`/app/api/admin/kb-eligible/route.ts`** - API endpoint to fetch eligible businesses
3. **`/components/admin/admin-dashboard.tsx`** - Updated dropdown to use API + added debug label

---

## 🚀 DEPLOYMENT

```bash
cd /Users/qwikker/qwikkerdashboard

# Apply migration
supabase db push

# Verify
psql YOUR_DB_URL -c "SELECT COUNT(*) FROM business_profiles_kb_eligible;"
```

---

## 🧪 VERIFICATION (Quick)

```sql
-- 1. Should return count < total "Live Businesses"
SELECT COUNT(*) FROM business_profiles_kb_eligible;

-- 2. Should return 0 (NO claimed_free)
SELECT COUNT(*) FROM business_profiles_kb_eligible bke
JOIN business_profiles bp ON bp.id = bke.id
WHERE bp.status = 'claimed_free';

-- 3. Should return 0 (NO expired trials)
SELECT COUNT(*) FROM business_profiles_kb_eligible 
WHERE is_in_free_trial = true AND free_trial_end_date < NOW();
```

---

## 📊 EXPECTED RESULTS

### KB Eligibility
- **Included:** Approved + Subscribed (paid active OR trial active)
- **Excluded:** claimed_free, unclaimed, auto-imported, expired trials, unapproved

### Debug Label (Dev Mode)
- Shows: `✅ X eligible (paid/trial only)`
- Helper text: "Only businesses with active paid subscriptions or trials..."

---

## 🔍 TROUBLESHOOTING

**If dropdown shows 0 businesses:**
```sql
-- Check view has data
SELECT COUNT(*) FROM business_profiles_kb_eligible;

-- If 0, check if any businesses have subscriptions
SELECT COUNT(*) FROM business_subscriptions;
```

**If ineligible business appears:**
- This shouldn't happen - view is strict
- Check if migration applied: `\d business_profiles_kb_eligible`
- Re-apply migration if needed

---

## 📖 FULL DOCS

See: `/KB_DROPDOWN_LOCKDOWN.md` for complete documentation.
