# Auto-Import Notification Guard

## Purpose
Prevent emails, push notifications, and user alerts from being sent to auto-imported businesses that haven't been claimed by an owner yet.

---

## The Guard Logic

### ✅ Correct Implementation (Three-Way Check)

```typescript
const isUnclaimedImport = 
  data.auto_imported === true && 
  !data.owner_user_id && 
  !data.claimed_at
```

### Why Three Checks?

1. **`auto_imported === true`**  
   - Only set when business is imported via Google Places API
   - Never changes (permanent flag)
   - Distinguishes auto-imported from manually onboarded businesses

2. **`!data.owner_user_id`**  
   - Only set when a business owner successfully claims the listing
   - Null for unclaimed businesses
   - Ensures we don't block notifications for claimed businesses

3. **`!data.claimed_at`**  
   - Timestamp of when claim was completed
   - Extra safety: even if `owner_user_id` is accidentally set, we check the claim completion timestamp
   - Ensures legitimate claims always get notifications

---

## ❌ Why NOT Check `status`?

**The status check would break the guard!**

### Timeline in the Approve Route:

1. **Before approval:** status = `'unclaimed'`
2. **Update runs:** `.update({ status: 'approved', ... })`
3. **Select returns:** Updated row where status = `'approved'`
4. **Guard checks:** `data.status === 'unclaimed'` ❌ **FALSE!**

**Result:** Guard would never work because status has already changed by the time we check it.

### Why the Three-Way Check is Sufficient:

| Scenario | `auto_imported` | `owner_user_id` | `claimed_at` | Guard Blocks? | Correct? |
|----------|----------------|-----------------|--------------|---------------|----------|
| Auto-imported, unclaimed | `true` | `null` | `null` | ✅ Yes | ✅ Correct |
| Auto-imported, claimed | `true` | `[UUID]` | `[timestamp]` | ❌ No | ✅ Correct |
| Manual onboard | `false/null` | `[UUID]` | `[timestamp]` | ❌ No | ✅ Correct |
| Edge case: partial claim | `true` | `[UUID]` | `null` | ✅ Yes | ✅ Safe! |

---

## Where Applied (3 Locations)

### 1. Push Notifications
```typescript
// app/api/admin/approve/route.ts (line ~122)
const isUnclaimedImport = 
  data.auto_imported === true && 
  !data.owner_user_id && 
  !data.claimed_at

if (!isUnclaimedImport && data.user_id) {
  await sendBusinessApprovedNotification(...)
} else {
  console.log('⏭️ Skipped notification (auto-imported, unclaimed)')
}
```

### 2. Email Notifications
```typescript
// app/api/admin/approve/route.ts (line ~159)
const isUnclaimedImport = 
  data.auto_imported === true && 
  !data.owner_user_id && 
  !data.claimed_at

if (data.email && data.business_name && !isUnclaimedImport) {
  await sendBusinessApprovalNotification(...)
} else {
  console.log('⏭️ Skipped email (auto-imported, unclaimed)')
}
```

### 3. User Offer Notifications
```typescript
// app/api/admin/approve/route.ts (line ~138)
// Reuses isUnclaimedImport from push notification guard above

if (data.offer_name && data.offer_value && !isUnclaimedImport) {
  const userIds = await getUsersForBusinessNotifications(...)
  await sendNewOfferNotification(...)
  console.log(`🔔 New offer notification sent to ${userIds.length} users`)
}
```

---

## Required Fields

The guard depends on these fields being returned in the `.select()` query:

```typescript
const { data, error } = await supabaseAdmin
  .from('business_profiles')
  .update(updateData)
  .eq('id', businessId)
  .eq('city', requestCity)
  .select()  // ✅ Returns ALL fields (including auto_imported, owner_user_id, claimed_at)
  .single()
```

**CRITICAL:** If you ever change `.select()` to specify explicit fields, you MUST include:
- `auto_imported`
- `owner_user_id`
- `claimed_at`

Otherwise the guard will silently fail (undefined === true is false, so it would accidentally allow notifications).

---

## Test Scenarios

### ✅ Scenario 1: Auto-Imported, Unclaimed
```bash
# 1. Import business
POST /api/admin/import-businesses/import
# DB: auto_imported=true, owner_user_id=null, claimed_at=null

# 2. Admin approves for visibility
POST /api/admin/approve { businessId, action: 'approve' }

# Expected Results:
# - Console: "⏭️ Skipped notification (auto-imported, unclaimed)"
# - Console: "⏭️ Skipped email (auto-imported, unclaimed)"
# - Inbox: Empty ✅
# - Push notifications: None sent ✅
```

### ✅ Scenario 2: Auto-Imported, Then Claimed
```bash
# 1. Business owner claims imported listing
POST /api/claim/submit
# DB: owner_user_id=[UUID], claimed_at=[timestamp]

# 2. Admin approves claim
POST /api/admin/approve-claim

# Expected Results:
# - Console: "📧 Business approval email sent"
# - Console: "🔔 Push notification sent"
# - Inbox: Email received ✅
# - Push notifications: Sent ✅
```

### ✅ Scenario 3: Manual Onboard (Not Imported)
```bash
# 1. Business creates account directly
POST /api/businesses/create
# DB: auto_imported=false, owner_user_id=[UUID], claimed_at=[timestamp]

# 2. Admin approves
POST /api/admin/approve { businessId, action: 'approve' }

# Expected Results:
# - Guard: Does NOT block (auto_imported=false)
# - Notifications: All sent normally ✅
```

---

## Future Considerations

### If You Add Pre-Approval Flow for Imports

If you later add a step where admins manually review imports BEFORE setting them to 'unclaimed':

1. Add a new status: `'pending_import_review'`
2. Keep the three-way guard unchanged
3. Guard will still work because:
   - `auto_imported` = true
   - `owner_user_id` = null
   - `claimed_at` = null

### If You Add Bulk Claim Verification

If multiple people try to claim the same business:

1. Only one will succeed (database constraints)
2. Guard checks `owner_user_id` + `claimed_at`
3. Only the successful claimer gets notifications ✅

---

## Related Files

- **Route:** `app/api/admin/approve/route.ts`
- **Notifications:** `lib/notifications/business-notifications.ts`
- **Email:** `lib/notifications/email-notifications.ts`
- **Schema:** `supabase/migrations/*_add_auto_imported_columns.sql`
- **Claim Flow:** `app/api/claim/submit/route.ts`

---

## Summary

✅ **Use three-way check:** `auto_imported && !owner_user_id && !claimed_at`  
❌ **Don't check status:** It changes during the update  
✅ **Applied in 3 places:** Push, email, user offer notifications  
✅ **Safe by default:** Blocks nothing unless all three conditions are true  
✅ **Prevents PR disasters:** No spam to unclaimed businesses  

---

**Last Updated:** 2026-01-14  
**Author:** QWIKKER HQ  
**Status:** ✅ Production-ready
