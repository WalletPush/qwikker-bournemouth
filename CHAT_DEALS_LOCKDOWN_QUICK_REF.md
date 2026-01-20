# CHAT DEALS LOCKDOWN - QUICK REFERENCE

**Status:** ✅ COMPLETE  
**Date:** 2026-01-20

---

## 🎯 WHAT WAS FIXED

1. **Expired Offers:** Chat was showing offers past their `valid_until` date
2. **Ineligible Business Offers:** Chat was showing offers from expired trial businesses (Julie's Sports Pub, Venezy Burgers)
3. **No Date Checks:** `valid_until` and `valid_from` were ignored
4. **No Subscription Check:** Only checked offer status, not business eligibility

---

## ✅ SOLUTION

Created `chat_active_deals` view that:
- INNER JOIN with `business_profiles_chat_eligible` (ensures only eligible businesses)
- Enforces `valid_until >= NOW()` and `valid_from <= NOW()`
- Excludes expired trials, auto-imported, unapproved businesses
- Returns `effective_tier`, `tier_priority` for sorting

---

## 📁 FILES CHANGED

1. **`/supabase/migrations/20260120000003_chat_active_deals_view.sql`** - Creates view + RPC
2. **`/lib/ai/hybrid-chat.ts`** - Uses `chat_active_deals` instead of `business_offers` (3 locations)
3. **`/lib/ai/chat.ts`** - Uses `chat_active_deals` instead of `business_offers`

---

## 🚀 DEPLOYMENT

```bash
cd /Users/qwikker/qwikkerdashboard

# Apply migration
supabase db push

# Verify
psql YOUR_DB_URL -c "SELECT COUNT(*) FROM chat_active_deals;"
```

---

## 🧪 VERIFICATION (Quick)

```sql
-- 1. Should return 0 (NO expired offers)
SELECT COUNT(*) FROM chat_active_deals 
WHERE valid_until IS NOT NULL AND valid_until < NOW();

-- 2. Should return 0 (NO expired trial offers)
SELECT COUNT(*) FROM chat_active_deals 
WHERE is_in_free_trial = true AND free_trial_end_date < NOW();

-- 3. Show tier distribution (should only be spotlight/featured/starter)
SELECT effective_tier, COUNT(*) FROM chat_active_deals GROUP BY 1;

-- 4. Check specific business (should return 0 offers if trial expired)
SELECT COUNT(*) FROM chat_active_deals 
WHERE business_name IN ('Julie''s Sports Pub', 'Venezy Burgers');
```

---

## 📊 EXPECTED RESULTS

### Chat Active Deals Eligibility
- **Business:** Must be in `business_profiles_chat_eligible` (approved + subscribed + not expired)
- **Offer:** `valid_until >= NOW()` AND `valid_from <= NOW()` AND `status='approved'`

### Excluded
- Expired offers (`valid_until < NOW()`)
- Future offers (`valid_from > NOW()`)
- Offers from expired trial businesses
- Offers from auto-imported unclaimed businesses
- Offers from unapproved businesses

---

## 🔍 TROUBLESHOOTING

**If offers don't appear:**
```sql
-- Check business eligibility
SELECT * FROM business_profiles_chat_eligible WHERE business_name = 'NAME';

-- Check offer validity
SELECT offer_name, valid_until FROM business_offers WHERE business_id = 'ID';

-- Check if in chat_active_deals
SELECT * FROM chat_active_deals WHERE business_name = 'NAME';
```

**If expired offers appear (shouldn't happen):**
- View is broken, check definition
- Run verification Query 1 above

---

## 📖 FULL DOCS

See: `/CHAT_DEALS_LOCKDOWN.md` for complete documentation.
