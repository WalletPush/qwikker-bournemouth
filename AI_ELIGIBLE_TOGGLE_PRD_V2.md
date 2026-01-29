# PRD — AI Eligible Toggle + Claimed-Free Limits

**Date:** 2026-01-28  
**Owner:** QWIKKER HQ  
**Status:** Ready for implementation

---

## 1) Overview

This PRD introduces:

1. **Admin bulk "AI Eligible" toggle** for unclaimed imported listings (Tier 3 fallback pool gate)
2. **Auto-enable AI fallback approval** on claim approval (so claimed-free businesses are AI-visible by default)
3. **Claimed-free product limits:**
   - Exactly 1 offer total
   - Exactly 1 edit to that offer (then locked)
4. **Claimed-free dashboard prompts:**
   - Encourage adding up to 5 featured items (menu_preview) to improve discoverability

**Non-goals (MVP):**
- No new paid tier logic
- No new AI ranking changes
- No "real-time offer upgrades" beyond showing upgrade CTAs

---

## 2) Definitions

### Business statuses
- `unclaimed`: imported listing, no owner
- `claimed_free`: claimed listing, free tier owner

### Tier visibility model (current system)
- **Tier 1:** `business_profiles_chat_eligible` (paid/trial; carousel allowed)
- **Tier 2:** `business_profiles_lite_eligible` (claimed_free with 1–5 menu_preview items; text-only)
- **Tier 3:** `business_profiles_ai_fallback_pool` (unclaimed imported; text-only; gated by `admin_chat_fallback_approved = true`)

---

## 3) Requirements

### 3.1 Admin Dashboard: Bulk AI Eligible Toggle

**Location:** Admin dashboard → Unclaimed Listings tab

#### UI requirements

**Selection:**
- Add checkbox per row/card
- Add "Select all" checkbox
- Add top action button:
  - Label: `Make AI eligible`
  - Disabled when `selectedCount = 0`
  - Shows count when enabled: `Make AI eligible (N)`
  - Must be minimal / muted:
    - outline buttons only
    - no bright fills
    - no emojis

#### Confirmation modal

**Title:** Make AI eligible

**Body copy:**
- Are you sure you want to make these listings AI eligible?
- Selected businesses will become eligible for Tier 3 fallback discovery in chat, using basic information and (if enabled) review snippets.

**Actions:**
- Cancel (outline)
- Confirm (outline, slightly stronger border)

**Loading state:**
- Button changes to `Updating…`
- Show simple progress text: `Updating N businesses`

**Success state:**
- AI eligibility updated
- N businesses are now eligible
- Close button

#### Functional behavior

On confirm:
- Call `POST /api/admin/bulk-ai-eligible`
- Payload: `{ businessIds: string[] }`
- UI refreshes list after success
- Selection clears

---

### 3.2 API: Bulk Update Endpoint

**New file:** `app/api/admin/bulk-ai-eligible/route.ts`

#### Request
```typescript
POST /api/admin/bulk-ai-eligible
Content-Type: application/json

{
  businessIds: string[]
}
```

#### Response
```typescript
{
  success: boolean
  updated: number
  skipped: number
  errors: string[]
}
```

#### Validation & security (hard requirements)

- Must validate admin session (your existing admin auth system)
- Must resolve admin city from request host/tenant (no query param override on prod)
- Must enforce:
  - businesses belong to admin city
  - status is strictly `unclaimed`
  - `auto_imported = true` (optional but recommended)
- Must not modify claimed businesses
- Must use admin Supabase client / server security utilities

#### Update performed

Set:
- `admin_chat_fallback_approved = true`
- `updated_at = now()`

Return:
- updated count
- skipped count (anything not matching conditions)
- errors list (invalid ids, wrong city, etc.)

---

### 3.3 Auto-Enable on Claim Approval

**File:** `app/api/admin/approve-claim/route.ts`

When approving a claim (changing to `claimed_free`), also set:
- `admin_chat_fallback_approved = true`

**Rationale:**
- Claimed businesses should be eligible for chat visibility without manual admin step
- Tier 2 visibility still requires `menu_preview` (1–5 items) but the AI eligibility gate should not block them

**Acceptance:**
- After approval, DB row has `admin_chat_fallback_approved = true`
- No other logic is impacted

---

### 3.4 Claimed-Free Menu Prompt

**File:** `components/dashboard/improved-dashboard-home.tsx`

Show a prominent card when:
- `profile.status === 'claimed_free'`
- `menu_preview` missing or empty

**Copy:**

**Title:** Boost your chat visibility

**Body:**
- Users can discover you with dish-level recommendations.
- Add up to 5 featured items so you appear when someone asks for specific dishes or cuisines.

**CTA:**
- Add featured items
- navigates to `/dashboard/menu`

