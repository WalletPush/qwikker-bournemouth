# Before You Commit - Tenant Context Fix

## ✅ Pre-Commit Checklist

Run these checks BEFORE committing the tenant context fix:

### 1. Run the Debug Migration ✅

```bash
# In Supabase SQL Editor, run:
cat supabase/migrations/20260122000001_add_get_current_city_debug.sql
```

Or via CLI:
```bash
supabase db push
```

**Verify:** Function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_current_city';
-- Should return: get_current_city
```

---

### 2. Test Chat with Debug Logs ✅

```bash
pnpm dev
```

Open chat at `http://localhost:3000/user/chat` and send:
```
show me restaurants
```

**Check terminal for BOTH logs:**

```
✅ [TENANT] City context set to: bournemouth
🔒 [TENANT DEBUG] current city = bournemouth
```

**If missing:**
- Missing first log = `createTenantAwareServerClient()` not being called
- Missing second log = `get_current_city()` RPC failing
- STOP and debug before continuing

---

### 3. Test Offers Query ✅

In chat, send:
```
any offers?
```

**Check terminal for:**
- ✅ Log shows `business_offers_chat_eligible` (NOT `chat_active_deals`)
- ✅ NO errors about "relation does not exist"
- ✅ NO expired offers in results (check offer end dates)

**Verify in response:**
- ✅ Only shows active offers
- ✅ NO Julie's Sports Pub (if trial expired)
- ✅ Business names appear correctly

---

### 4. Run SQL Verification ✅

In Supabase SQL Editor:
```bash
cat scripts/verify-tenant-context.sql
```

**Must pass ALL checks:**
- ✅ `get_current_city()` returns 'bournemouth'
- ✅ Bournemouth profiles > 0
- ✅ London profiles = 0
- ✅ NO expired offers in `business_offers_chat_eligible`
- ✅ Offers join with business_profiles works

---

### 5. Check for Linter Errors ✅

```bash
pnpm lint
```

**Expected:** Zero errors in:
- `lib/utils/tenant-security.ts`
- `lib/ai/hybrid-chat.ts`
- `lib/ai/chat.ts`
- `app/api/ai/chat-simple/route.ts`

---

## 🔴 STOP - Do NOT Commit If:

❌ Missing either debug log in chat
❌ Chat returns "relation does not exist" error
❌ Expired offers still appearing
❌ SQL verification fails any check
❌ Linter errors present

## ✅ Safe to Commit If:

✅ Both debug logs appear for every chat message
✅ Offers query uses correct view (`business_offers_chat_eligible`)
✅ NO expired offers in results
✅ SQL verification passes ALL checks
✅ Zero linter errors

---

## 📦 What's Being Committed

### New Files:
- `supabase/migrations/20260122000001_add_get_current_city_debug.sql`
- `scripts/verify-tenant-context.sql`
- `TENANT_CONTEXT_FIX.md`
- `QUICK_START_TENANT_FIX.md`
- `BEFORE_COMMIT_CHECKLIST.md`

### Modified Files:
- `lib/utils/tenant-security.ts` - Added `createTenantAwareServerClient()`
- `lib/ai/hybrid-chat.ts` - Replaced service role with tenant client (3x)
- `lib/ai/chat.ts` - Replaced service role with tenant client (1x)
- `app/api/ai/chat-simple/route.ts` - Replaced service role with tenant client (1x)

### What's NOT Included (Yet):
- ⚠️ RLS migration (run manually AFTER this commit)
- ⚠️ CRM offers fix (separate PR)
- ⚠️ Dashboard offers fix (separate PR)
- ⚠️ Event hallucination fix (separate PR)

---

## 🚀 After Commit

1. **Merge to main** (or deploy to staging)
2. **Run RLS migration** (from `QUICK_START_TENANT_FIX.md`)
3. **Verify again** with `scripts/verify-tenant-context.sql`
4. **Then** tackle CRM, dashboard, and event fixes

---

## 🆘 If Something Breaks After Commit

### Chat returns empty results

**Rollback command:**
```bash
git revert HEAD
```

**Then debug:** Which route is failing? Check Network tab for the exact API endpoint.

### "Tenant context required" error

**Quick fix:**
```sql
-- Temporarily disable fail-closed mode
-- Update createTenantAwareServerClient to log error but continue
```

**Proper fix:** Debug why `get_current_city()` is failing. Check:
- Function exists in DB
- User has execute permission
- `set_current_city()` was called first

---

## 📞 Need Help?

Check these files:
1. `TENANT_CONTEXT_FIX.md` - Full technical docs
2. `QUICK_START_TENANT_FIX.md` - Step-by-step guide
3. `scripts/verify-tenant-context.sql` - Test suite
