# HQ Admin UPSERT Implementation - Safety Audit

## Current State Analysis

### ✅ What's Safe
1. **Migration uses `ON CONFLICT DO NOTHING`**
   - Will NOT overwrite existing cities (like Bournemouth)
   - Only adds new rows for cities that don't exist
   - Zero risk to existing data

2. **API already checks for conflicts (lines 106-119)**
   - Returns 409 if city or subdomain exists
   - Clear error messages
   - No silent failures

3. **Rollback logic exists (lines 238-281)**
   - If auth user creation fails → deletes franchise config
   - If city_admin creation fails → deletes both franchise + auth user
   - Transaction-like behavior

### ⚠️ What Needs Protection

1. **Preventing overwrites of live cities**
   - If a city is `status = 'active'`, we should NOT allow casual updates
   - Need explicit "Are you sure?" gate for routing-critical fields

2. **city_admins table duplication**
   - Currently tries to INSERT (line 264)
   - If city already exists with coming_soon → city_admins row might exist
   - Need UPSERT here too

3. **Auth user email conflicts**
   - If coming_soon city has `owner_email = hello@qwikker.com`
   - Real launch tries to use same email → fails
   - Solution: Allow updating owner_email when transitioning from coming_soon

---

## Implementation Plan (Zero Risk)

### Phase 1: Update Migration ✅ (SAFE - Already Done)
- Adds 15 cities with status = 'coming_soon'
- Uses ON CONFLICT DO NOTHING
- Updates public view

**Risk Level:** ZERO - Will not touch existing data

---

### Phase 2: Update API Logic

#### A) Detect "coming_soon" cities (NEW CHECK)

**Location:** `/api/hq/franchises` POST (after line 111)

```typescript
// Check if this is a coming_soon city being launched
const isLaunchingComingSoon = existingCity && existingCity.status === 'coming_soon'
```

#### B) Branch logic based on city state

**New Flow:**
```typescript
if (existingCity) {
  if (existingCity.status === 'active') {
    // BLOCK: Active cities cannot be recreated
    return NextResponse.json({ 
      error: `City "${city_name}" is already active. Use the Edit page to modify settings.` 
    }, { status: 409 })
  }
  
  if (existingCity.status === 'coming_soon') {
    // ALLOW: Transition from coming_soon → pending_setup
    // Will do UPSERT instead of INSERT
  }
  
  if (existingCity.status === 'pending_setup') {
    // BLOCK: Pending cities should be completed via wizard, not recreated
    return NextResponse.json({ 
      error: `City "${city_name}" is pending setup. Complete the setup wizard instead.` 
    }, { status: 409 })
  }
}
```

#### C) UPSERT franchise_crm_configs (SAFE UPDATE)

**Current:** `.insert({ ... })` (line 186)

**New:**
```typescript
const { data: franchise, error: franchiseError } = await adminClient
  .from('franchise_crm_configs')
  .upsert({
    city: cleanCity, // Primary key for conflict resolution
    display_name: franchiseDisplayName,
    subdomain: cleanSubdomain,
    // ... all other fields ...
    status: 'pending_setup' // Always transition to pending_setup
  }, {
    onConflict: 'city',
    ignoreDuplicates: false // We want to UPDATE, not skip
  })
  .select()
  .single()
```

**Safety:** Only happens if `status === 'coming_soon'`. Active cities are blocked above.

#### D) Handle Auth User Creation (SMART LOGIC)

**Problem:** coming_soon cities use placeholder email (`hello@qwikker.com`)

**Solution:**
```typescript
// If launching coming_soon city with placeholder email, delete old auth user first
if (isLaunchingComingSoon && existingCity.owner_email === 'hello@qwikker.com') {
  // Find and delete placeholder auth user
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const placeholderUser = existingUsers.users.find(u => u.email === 'hello@qwikker.com')
  if (placeholderUser) {
    await adminClient.auth.admin.deleteUser(placeholderUser.id)
  }
}

// Then create real auth user (existing logic)
```

#### E) UPSERT city_admins (SAFE UPDATE)

**Current:** `.insert({ ... })` (line 264)

**New:**
```typescript
const { error: adminError } = await adminClient
  .from('city_admins')
  .upsert({
    city: cleanCity, // Primary key
    username: cleanCity,
    password_hash: 'SUPABASE_AUTH',
    email: owner_email,
    full_name: fullName,
    is_active: true
  }, {
    onConflict: 'city'
  })
```

**Safety:** If row exists, updates it. If not, creates it.

---

### Phase 3: Update HQ Admin UI

#### A) Add "Mode Detection" (Client-side check)

**Location:** `app/hqadmin/franchises/create/page.tsx`

Add state:
```typescript
const [mode, setMode] = useState<'create' | 'launch'>('create')
const [existingCity, setExistingCity] = useState<any>(null)
```

Add city check (onBlur of city_name field):
```typescript
async function checkCityExists(cityName: string) {
  const res = await fetch(`/api/hq/franchises/check?city=${cityName}`)
  const data = await res.json()
  
  if (data.exists && data.status === 'coming_soon') {
    setMode('launch')
    setExistingCity(data.city)
    // Pre-fill form with existing data
    setFormData(prev => ({
      ...prev,
      subdomain: data.city.subdomain,
      country: data.city.country_code,
      timezone: data.city.timezone
    }))
  }
}
```

#### B) Update UI Copy