**Hide the prompt once at least 1 item exists.**

---

## 4) Claimed-Free Offer Restrictions

### 4.1 Offer count limit: exactly 1 offer

**Current trigger logic** uses `subscription_plan` and likely counts only approved offers; for free tier, you want to prevent creating a second offer even if the first is pending/draft.

#### Rule

If business status is `claimed_free`, max offers = 1 across all statuses except deleted (define explicitly).

**Recommendation:**
- Count offers where `status != 'deleted'` (or whatever your "removed" status is)
- Do not count admin-only offers if you have such a concept (if not, ignore)

#### Implementation

Update the offer limit trigger function to read:
- `business_profiles.status`
- existing offer count for that business
- enforce `max=1` when `claimed_free`
- else fall back to subscription plan rules

**SQL:**
```sql
CREATE OR REPLACE FUNCTION check_offer_limit()
RETURNS TRIGGER AS $$
DECLARE
  business_plan text;
  business_status text;
  current_offer_count integer;
  max_offers integer;
BEGIN
  -- Get business plan, status, and current offer count
  SELECT 
    bp.subscription_plan,
    bp.status,
    COUNT(bo.id)
  INTO business_plan, business_status, current_offer_count
  FROM public.business_profiles bp
  LEFT JOIN public.business_offers bo 
    ON bp.id = bo.business_id 
    AND bo.status != 'deleted'  -- Count non-deleted offers
  WHERE bp.id = NEW.business_id
  GROUP BY bp.subscription_plan, bp.status;
  
  -- Handle claimed_free status (max 1 offer)
  IF business_status = 'claimed_free' THEN
    max_offers := 1;
  ELSE
    -- Existing plan-based logic
    CASE business_plan
      WHEN 'starter' THEN max_offers := 1;
      WHEN 'featured' THEN max_offers := 3;
      WHEN 'spotlight' THEN max_offers := 999;
      ELSE max_offers := 1;
    END CASE;
  END IF;
  
  -- Check if adding this offer would exceed the limit
  IF current_offer_count >= max_offers THEN
    RAISE EXCEPTION 'Offer limit exceeded. % tier allows maximum % offer(s)', 
      COALESCE(business_status, business_plan), max_offers;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.2 One free edit limit

#### Rule

If business is `claimed_free`, each offer can be edited once by the business owner. After that, owner edits are blocked until upgrade.

**Important:** You must avoid blocking admin moderation updates (approval, status changes, expiry enforcement, etc.).

#### Data model

Add column:
```sql
ALTER TABLE business_offers
ADD COLUMN IF NOT EXISTS edit_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN business_offers.edit_count IS
  'Tracks number of owner edits for claimed_free tier. Max 1 edit allowed. Admin updates do not increment this.';
```

#### Trigger behavior

Trigger should:
- Only apply if business is `claimed_free`
- Only apply if editor is the owner (not admin)
- Only increment when "owner-editable fields" change
- Block when `OLD.edit_count >= 1`

**Critical note:** In Postgres triggers you do not automatically know "who" is editing unless you:
- pass a "request context" (e.g., setting a session variable)
- or enforce the lock in the API layer instead (often simpler)

#### MVP approach (recommended):

**Enforce edit limit in the API route for editing offers (owner route), not in DB.**

DB trigger can exist later, but it will be fragile without actor context.

**If you still want DB enforcement now:**
- require API to set `set_config('app.actor_role','owner',true)` and have trigger check it
- otherwise it will also block admin updates unpredictably

#### API-layer enforcement (recommended for MVP):

**File:** `app/api/offers/[offerId]/route.ts` (or wherever owner edits happen)

```typescript
export async function PATCH(request: NextRequest, { params }: { params: { offerId: string } }) {
  // ... existing auth ...
  
  // Get business and offer
  const { data: business } = await supabase
    .from('business_profiles')
    .select('status')
    .eq('user_id', userId)
    .single()
  
  const { data: offer } = await supabase
    .from('business_offers')
    .select('edit_count')
    .eq('id', params.offerId)
    .single()
  
  // Enforce edit limit for claimed_free
  if (business.status === 'claimed_free' && offer.edit_count >= 1) {
    return NextResponse.json(
      { error: 'Edit limit reached. Free tier offers can only be edited once. Upgrade for unlimited edits.' },
      { status: 403 }
    )
  }
  
  // Perform update
  const { error } = await supabase
    .from('business_offers')
    .update({
      ...updateData,
      edit_count: offer.edit_count + 1,  // Increment
      updated_at: new Date().toISOString()
    })
    .eq('id', params.offerId)
  
  // ...
}
```

---

## 5) UI Requirements (No bright, no emojis)

### Admin button styles (example)

```tsx
<Button
  variant="outline"
  className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800/40"
