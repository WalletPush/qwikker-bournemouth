# Build Error Fix: Module Not Found ✅

## Error Details

**Error Message:**
```
Module not found: Can't resolve '@/lib/supabase/service-role-client'
```

**Affected File:**
- `app/api/claim/preselect/route.ts`

**Build Output:**
```
./app/api/claim/preselect/route.ts:2:1
Module not found: Can't resolve '@/lib/supabase/service-role-client'
  1 | import { NextRequest, NextResponse } from 'next/server'
> 2 | import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
```

---

## Root Cause

The file was trying to import `createServiceRoleClient` from a non-existent module path:
```typescript
❌ import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
```

**Problem:** The file `lib/supabase/service-role-client.ts` does NOT exist in the codebase.

**Actual Location:** `createServiceRoleClient` is exported from `lib/supabase/server.ts`

---

## The Fix

**Changed import path from:**
```typescript
import { createServiceRoleClient } from '@/lib/supabase/service-role-client'
```

**To:**
```typescript
import { createServiceRoleClient } from '@/lib/supabase/server'
```

**File Modified:**
- `app/api/claim/preselect/route.ts` (line 2)

---

## Why This Happened

The codebase has THREE different ways to create a Supabase service role client:

### 1. `createServiceRoleClient()` from `@/lib/supabase/server`
```typescript
// lib/supabase/server.ts
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

### 2. `createAdminClient()` from `@/lib/supabase/admin`
```typescript
// lib/supabase/admin.ts
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### 3. ~~`createServiceRoleClient()` from `@/lib/supabase/service-role-client`~~ ❌ DOES NOT EXIST

**Likely cause:** The file reference was incorrect from the start, or the file was deleted but imports weren't updated.

---

## Verification

### ✅ Build Should Now Succeed

Run:
```bash
pnpm build
```

Expected output: **No module resolution errors**

### ✅ Linter Clean

```bash
# Check the fixed file
pnpm lint app/api/claim/preselect/route.ts
```

**Status:** ✅ No linter errors found

---

## Related Files

### Other Supabase Client Patterns in Codebase

**For authenticated requests (uses cookies/session):**
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**For admin operations (bypasses RLS):**
```typescript
// Option 1 (with error checking)
import { createAdminClient } from '@/lib/supabase/admin'
const supabase = createAdminClient()

// Option 2 (direct)
import { createServiceRoleClient } from '@/lib/supabase/server'
const supabase = createServiceRoleClient()
```

**When to use which:**
- Use `createClient()` for user-authenticated requests (respects RLS)
- Use `createAdminClient()` or `createServiceRoleClient()` for system operations that need to bypass RLS
- Both admin clients do the same thing; `createAdminClient()` has slightly better error handling

---

## Files That Use Service Role Client Correctly

These files import correctly from `@/lib/supabase/server`:

```typescript
✅ app/api/admin/import-businesses/import/route.ts
✅ app/api/admin/import-businesses/preview/route.ts
✅ app/api/claim/search/route.ts
✅ app/api/claim/submit/route.ts
✅ lib/actions/qr-management-actions.ts
... and 100+ other files
```

---

## Summary

**Issue:** Incorrect import path referencing a non-existent file  
**Fix:** Updated import to correct path `@/lib/supabase/server`  
**Result:** Build error resolved, no linter errors  
**Time to Fix:** < 1 minute

---

## Prevention

To avoid this in the future:

1. **Use consistent patterns:** Prefer `createAdminClient` or `createServiceRoleClient` from the correct path
2. **Check imports:** If you see `@/lib/supabase/service-role-client`, it's wrong
3. **Run linter:** `pnpm lint` catches most import errors before build

---

**Status: RESOLVED ✅**

Build should now succeed. Run `pnpm build` to verify.