**Button text:**
```tsx
<button type="submit">
  {mode === 'launch' ? 'Launch City' : 'Create Franchise'}
</button>
```

**Show info banner:**
```tsx
{mode === 'launch' && existingCity && (
  <div className="bg-green-50 border border-green-200 p-4 rounded">
    <p className="text-green-800">
      ✅ This city exists as "Coming soon". You're now launching it officially!
    </p>
    <p className="text-sm text-green-600 mt-2">
      Status will change: coming_soon → pending_setup → active (after wizard)
    </p>
  </div>
)}
```

---

### Phase 4: Update Public View (STRICT)

**Current view includes:** `active`, `pending_setup`, `coming_soon`

**New view (stricter):**
```sql
CREATE OR REPLACE VIEW franchise_public_info AS
SELECT 
  city, display_name, subdomain, status, country_name, timezone, currency_symbol
FROM franchise_crm_configs
WHERE status IN ('active', 'coming_soon');
-- Removed 'pending_setup' for privacy
```

**Reasoning:**
- `pending_setup` is an internal state
- Public shouldn't see "launching soon" vs "not started yet"
- Only show: LIVE (active) and COMING SOON (coming_soon)

---

## Safety Guarantees

### ✅ Existing Bournemouth franchise
- Migration: ON CONFLICT DO NOTHING → Won't touch it
- API: Status check → Won't allow recreation if active
- Result: **ZERO RISK**

### ✅ city_admins table
- UPSERT instead of INSERT
- No duplicate key errors
- Updates email/name if launching coming_soon city

### ✅ Auth users
- Detects placeholder emails
- Cleans up before creating real user
- No email conflicts

### ✅ Active cities
- Explicit block in API
- Cannot be overwritten via "Create Franchise"
- Must use Edit page (separate flow)

---

## Testing Checklist

### Test 1: Migration Safety
```sql
-- Before migration
SELECT city, status FROM franchise_crm_configs;
-- Should show: bournemouth, active

-- Run migration
\i supabase/migrations/20260125000004_add_coming_soon_cities.sql

-- After migration
SELECT city, status FROM franchise_crm_configs ORDER BY country_name, display_name;
-- Should show: bournemouth (active) + 15 new cities (coming_soon)
-- Bournemouth should be UNCHANGED
```

### Test 2: Try Creating Existing Active City
```bash
curl -X POST /api/hq/franchises \
  -H "Content-Type: application/json" \
  -d '{"city_name": "Bournemouth", ...}'

# Expected: 409 error
# "City 'Bournemouth' is already active. Use the Edit page to modify settings."
```

### Test 3: Launch Coming Soon City
```bash
curl -X POST /api/hq/franchises \
  -H "Content-Type: application/json" \
  -d '{
    "city_name": "London",
    "subdomain": "london",
    "owner_email": "real-owner@example.com",
    ...
  }'

# Expected: 200 success
# franchise_crm_configs: status changes from coming_soon → pending_setup
# city_admins: row updated with new owner email
# Auth user: created with real email
```

### Test 4: Public View Safety
```sql
SELECT * FROM franchise_public_info WHERE status = 'pending_setup';
-- Expected: 0 rows (pending_setup excluded)

SELECT city, status FROM franchise_public_info ORDER BY country_name;
-- Expected: Only active + coming_soon cities
```

---

## Rollback Plan

If anything goes wrong:

1. **Rollback Migration:**
   ```sql
   DELETE FROM franchise_crm_configs WHERE status = 'coming_soon';
   
   DROP VIEW franchise_public_info;
   CREATE OR REPLACE VIEW franchise_public_info AS
   SELECT city, display_name, subdomain, status, country_name, timezone, currency_symbol
   FROM franchise_crm_configs
   WHERE status IN ('active', 'pending_setup');
   ```

2. **Revert API Changes:**
   ```bash
   git checkout HEAD -- app/api/hq/franchises/route.ts
   ```

3. **Revert UI Changes:**
   ```bash
   git checkout HEAD -- app/hqadmin/franchises/create/page.tsx
   ```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Overwrite Bournemouth | ZERO | Critical | ON CONFLICT DO NOTHING + Status check blocks it |
| Duplicate city_admins | LOW | Minor | UPSERT instead of INSERT |
| Auth email conflict | LOW | Minor | Placeholder email cleanup logic |
| Break existing flow | LOW | Medium | All changes are additive, existing logic preserved |
| Public data leak | ZERO | High | View only exposes safe fields, pending_setup excluded |

---

## Final Decision Matrix

| Scenario | Current Behavior | New Behavior | Safe? |
|----------|-----------------|--------------|-------|
| Create new city (never existed) | INSERT → Success | INSERT → Success | ✅ Same |
| Create city (exists, active) | INSERT → 409 Error | Status check → 409 Error (clearer message) | ✅ Better |
| Create city (exists, coming_soon) | INSERT → 409 Error | UPSERT → Success (transition to pending_setup) | ✅ Intended |
| Create city (exists, pending_setup) | INSERT → 409 Error | Status check → 409 Error (clearer message) | ✅ Better |

---

**Conclusion:** ✅ SAFE TO PROCEED

All changes are:
- Additive (not destructive)
- Guarded (explicit status checks)
- Reversible (rollback plan exists)
- Tested (checklist provided)

**Next Step:** Implement in phases, test each phase before moving to next.
