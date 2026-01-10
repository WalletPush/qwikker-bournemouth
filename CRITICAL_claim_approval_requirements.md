# 🚨 CRITICAL: Claim Approval Requirements

## Problem:
When a business claims a listing and creates an account, we CANNOT set `user_id` because:
- ❌ Violates UNIQUE constraint (one account = one business)
- ❌ Prevents founding member flow from working

## Solution:
When admin approves a claim:

```typescript
// ❌ WRONG - DO NOT DO THIS:
await supabase
  .from('business_profiles')
  .update({
    user_id: claim.user_id,  // ❌ VIOLATES UNIQUE!
    owner_user_id: claim.user_id,
    status: 'claimed_free'
  })

// ✅ CORRECT - DO THIS:
await supabase
  .from('business_profiles')
  .update({
    owner_user_id: claim.user_id,  // ✅ Set owner only!
    status: 'claimed_free',
    claimed_at: new Date().toISOString()
  })
  // user_id stays NULL!
```

## Dashboard Access:
Dashboard queries need to check BOTH fields:

```typescript
// ❌ OLD (only checks user_id):
.eq('user_id', userId)

// ✅ NEW (checks both):
.or(`user_id.eq.${userId},owner_user_id.eq.${userId}`)
```

## Business Types:

### Founding Member Businesses (Onboarding Form):
```
user_id = account_id (UNIQUE)
owner_user_id = NULL (or same as user_id via trigger)
status = 'incomplete' → 'pending_review' → 'approved'
```

### Imported & Claimed Businesses (Google Places):
```
user_id = NULL (no creator)
owner_user_id = claimer_account_id
status = 'unclaimed' → 'pending_claim' → 'claimed_free'
```

### How They Log In:
```sql
SELECT * FROM business_profiles 
WHERE user_id = auth.uid() 
   OR owner_user_id = auth.uid()
LIMIT 1
```

## Files That Need Updating:

1. **Create admin claim approval API:**
   - `/app/api/admin/claims/approve/route.ts` (doesn't exist yet!)
   - Must set `owner_user_id` NOT `user_id`

2. **Update dashboard queries:**
   - Check all dashboard pages that use `WHERE user_id = auth.uid()`
   - Change to `WHERE user_id = auth.uid() OR owner_user_id = auth.uid()`

3. **Update RLS policies:**
   - Policies that check `user_id = auth.uid()` 
   - Add `OR owner_user_id = auth.uid()`

## Testing Checklist:
- [ ] Founding member can sign up (creates business with user_id)
- [ ] Founding member can log in and see their dashboard
- [ ] Business can be imported (user_id = NULL)
- [ ] Business can be claimed (creates account)
- [ ] Admin can approve claim (sets owner_user_id)
- [ ] Claimed business owner can log in and see their dashboard
- [ ] UNIQUE constraint prevents one account from having multiple businesses via onboarding
- [ ] NULL user_id allows unlimited imports

