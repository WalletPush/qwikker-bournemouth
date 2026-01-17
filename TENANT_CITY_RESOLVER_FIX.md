# Centralized Tenant City Resolution Fix

## Problem Statement

Localhost and Vercel preview deployments were failing with:
```
[Tenant Config] No city detected. Hostname: localhost:3000, Fallback: true
```

The issue was caused by:
1. **Duplicate city resolution logic** scattered across multiple API routes
2. **No fallback mechanism** for development/staging environments
3. **Inconsistent security model** - some routes allowed query overrides, others didn't

---

## Solution: Centralized City Resolver

Created a single source of truth for tenant city resolution with multi-tenant security.

### New File: `lib/utils/tenant-city.ts`

**Key Functions**:

#### `resolveRequestCity(request, opts?)`
Resolves city with the following priority:
1. **Hostname** (e.g., `bournemouth.qwikker.com` → `'bournemouth'`)
2. **Query param** (only on fallback hosts if `allowQueryOverride: true`)
3. **Environment variable** (`DEV_DEFAULT_CITY`, only on fallback hosts)
4. **Error** with helpful message

**Returns**:
```typescript
// Success
{ ok: true, city: 'bournemouth', source: 'hostname', hostname: '...', fallback: false }

// Failure
{ ok: false, status: 400, error: 'No city detected. On localhost...' }
```

#### `isFallbackHost(hostname)`
Checks if hostname is a development/staging environment:
- `localhost` (any port)
- `*.vercel.app` (Vercel previews)
- `app.qwikker.com` (staging)
- `qwikkerdashboard-theta.vercel.app` (specific preview)

#### `normalizeCity(input)`
Normalizes city string to lowercase, trimmed format.

---

## Security Model

### Production Subdomains (e.g., `bournemouth.qwikker.com`)
✅ **City derived from hostname** (authoritative source)  
❌ **Query override rejected** with 403 error  
❌ **Environment variable ignored**

**Example**:
```
bournemouth.qwikker.com?city=london
→ 403: "City override is not allowed on this host"
```

### Fallback Hosts (localhost, Vercel preview)
✅ **Query override allowed** (if explicitly enabled via `allowQueryOverride: true`)  
✅ **Environment variable fallback** (`DEV_DEFAULT_CITY`)  
❌ **No implicit defaults**

**Example**:
```
localhost:3000?city=bournemouth → OK (source: 'query')
localhost:3000 with DEV_DEFAULT_CITY=bournemouth → OK (source: 'env')
localhost:3000 without either → 400 with helpful message
```

---

## Updated Routes

### 1. `/app/api/tenant/config/route.ts`
**Purpose**: Returns public Google Places configuration

**Changes**:
- ✅ Removed duplicate `getCityFromHostname()` and `isFallbackHost()` functions
- ✅ Now uses `resolveRequestCity(request, { allowQueryOverride: true })`
- ✅ Returns helpful error messages with status codes
- ✅ Adds `meta.source` field for debugging (DEV-friendly)

**Usage**:
```typescript
// Production
GET bournemouth.qwikker.com/api/tenant/config
→ { ok: true, city: 'bournemouth', ... }

// Localhost
GET localhost:3000/api/tenant/config?city=bournemouth
→ { ok: true, city: 'bournemouth', meta: { source: 'query' }, ... }

// Localhost without city
GET localhost:3000/api/tenant/config
→ { ok: false, error: 'No city detected. On localhost...' }
```

---

### 2. `/app/api/admin/import-businesses/import/route.ts`
**Purpose**: Streams business import progress

**Changes**:
- ✅ Replaced `getCityFromHostname()` with `resolveRequestCity()`
- ✅ Allows `?city=` override on fallback hosts for development
- ✅ Returns clear error if city resolution fails

**Why query override**: Allows local development of import tool without setting up subdomains.

**Security**: Admin authentication + city permission check still enforced after city resolution.

---

### 3. `/app/api/admin/import-businesses/preview/route.ts`
**Purpose**: Previews businesses before import

**Changes**: Same as import route above.

---

### 4. `/app/api/google/places-details/route.ts`
**Purpose**: Fetches Google Places details with geographic validation

**Changes**:
- ✅ Removed duplicate `getCityFromHostname()` and `isFallbackHost()` functions
- ✅ Now uses `resolveRequestCity(request, { allowQueryOverride: true })`
- ✅ Cleaner error handling

**Why query override**: Used by onboarding form, needs to work on localhost for testing.

---

## Development Setup

### Option 1: Use Query Parameters
```bash
# Works on localhost/vercel preview
http://localhost:3000/onboarding?city=bournemouth
```

