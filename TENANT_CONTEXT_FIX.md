# Tenant Context Fix - City Isolation for Chat & Offers

## Problem Summary

The chat API routes were using `createServiceRoleClient()` which **bypasses RLS entirely**. This meant:
- No city isolation at the database level
- Potential for cross-city data leakage
- Expired offers appearing in chat, CRM, and dashboards
- Wrong view name (`chat_active_deals` doesn't exist, should be `business_offers_chat_eligible`)

## What Was Fixed

### 1. Created Server-Side Tenant-Aware Client

**File:** `lib/utils/tenant-security.ts`

Added `createTenantAwareServerClient()` which:
- Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (respects RLS, unlike service_role)
- Calls `set_current_city()` BEFORE any queries
- Throws error if context fails to set (fail-closed)
- Optional dev-mode verification via `get_current_city()`

### 2. Added Debug Function

**File:** `supabase/migrations/20260122000001_add_get_current_city_debug.sql`

Created `get_current_city()` function to verify tenant context is set:
```sql
SELECT public.get_current_city(); -- Should return current city
```

### 3. Fixed All Chat Queries

**Files:**
- `lib/ai/hybrid-chat.ts` (3 instances)
- `lib/ai/chat.ts` (1 instance)
- `app/api/ai/chat-simple/route.ts` (1 instance)

**Changes:**
- ❌ `createServiceRoleClient()` → ✅ `await createTenantAwareServerClient(city)`
- ❌ `.from('chat_active_deals')` → ✅ `.from('business_offers_chat_eligible')`

### 4. Fixed Offers Query Structure

**Old query (WRONG):**
```typescript
.from('chat_active_deals')
.select('offer_id, business_name, city, valid_until')
```

**New query (CORRECT):**
```typescript
.from('business_offers_chat_eligible')
.select(`
  id,
  offer_name,
  offer_value,
  business_id,
  offer_end_date,
  business_profiles!inner(
    business_name,
    city,
    business_tier,
    tier_priority
  )
`)
```

**Why this works:**
- `business_offers_chat_eligible` filters expired offers at the view level
- `!inner` join ensures ONLY eligible businesses (enforces RLS on business_profiles)
- No `eq('city', city)` needed - RLS handles it

## What Still Needs to Be Done

### Step 1: Run the Debug Migration

```bash
# In Supabase SQL Editor or via migration
psql -f supabase/migrations/20260122000001_add_get_current_city_debug.sql
```

### Step 2: Test Tenant Context is Set

Start dev server and send a chat message, check logs for:

```
✅ [TENANT] City context set to: bournemouth
```

If you DON'T see this log, the context isn't being set!

### Step 3: Run the RLS Fix Migration

**ONLY after Step 2 passes**, run the fail-closed RLS migration:

```sql
-- This is in the user's ChatGPT conversation
-- It drops permissive policies and adds city-joined ones
-- DO NOT RUN until tenant context is verified
```

### Step 4: Verify City Isolation

After migration, run:

```sql
-- Simulate Bournemouth context
SELECT set_config('app.current_city','bournemouth', true);
SELECT COUNT(*) FROM business_profiles; -- Should show Bournemouth count
SELECT COUNT(*) FROM business_offers_chat_eligible; -- Should show Bournemouth offers

-- Simulate London context (should return ZERO until you add London data)
SELECT set_config('app.current_city','london', true);
SELECT COUNT(*) FROM business_profiles; -- Should be 0
SELECT COUNT(*) FROM business_offers_chat_eligible; -- Should be 0
```

**Expected:** London sees ZERO Bournemouth data.

### Step 5: Fix Event Hallucinations

If events query returns 0, the model must respond:
> "I don't have event listings loaded right now."

**NOT:**
> "Christmas Market at the pier..." (hallucinated)

Add this guard in chat logic after events fetch.

## Safety Notes

### Service Role vs Anon Client

| Client Type | RLS | Tenant Context | Use Case |
|------------|-----|----------------|----------|
| `createServiceRoleClient()` | ❌ Bypasses RLS | ⚠️ Optional (not enforced) | Admin tools, imports, background jobs |
| `createTenantAwareServerClient()` | ✅ Enforces RLS | ✅ Required (fail-closed) | User-facing queries (chat, discover, offers) |

**Rule:** User-facing reads MUST use tenant-aware anon client. Service role is for admin only.

### What If Data "Disappears"?

If something returns 0 results after the RLS migration, it means:
- That route wasn't setting `app.current_city` (was unsafe)
- Or RLS policy is too strict (needs adjustment)

This is a **GOOD SIGNAL** - it shows you were relying on "app code filters" instead of DB-level security.

## Files Changed

- ✅ `lib/utils/tenant-security.ts` - Added server-side tenant client
- ✅ `lib/ai/hybrid-chat.ts` - Fixed 3 service role → tenant client
- ✅ `lib/ai/chat.ts` - Fixed 1 service role → tenant client
- ✅ `app/api/ai/chat-simple/route.ts` - Fixed 1 service role → tenant client
- ✅ `supabase/migrations/20260122000001_add_get_current_city_debug.sql` - Added debug function

## Next Steps

1. **Test NOW:** Send a chat message, verify `[TENANT] City context set to: bournemouth` in logs
2. **If verified:** Run the RLS migration from ChatGPT conversation
3. **Test again:** Verify no cross-city leakage with SQL above
4. **Then:** Fix event hallucinations, offer expiry emails, CRM date filtering