>
  Make AI eligible (3)
</Button>
```

### Checkbox style
- subtle slate accent (or use default shadcn checkbox)

### Modals
- slate-950 background
- slate-800 borders
- no icons unless minimal lucide icons

---

## 6) Acceptance Criteria

### Admin bulk toggle
- Selecting rows updates the `Make AI eligible (N)` button count
- Select all works correctly with filtered list
- Confirm toggles all selected that match constraints
- Businesses outside city or not unclaimed are skipped and reported
- UI refresh shows updated state (either removed from tab or shows "AI eligible" badge)

### Auto enable on claim approval
- Approving claim sets `admin_chat_fallback_approved = true`
- Existing approval flow unaffected (emails, wallet, CRM continue working)

### Menu prompt
- Claimed-free with 0 items sees prompt
- Adding first item hides prompt

### Claimed-free offer limits
- Claimed-free can create exactly 1 offer
- Attempting second offer shows upgrade CTA and fails cleanly
- Claimed-free can edit the offer once; second edit is blocked and shows upgrade CTA
- Paid tiers not affected

---

## 7) Implementation Plan

### Phase A — Admin bulk toggle (foundation)
1. Add selection state + checkbox UI in `admin-dashboard.tsx`
2. Add confirmation modal component
3. Add API route `bulk-ai-eligible`
4. Refresh list + clear selection after success

### Phase B — Claim auto enable + prompt
1. Update `approve-claim` route to set `admin_chat_fallback_approved = true`
2. Add dashboard prompt card for `claimed_free` with empty `menu_preview`

### Phase C — Claimed-free offer limits
1. Implement offer count limit for `claimed_free` (update DB trigger)
2. Implement edit limit (API guard recommended for MVP)
3. Add UI badges and disabled edit states
4. Add upgrade CTAs

---

## 8) Critical Corrections & Technical Notes

### 8.1 Tier 2 and admin_chat_fallback_approved

**Correction:** Your Tier 2 view doesn't use `admin_chat_fallback_approved` (it uses `status='claimed_free' + menu_preview`). That's fine, but then "auto-enable on claim" is more about consistency and future gating. Keep it, but don't describe it as required for Tier 2 to work.

**Tier 2 Logic (from `three-tier-chat-system.sql`):**
```sql
CREATE OR REPLACE VIEW business_profiles_lite_eligible AS
SELECT ...
FROM business_profiles bp
WHERE bp.status = 'claimed_free'
  AND bp.business_tier = 'free_tier'
  AND bp.menu_preview IS NOT NULL
  AND jsonb_array_length(bp.menu_preview) >= 1;
```

**Key point:** `admin_chat_fallback_approved` is NOT checked for Tier 2. It's only used for Tier 3 (unclaimed fallback).

**Why auto-enable it on claim anyway?**
- Consistency (all businesses should be AI-eligible unless explicitly disabled)
- Future-proofing (if we add more AI features that check this gate)
- Reduces admin friction (no manual step needed)

---

### 8.2 DB trigger for edit limit needs actor context

**Problem:** Without distinguishing owner edits vs admin updates, you will create hard-to-debug failures.

**Example scenario:**
1. Owner edits offer once
2. Admin approves offer (status change)
3. DB trigger fires, sees "edit", increments `edit_count` to 2
4. Now owner can't edit even though they only edited once

**Solution for MVP:** Enforce edit limit in the owner API route.

**If you need DB enforcement later:**
```sql
-- Set context in API before update
SELECT set_config('app.actor_role', 'owner', true);
SELECT set_config('app.actor_id', user_id::text, true);

-- Trigger checks context
CREATE OR REPLACE FUNCTION check_offer_edit_limit()
RETURNS TRIGGER AS $$
DECLARE
  actor_role text;
  business_status text;
  current_edit_count integer;
BEGIN
  -- Get actor role from session
  actor_role := current_setting('app.actor_role', true);
  
  -- Skip check if admin
  IF actor_role = 'admin' THEN
    RETURN NEW;
  END IF;
  
  -- Rest of logic...
END;
$$ LANGUAGE plpgsql;
```

---

### 8.3 Offer count should count non-deleted offers, not only approved

**Current logic** (from your existing trigger):
```sql
LEFT JOIN public.business_offers bo 
  ON bp.id = bo.business_id 
  AND bo.status = 'approved'  -- Only counts approved
```

**Problem:** Claimed-free could create 10 pending offers and circumvent the 1-offer limit.

**Solution:** Count all non-deleted offers:
```sql
LEFT JOIN public.business_offers bo 
  ON bp.id = bo.business_id 
  AND bo.status != 'deleted'  -- Count pending, approved, expired, etc.
