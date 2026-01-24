# ✅ HQ Admin "Launch City" Flow - COMPLETE

## What Was Built

The HQ Admin API now safely handles **two distinct flows**:

1. **CREATE New City** (from scratch)
2. **LAUNCH Coming Soon City** (transition `coming_soon` → `pending_setup`)

---

## Key Safety Guards

### 1️⃣ Status-Aware Duplicate Check

**Before:** Hard block on any duplicate city/subdomain.

**Now:**
- ✅ **Allow** if city exists with `status='coming_soon'` → triggers LAUNCH flow
- ❌ **Block** if city exists with `status='active'` → "already active, cannot overwrite"
- ❌ **Block** if city exists with `status='pending_setup'` → "already pending setup"
- ❌ **Block** if subdomain is taken by a **different** city

---

### 2️⃣ Mode-aware INSERT vs UPDATE (Not True UPSERT)

**Important:** This is NOT a blind database UPSERT. The code explicitly checks the mode and chooses the appropriate operation to prevent accidental overwrites.

```typescript
if (isLaunchingComingSoon && existingFranchiseId) {
  // UPDATE: Transition coming_soon → pending_setup
  await adminClient
    .from('franchise_crm_configs')
    .update({
      // Replace placeholder data with real owner info
      owner_name, owner_email, owner_phone,
      status: 'pending_setup', // KEY: Transition to pending_setup
      // ... all other fields
    })
    .eq('id', existingFranchiseId)
} else {
  // INSERT: Create brand new franchise
  await adminClient
    .from('franchise_crm_configs')
    .insert({
      city, subdomain, status: 'pending_setup',
      // ... all fields
    })
}
```

**Why not use .upsert()?**
- True UPSERT could accidentally overwrite active configs in a future refactor
- Mode-aware logic provides explicit protection against data corruption
- Clearer audit trail (different actions logged)

---

### 3️⃣ Rollback Logic (Status-Aware + Field Restoration)

**Critical:** Rollback must restore ALL overwritten fields, not just status.

**If auth user creation fails:**

```typescript
if (isLaunchingComingSoon) {
  // Revert to coming_soon AND restore placeholder data
  await adminClient
    .from('franchise_crm_configs')
    .update({
      status: 'coming_soon',
      owner_name: 'QWIKKER HQ',
      owner_email: 'hello@qwikker.com',
      owner_phone: null,
      ghl_webhook_url: 'https://placeholder.com'
    })
    .eq('id', existingFranchiseId)
} else {
  // Delete newly created franchise
  await adminClient
    .from('franchise_crm_configs')
    .delete()
    .eq('id', franchise.id)
}
```

**Why restore fields?**
- If only status is reverted, the city stays "coming_soon" but with real owner data
- This creates data inconsistency and potential privacy issues
- Full restoration maintains clean placeholder state

**This ensures:**
- `coming_soon` cities are fully restored (not just status) if launch fails
- New franchises are cleaned up (deleted) if creation fails
- No orphaned data or mixed states

---

### 4️⃣ City Admins Collision Blocking

**Problem:** If a `city_admins` row already exists for the city, it likely means the city has been launched previously. Allowing this could hide data corruption.

**Solution:** Block by default.

```typescript
const { data: existingAdmin } = await adminClient
  .from('city_admins')
  .select('city, username, email')
  .eq('city', cleanCity)
  .maybeSingle()

if (existingAdmin) {
  // BLOCK: Prevent data corruption
  // Rollback any changes and return error
  return NextResponse.json({
    error: `A city admin already exists for ${city_name}. This city may have been launched previously.`,
    existing_admin_email: existingAdmin.email
  }, { status: 409 })
}

// Only INSERT if check passed (no UPDATE path)
await adminClient.from('city_admins').insert({ ... })
```

**Why block instead of update?**
- Existing admin indicates prior launch attempt or active city
- Silently updating could overwrite valid data
- Explicit error forces investigation of the conflict

**If relaunch is needed:**
- Handle via explicit admin-only recovery flow (future feature)
- Require manual review of existing data before proceeding
- Could add `allow_relaunch=true` flag (not currently implemented)

---

## Audit Trail

The audit log now tracks whether a franchise was launched from `coming_soon`:

```typescript
await adminClient.from('hq_audit_logs').insert({
  action: isLaunchingComingSoon ? 'franchise_launched' : 'franchise_created',
  metadata: {
    was_coming_soon: isLaunchingComingSoon,
    // ... other metadata
  }
})
```

---

## User Experience

### HQ Admin Dashboard

**Before:**
- "CREATE FRANCHISE" button
- Hard block if city exists ("Franchise already exists for Bournemouth")

**Now:**
- Same "CREATE FRANCHISE" button
- If user enters a `coming_soon` city (e.g. "London"):
  - ✅ Allowed (transitions to `pending_setup`)
  - Email sent with login credentials
  - Franchise admin can complete setup wizard
- If user enters an `active` city (e.g. "Bournemouth"):
  - ❌ Blocked ("Franchise for Bournemouth is already active. Cannot overwrite.")
- If city_admins already exists:
  - ❌ Blocked ("A city admin already exists for this city. Contact support.")