### Option 2: Set Environment Variable
```bash
# Add to .env.local
DEV_DEFAULT_CITY=bournemouth
```

Then:
```bash
http://localhost:3000/onboarding
# Automatically uses bournemouth from env
```

### Option 3: Mock Subdomain (Advanced)
```bash
# Add to /etc/hosts (macOS/Linux)
127.0.0.1 bournemouth.local

# Update .env.local
NEXT_PUBLIC_BASE_URL=http://bournemouth.local:3000
```

Then:
```bash
http://bournemouth.local:3000/onboarding
# City detected from hostname
```

---

## Migration Checklist

### ✅ Completed
- [x] Created centralized `lib/utils/tenant-city.ts`
- [x] Updated `/api/tenant/config` to use resolver
- [x] Updated import tool routes (import + preview)
- [x] Updated Google Places details route
- [x] Removed duplicate city resolution logic
- [x] Added helpful error messages
- [x] Enforced security model (403 on production query overrides)
- [x] Passed linter checks

### 🔄 Recommended (Optional)
- [ ] Add `DEV_DEFAULT_CITY=bournemouth` to `.env.local` template
- [ ] Update other routes using `getCityFromHostname` (see list below)
- [ ] Add integration tests for city resolution scenarios
- [ ] Update developer documentation with localhost setup instructions

---

## Other Routes Using `getCityFromHostname`

These routes currently use `getCityFromHostname` directly. They will continue to work, but could be migrated to use `resolveRequestCity` for consistency:

1. `app/api/claim/preselect/route.ts`
2. `app/api/claim/search/route.ts`
3. `app/api/claim/submit/route.ts`
4. `app/api/admin/approve/route.ts`
5. `app/api/admin/approve-claim/route.ts`
6. `app/api/admin/approve-change/route.ts`
7. `app/api/admin/update-notes/route.ts`
8. `app/api/debug/env-check/route.ts`
9. `app/api/internal/get-city/route.ts`

**Note**: These routes will work as-is on production subdomains. They may need `?city=` support for localhost testing if accessed directly during development.

---

## Testing

### Test Cases

#### 1. Production Subdomain
```bash
curl https://bournemouth.qwikker.com/api/tenant/config
# Expected: { ok: true, city: 'bournemouth', ... }
```

#### 2. Production with Query Override (Should Fail)
```bash
curl https://bournemouth.qwikker.com/api/tenant/config?city=london
# Expected: { ok: false, error: 'City override is not allowed...', status: 403 }
```

#### 3. Localhost with Query Override
```bash
curl http://localhost:3000/api/tenant/config?city=bournemouth
# Expected: { ok: true, city: 'bournemouth', meta: { source: 'query' }, ... }
```

#### 4. Localhost without Query (No Env)
```bash
# Ensure DEV_DEFAULT_CITY is not set
curl http://localhost:3000/api/tenant/config
# Expected: { ok: false, error: 'No city detected. On localhost...', status: 400 }
```

#### 5. Localhost with Env Variable
```bash
# Set DEV_DEFAULT_CITY=bournemouth in .env.local
curl http://localhost:3000/api/tenant/config
# Expected: { ok: true, city: 'bournemouth', meta: { source: 'env' }, ... }
```

#### 6. Vercel Preview with Query
```bash
curl https://qwikkerdashboard-abc123.vercel.app/api/tenant/config?city=bournemouth
# Expected: { ok: true, city: 'bournemouth', meta: { source: 'query' }, ... }
```

---

## Rollback Plan

If issues arise, revert by:

1. **Restore old tenant/config route**:
   ```bash
   git checkout HEAD~1 app/api/tenant/config/route.ts
   ```

2. **Remove centralized resolver**:
   ```bash
   git rm lib/utils/tenant-city.ts
   ```

3. **Restore import routes**:
   ```bash
   git checkout HEAD~1 app/api/admin/import-businesses/*/route.ts
   git checkout HEAD~1 app/api/google/places-details/route.ts
   ```

---

## Benefits

✅ **DRY**: One source of truth for city resolution  
✅ **Secure**: Explicit security model, no silent defaults on production  
✅ **Dev-Friendly**: Multiple fallback options for localhost/staging  
✅ **Debuggable**: Clear error messages, source tracking  
✅ **Type-Safe**: Full TypeScript support with discriminated unions  
✅ **Testable**: Pure function, easy to unit test

---

## Related Documentation
- See `MULTI_TENANT_GOOGLE_PLACES_IMPLEMENTATION.md` for Google Places setup
- See `IMPORTED_UNCLAIMED_BUSINESS_FIX.md` for business import normalization

---

**Implementation Date**: 2026-01-16  
**Status**: ✅ Complete - Ready for Testing