```

**Status filter decision matrix:**

| Offer Status | Should Count Toward Limit? | Rationale |
|--------------|---------------------------|-----------|
| `pending` | YES | Prevents spam/circumvention |
| `approved` | YES | Active offer |
| `expired` | YES (or NO) | Your call - if expired offers auto-delete, say NO |
| `rejected` | NO | Admin rejected, shouldn't block new offer |
| `deleted` | NO | User/admin removed |

**Recommended:**
```sql
AND bo.status NOT IN ('deleted', 'rejected')
```

---

### 8.4 Admin city isolation enforcement

**Critical:** The bulk AI eligible endpoint MUST enforce city isolation.

**Bad (security hole):**
```typescript
const { businessIds } = await request.json()
// No city check - admin could toggle businesses in other cities!
```

**Good:**
```typescript
const { businessIds } = await request.json()

// Get admin's city from hostname/session
const adminCity = await getCityFromRequest(request)

// Verify all businesses belong to admin's city
const { data: businesses } = await supabaseAdmin
  .from('business_profiles')
  .select('id, city, status')
  .in('id', businessIds)

const invalidBusinesses = businesses.filter(b => 
  b.city !== adminCity || b.status !== 'unclaimed'
)

if (invalidBusinesses.length > 0) {
  return NextResponse.json({
    success: false,
    error: 'Some businesses are not in your city or not unclaimed',
    invalidIds: invalidBusinesses.map(b => b.id)
  }, { status: 403 })
}

// Proceed with update...
```

---

### 8.5 Dashboard offer card states

**For claimed_free offers, show edit status clearly:**

```tsx
// Before any edits
<div className="text-xs text-slate-400">
  Edits remaining: 1
</div>
<Button variant="outline">Edit Offer</Button>

// After 1 edit used
<div className="text-xs text-slate-400">
  No edits remaining
</div>
<Button variant="outline" disabled>
  Edit Offer
</Button>
<Button variant="outline" className="text-emerald-400">
  Upgrade to Edit
</Button>
```

---

## 9) Files to Create/Modify

### New Files
1. `app/api/admin/bulk-ai-eligible/route.ts` - Bulk update endpoint
2. `components/admin/ai-eligible-confirmation-modal.tsx` - Confirmation modal
3. `supabase/migrations/20260128000000_claimed_free_offer_restrictions.sql` - Offer restrictions

### Modified Files
1. `components/admin/admin-dashboard.tsx` - Add bulk selection UI
2. `app/api/admin/approve-claim/route.ts` - Auto-set AI eligible
3. `components/dashboard/improved-dashboard-home.tsx` - Add menu prompt
4. `supabase/migrations/20250929200000_create_multiple_offers_system.sql` - Update `check_offer_limit()` function
5. `app/api/offers/[offerId]/route.ts` - Add edit limit enforcement (API layer)

---

## 10) Testing Checklist

### Admin Bulk Toggle
- [ ] Select 1 business → button shows count
- [ ] Select all → all checkboxes checked
- [ ] Deselect all → button disabled
- [ ] Confirm → loading state → success
- [ ] Check DB: `admin_chat_fallback_approved = true`
- [ ] Claimed businesses skipped with error
- [ ] Businesses from other cities skipped with error

### Auto-Enable on Claim
- [ ] Approve claim → check DB: `admin_chat_fallback_approved = true`
- [ ] Email sent successfully
- [ ] No regression in existing flow

### Menu Prompt
- [ ] Claimed-free with 0 items sees prompt
- [ ] Add 1 item → prompt disappears
- [ ] Paid tier never sees prompt

### Offer Limits
- [ ] Claimed-free creates 1st offer → succeeds
- [ ] Try to create 2nd offer → fails with upgrade CTA
- [ ] Edit 1st offer once → succeeds, `edit_count = 1`
- [ ] Try to edit again → fails with upgrade CTA
- [ ] Admin can still approve/reject offers
- [ ] Paid tier unaffected

---

## 11) Estimated Effort

- **Phase A (Admin UI):** 4-6 hours
- **Phase B (Auto-enable + Prompt):** 2-3 hours
- **Phase C (Offer Limits):** 3-4 hours
- **Testing & Polish:** 2-3 hours
- **Total:** 11-16 hours

---

## 12) Success Metrics

**Admin efficiency:**
- Time to make 50 businesses AI-eligible: < 2 minutes (vs manual one-by-one)

**Claimed-free onboarding:**
- % of claimed-free users who add at least 1 menu item within 7 days: target 60%
- % of claimed-free users hitting offer edit limit within 30 days: track for upgrade opportunity

**Support reduction:**
- Reduction in "how do I edit my offer?" support tickets after clear UI states

---

**Status:** Ready for implementation  
**Next Step:** Begin Phase A (Admin bulk selection UI)