---

## Database Flow

### Creating New City (Dallas)

```
1. Check: Dallas doesn't exist → proceed
2. INSERT into franchise_crm_configs (status='pending_setup')
3. Create auth user
4. Check: city_admins doesn't exist → proceed
5. INSERT into city_admins
6. Send invitation email
```

### Launching Coming Soon City (London)

```
1. Check: London exists with status='coming_soon' → proceed (LAUNCH flow)
2. UPDATE franchise_crm_configs (status='pending_setup', replace owner info)
3. Create auth user
4. Check: city_admins doesn't exist → proceed
5. INSERT into city_admins (NOT update)
6. Send invitation email
```

### Blocked: Active City (Bournemouth)

```
1. Check: Bournemouth exists with status='active' → BLOCK
2. Return 409 error: "Franchise for Bournemouth is already active. Cannot overwrite."
```

### Blocked: Existing City Admin

```
1. Check: city_admins row exists for this city → BLOCK
2. Rollback any changes (restore coming_soon state if applicable)
3. Delete auth user
4. Return 409 error: "A city admin already exists for [city]. Contact support."
```

---

## Testing Checklist

✅ **Create new city (not in database)**
- Should INSERT new franchise with `status='pending_setup'`
- Should INSERT city_admins row
- Should send email

✅ **Launch coming_soon city (London, Paris, Dubai, etc.)**
- Should UPDATE existing franchise to `status='pending_setup'`
- Should replace placeholder owner data with real owner info
- Should INSERT city_admins row (NOT update)
- Should send email

✅ **Try to launch active city (Bournemouth)**
- Should BLOCK with error: "already active, cannot overwrite"

✅ **Try to use duplicate subdomain (different city)**
- Should BLOCK with error: "subdomain already taken by [city]"

✅ **Auth user creation fails (email already registered)**
- If new city: should DELETE franchise
- If coming_soon city: should REVERT to `status='coming_soon'` AND restore placeholder fields

✅ **city_admins already exists for city**
- Should BLOCK with error: "city admin already exists"
- Should rollback all changes
- Should delete auth user

---

## Rollback Field Restoration

When a launch fails, these fields are restored for `coming_soon` cities:

- `status` → `'coming_soon'`
- `owner_name` → `'QWIKKER HQ'`
- `owner_email` → `'hello@qwikker.com'`
- `owner_phone` → `NULL`
- `ghl_webhook_url` → `'https://placeholder.com'`

**Why this matters:**
- Prevents mixed state (coming_soon city with real owner data)
- Maintains privacy (real email not left in placeholder row)
- Keeps data consistent for future launch attempts

---

## Related Files

- **API Route:** `app/api/hq/franchises/route.ts`
- **Migration:** `supabase/migrations/20260125000004_add_coming_soon_cities.sql`
- **Public View:** `franchise_public_info` (filters by `status IN ('active', 'coming_soon')`)

---

## What's Next?

### Immediate:
1. Test the flow in HQ Admin Dashboard
2. Try launching a `coming_soon` city (e.g. London)
3. Verify email is sent with correct credentials
4. Verify rollback works (try launching with existing email)
5. Verify city_admins collision blocking works

### Later:
1. Add explicit "Launch City" button in HQ UI (separate from "Create")
2. Add preview step before launching (show what will change)
3. Implement admin-only recovery flow for genuine relaunches
4. Add `allow_relaunch` flag for intentional relaunches (requires manual approval)

---

## Known Limitations

1. **No explicit "Launch" vs "Create" UI distinction**
   - Currently uses same form/button for both
   - UI could be clearer about which mode is active

2. **No relaunch capability**
   - If city_admins exists, launch is blocked
   - Legitimate relaunches require manual database cleanup
   - Future: Add explicit recovery flow

3. **Rollback only restores core fields**
   - Restores: status, owner_name, owner_email, owner_phone, ghl_webhook_url
   - Does NOT restore: API keys, Atlas config, other custom fields
   - Acceptable because coming_soon cities shouldn't have those filled yet

---

**Status:** ✅ **Implemented — Pending End-to-End Validation**

The flow is fully implemented with strict safety guards. Ready for testing in HQ Admin Dashboard.

**Before marking as production-ready:**
- [ ] Test creating new city (not in DB)
- [ ] Test launching coming_soon city
- [ ] Test blocking active city
- [ ] Test rollback on auth failure
- [ ] Test city_admins collision blocking
- [ ] Verify email delivery
- [ ] Verify audit logs

---

## Code Verification Notes

This documentation reflects the actual implementation in `app/api/hq/franchises/route.ts` as of the last update.

**Key implementation details:**
- Line ~105-148: Status-aware duplicate checking
- Line ~183-243: Mode-aware INSERT vs UPDATE
- Line ~244-286: Rollback with field restoration
- Line ~288-351: City admins collision blocking with rollback
- Line ~480: Audit trail with launch detection

**Terminology precision:**
- NOT using `.upsert()` - explicit mode detection and branching
- "UPSERT logic" replaced with "Mode-aware INSERT vs UPDATE"
- Emphasizes that this is intentionally NOT a blind upsert for safety
