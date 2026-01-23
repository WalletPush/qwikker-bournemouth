# 🧪 TEST NOW - Immediate Action Required

## What I Just Added

✅ **Tenant context verification in chat API**

Added to `lib/ai/hybrid-chat.ts` (line 141):
```typescript
const { data: currentCity } = await supabase.rpc('get_current_city')
console.log('🔒 [TENANT DEBUG] current city =', currentCity)
```

This will prove tenant context is being set BEFORE any queries run.

---

## 🚀 What You Need to Do RIGHT NOW (5 minutes)

### Step 1: Run the Debug Migration (30 seconds)

**Option A - Supabase Dashboard:**
1. Go to SQL Editor
2. Paste this:

```sql
-- Migration: Add debug function to verify city context is set
create or replace function public.get_current_city()
returns text
language sql
stable
security definer
as $$
  select current_setting('app.current_city', true);
$$;

grant execute on function public.get_current_city() to anon, authenticated, service_role;
```

3. Click "Run"

**Option B - CLI:**
```bash
cd /Users/qwikker/qwikkerdashboard
supabase db push
```

---

### Step 2: Start Dev Server and Test Chat (2 minutes)

```bash
pnpm dev
```

Open: `http://localhost:3000/user/chat`

Send ANY message (e.g., "show me restaurants")

---

### Step 3: Look for BOTH Debug Logs 👀

**Your terminal MUST show:**

```
✅ [TENANT] City context set to: bournemouth
🔒 [TENANT DEBUG] current city = bournemouth
```

**What each log means:**
- First log = Context was SET during client creation
- Second log = Context PERSISTS and is readable by queries

---

## ✅ SUCCESS - If You See Both Logs

1. ✅ Tenant context is working correctly
2. ✅ Safe to run RLS migration later
3. ✅ Ready to commit this fix

**Next steps:**
- Read `BEFORE_COMMIT_CHECKLIST.md` for full verification
- Then commit with message: `fix: enforce tenant context for chat API (city isolation)`

---

## 🚨 FAILURE - If You're Missing a Log

### Missing BOTH logs?

**Problem:** `createTenantAwareServerClient()` isn't being called at all.

**Check:** Is the chat route using the old `createServiceRoleClient()`?

**Fix:** Verify `lib/ai/hybrid-chat.ts` line 138 says:
```typescript
const supabase = await createTenantAwareServerClient(city)
```

---

### Missing FIRST log?

**Problem:** `set_current_city()` is failing silently.

**Check terminal for:**
```
🚨 SECURITY: Failed to set city context: [error]
```

**Common causes:**
- `set_current_city()` function doesn't exist in DB (run Step 1)
- Permission denied (unlikely if service_role exists)
- City detection failing (`getFranchiseCityFromRequest()` error)

---

### Missing SECOND log?

**Problem:** `get_current_city()` function doesn't exist.

**Fix:** Run the debug migration again (Step 1).

**Verify function exists:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_current_city';
```

Should return: `get_current_city`

---

## 📋 Quick Test Script

Copy-paste this into terminal after starting dev:

```bash
# Start server
pnpm dev

# In another terminal, test the API directly:
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"show me restaurants","city":"bournemouth"}'

# Check logs in first terminal for:
# ✅ [TENANT] City context set to: bournemouth
# 🔒 [TENANT DEBUG] current city = bournemouth
```

---

## 🎯 What This Proves

| Log Present | What It Means |
|-------------|---------------|
| ✅ Both logs | Tenant context working correctly - SAFE to continue |
| ⚠️ First log only | `set_current_city()` works but `get_current_city()` missing - Run migration |
| ⚠️ Second log only | Impossible - context can't be read if never set |
| ❌ Neither log | `createTenantAwareServerClient()` not being used - Check imports |

---

## 🔄 After Verification

Once BOTH logs appear:

1. ✅ Run SQL verification: `scripts/verify-tenant-context.sql`
2. ✅ Test offers query: Send "any offers?" in chat
3. ✅ Check `BEFORE_COMMIT_CHECKLIST.md` for full tests
4. ✅ Commit when all green

---

## 📁 Quick Reference Files

| File | Purpose |
|------|---------|
| **`TEST_NOW.md`** | ⭐ **YOU ARE HERE** - Immediate test steps |
| `BEFORE_COMMIT_CHECKLIST.md` | Full pre-commit verification |
| `QUICK_START_TENANT_FIX.md` | Step-by-step guide with RLS migration |
| `TENANT_CONTEXT_FIX.md` | Complete technical documentation |
| `scripts/verify-tenant-context.sql` | SQL test suite |

---

## ⏱️ Time Budget

- Step 1 (migration): 30 seconds
- Step 2 (test chat): 2 minutes
- Step 3 (verify logs): 10 seconds

**Total: ~3 minutes to confirm it works**

---

## 🚀 START NOW

```bash
# 1. Run migration (Supabase SQL Editor)
# 2. Start dev server
pnpm dev

# 3. Open chat and send a message
# 4. Check terminal for BOTH debug logs
```

**If BOTH logs appear → You're done with this step! ✅**

**If missing logs → Debug using failure section above ⚠️**
