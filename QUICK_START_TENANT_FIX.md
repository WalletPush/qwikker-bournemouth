# Quick Start: Tenant Context Fix

## ✅ What I Fixed (Already Done)

1. **Created tenant-aware server client** (`lib/utils/tenant-security.ts`)
   - Uses anon key (respects RLS)
   - Sets `app.current_city` before any queries
   - Fails closed if context can't be set

2. **Replaced all service role clients in chat**
   - `lib/ai/hybrid-chat.ts` ✅
   - `lib/ai/chat.ts` ✅
   - `app/api/ai/chat-simple/route.ts` ✅

3. **Fixed offers queries**
   - ❌ `chat_active_deals` (doesn't exist)
   - ✅ `business_offers_chat_eligible` (correct view)
   - ✅ Added join to `business_profiles` for tier/city info

4. **Created debug/verification tools**
   - `supabase/migrations/20260122000001_add_get_current_city_debug.sql`
   - `scripts/verify-tenant-context.sql`
   - `TENANT_CONTEXT_FIX.md` (full documentation)

## 🎯 What You Need to Do NOW (In Order)

### Step 1: Run the Debug Migration (30 seconds)

```bash
cd /Users/qwikker/qwikkerdashboard

# Option A: Via Supabase CLI
supabase db push

# Option B: Via SQL Editor
# Paste contents of supabase/migrations/20260122000001_add_get_current_city_debug.sql
```

This adds `get_current_city()` function for debugging.

### Step 2: Test Dev Server (2 minutes)

```bash
pnpm dev
```

Open chat, send ANY message (e.g., "show me restaurants").

**Look for BOTH of these logs:**
```
✅ [TENANT] City context set to: bournemouth
🔒 [TENANT DEBUG] current city = bournemouth
```

The first log comes from `createTenantAwareServerClient()` (during client creation).
The second log comes from the chat API (after client is created, verifying context persists).

**If you DON'T see BOTH logs:** Something's wrong with tenant context setup - STOP HERE, debug before continuing.

**If you DO see BOTH:** ✅ Continue to Step 3.

### Step 3: Run Verification SQL (2 minutes)

In Supabase SQL Editor, paste and run:

```bash
cat scripts/verify-tenant-context.sql
```

**Check:**
- ✅ `get_current_city()` returns 'bournemouth'
- ✅ Bournemouth profiles > 0
- ✅ London profiles = 0
- ✅ NO expired offers in results

**If ANY check fails:** STOP, fix it before running RLS migration.

### Step 4: Run RLS Migration (5 minutes)

**ONLY if Steps 1-3 passed!**

Paste this in Supabase SQL Editor:

```sql
begin;

-- =========================
-- BUSINESS_PROFILES (fix)
-- =========================

drop policy if exists "Anyone can read discoverable businesses" on public.business_profiles;
drop policy if exists "Tenant isolation for business_profiles" on public.business_profiles;

create policy "Public can read discoverable businesses in current city"
on public.business_profiles
for select
to public
using (
  current_setting('role', true) = 'service_role'
  OR (
    current_setting('app.current_city', true) is not null
    AND city = current_setting('app.current_city', true)
    AND status = any (array['approved','unclaimed','claimed_free'])
  )
);

-- =========================
-- BUSINESS_OFFERS (fix)
-- =========================

drop policy if exists "Allow anon and authenticated users to read approved offers" on public.business_offers;

create policy "Public can read approved offers in current city"
on public.business_offers
for select
to anon, authenticated
using (
  current_setting('role', true) = 'service_role'
  OR (
    status = 'approved'
    AND current_setting('app.current_city', true) is not null
    AND exists (
      select 1
      from public.business_profiles bp
      where bp.id = business_offers.business_id
        and bp.city = current_setting('app.current_city', true)
        and bp.status = any (array['approved','unclaimed','claimed_free'])
    )
  )
);

-- =========================
-- BUSINESS_EVENTS (fix)
-- =========================

drop policy if exists "Public can view approved and upcoming events" on public.business_events;

create policy "Public can view approved and upcoming events in current city"
on public.business_events
for select
to public
using (
  current_setting('role', true) = 'service_role'
  OR (
    status = 'approved'
    AND event_date >= now()::date
    AND current_setting('app.current_city', true) is not null
    AND exists (
      select 1
      from public.business_profiles bp
      where bp.id = business_events.business_id
        and bp.city = current_setting('app.current_city', true)
        and bp.status = any (array['approved','unclaimed','claimed_free'])
    )
  )
);

commit;
```

### Step 5: Verify Again (2 minutes)

Re-run `scripts/verify-tenant-context.sql`.

**Check:**
- ✅ London still sees ZERO Bournemouth data
- ✅ NO cross-city leakage
- ✅ Chat still works in Bournemouth

### Step 6: Test Chat (2 minutes)

Send these messages:
- "any offers?"
- "show me restaurants"
- "what events are on?"

**Expected:**
- ✅ NO expired offers appear
- ✅ NO businesses from other cities
- ✅ NO Christmas Market hallucinations (unless real event exists)

## 🚨 What If Things Break?

### Chat returns empty results

**Cause:** Route isn't setting tenant context.

**Fix:** Check which route is being used (look at Network tab), verify it's calling `createTenantAwareServerClient(city)`.

### "Tenant context required - access denied" error

**Cause:** `getFranchiseCityFromRequest()` failing or `set_current_city` RPC failing.

**Fix:** Check logs for exact error. Verify `set_current_city()` function exists in DB.

### Offers/events still showing expired data

**Cause:** Cached old query results or using wrong view.

**Fix:** Hard refresh (Cmd+Shift+R), check code is using `business_offers_chat_eligible`, not `chat_active_deals`.

## 📝 Summary

| File | Change | Status |
|------|--------|--------|
| `lib/utils/tenant-security.ts` | Added `createTenantAwareServerClient()` | ✅ |
| `lib/ai/hybrid-chat.ts` | Service role → Tenant client (3x) | ✅ |
| `lib/ai/chat.ts` | Service role → Tenant client (1x) | ✅ |
| `app/api/ai/chat-simple/route.ts` | Service role → Tenant client (1x) | ✅ |
| `supabase/migrations/...` | Added `get_current_city()` | 🔄 Run Step 1 |
| RLS Policies | City isolation enforcement | 🔄 Run Step 4 |

## Next After This Works

1. Fix CRM to use `business_offers_chat_eligible` view
2. Fix dashboard to use `business_offers_chat_eligible` view
3. Add "expiring soon" email notifications
4. Add "past offers" section like events
5. Fix event hallucinations with hard guard
