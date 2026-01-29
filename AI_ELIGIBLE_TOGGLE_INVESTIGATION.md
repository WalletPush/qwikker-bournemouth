# AI Eligible Toggle System - Investigation & Implementation Plan

**Date:** 2026-01-28  
**Status:** 🔍 Investigation Complete - Ready for Implementation

---

## 🎯 **USER REQUIREMENTS**

### **Admin Dashboard Feature:**
1. **Unclaimed Listings Tab** - Add "Make AI Eligible" button at top
2. **Bulk Selection UI** - Checkboxes for each business + "Select All" option
3. **Import to Chat Button** - Opens confirmation modal
4. **Confirmation Modal** - "Are you sure? Selected businesses will be immediately viewable in the AI chat with basic information and review snippets"
5. **Loading State** - Show progress while updating
6. **Completion Modal** - Confirm success
7. **Design Requirements:** 
   - NO emojis
   - NO bright buttons (transparent colors only)
   - Clean, minimal design

### **Auto-Set on Claim:**
- When a business claims their listing, automatically set `admin_chat_fallback_approved = true`
- Show clear prompt to add menu/service items for better chat visibility
- Messaging: "Users can discover you with dish-level recommendations"
- Max 5 items for free tier

### **Offer Restrictions for Free Tier:**
- `claimed_free` users can create **ONE offer only**
- **ONE free edit allowed** (for spelling mistakes, typos, etc.)
- After 1 edit, offer is locked (must upgrade to edit further)

---

## ✅ **WHAT ALREADY EXISTS**

### **1. Database Schema**
**Column:** `business_profiles.admin_chat_fallback_approved` (BOOLEAN)
- **Purpose:** Controls whether unclaimed businesses appear in AI chat (Tier 3 fallback pool)
- **Created in:** `three-tier-chat-system.sql`
- **Default:** `false`

**Column:** `business_profiles.menu_preview` (JSONB)
- **Purpose:** Stores up to 5 featured menu items for `claimed_free` tier
- **Constraint:** Max 5 items for `status='claimed_free'` (enforced by DB constraint)
- **File:** `three-tier-chat-system.sql` (lines 52-67)

```sql
ADD CONSTRAINT menu_preview_max_5_items
CHECK (
  status != 'claimed_free'
  OR menu_preview IS NULL
  OR jsonb_array_length(menu_preview) <= 5
);
```

**Table:** `business_offers`
- **Purpose:** Stores multiple offers per business
- **Existing Limits:** Based on `subscription_plan` (starter=1, featured=3, spotlight=unlimited)
- **Trigger:** `enforce_offer_limits` (runs before INSERT)
- **File:** `supabase/migrations/20250929200000_create_multiple_offers_system.sql`

---

### **2. Admin Dashboard - Unclaimed Tab**
**File:** `components/admin/admin-dashboard.tsx` (lines 1981-2065)

**Current Features:**
- ✅ Lists all unclaimed businesses (`status='unclaimed'`)
- ✅ Shows business cards with basic info
- ✅ Displays "Auto-imported" badge
- ✅ No bulk selection UI (needs to be added)

**Filtering Logic:**
```typescript
const allUnclaimedBusinesses = businessList.filter(b => b.status === 'unclaimed')
```

**Missing:**
- ❌ Bulk selection checkboxes
- ❌ "Make AI Eligible" button
- ❌ Import to chat flow

---

### **3. Claim Approval Logic**
**File:** `app/api/admin/approve-claim/route.ts` (lines 86-446)

**Current Behavior:**
- ✅ Updates `status` from `'unclaimed'` to `'claimed_free'`
- ✅ Sets `owner_user_id` to claimer's user ID
- ✅ Sends approval email
- ✅ Creates wallet pass
- ✅ Syncs to CRM (GHL)

**Missing:**
- ❌ Does NOT set `admin_chat_fallback_approved = true`
- ❌ No prompt shown in dashboard for menu items

---

### **4. Three-Tier Chat System**
**File:** `three-tier-chat-system.sql`

**Architecture:**
- **Tier 1:** Paid/Trial businesses (`business_profiles_chat_eligible` view)
  - Carousel cards with photos
  - Unlimited menu items (PDF upload)
  
- **Tier 2:** Claimed Free Lite (`business_profiles_lite_eligible` view)
  - Text-only mentions
  - Must have `status='claimed_free'` AND `menu_preview` with 1-5 items
  - Logic: `jsonb_array_length(bp.menu_preview) >= 1`

- **Tier 3:** Unclaimed Fallback (`business_profiles_ai_fallback_pool` view)
  - Text-only directory
  - Must have `admin_chat_fallback_approved = true`
  - Must be `status='unclaimed'`
  - Auto-imported businesses

**Key Views:**
```sql
-- Tier 3 Fallback Pool
CREATE OR REPLACE VIEW business_profiles_ai_fallback_pool AS
SELECT ...
FROM business_profiles bp
WHERE bp.admin_chat_fallback_approved = true  -- ← GATE
  AND bp.auto_imported = true
  AND bp.status = 'unclaimed'
  AND bp.business_tier = 'free_tier';
```

---

## ❌ **WHAT NEEDS TO BE BUILT**

### **1. Admin Bulk Selection UI**
**File:** `components/admin/admin-dashboard.tsx`

**Requirements:**
- Add state for selected businesses: `useState<Set<string>>(new Set())`
- Add checkbox to each business card
- Add "Select All" checkbox at top
- Add "Make AI Eligible" button (transparent, muted style)
- Add counter badge showing `X selected`

**UI Structure:**
```
┌─────────────────────────────────────────────────┐
│  Unclaimed Listings (47)                        │
│  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ ☐ Select All │  │ Make AI Eligible (3)    │ │
│  └──────────────┘  └─────────────────────────┘ │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ ☐  El Murrino                             │  │
│  │    Italian Restaurant · 4.6★              │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ ☑  The Coffee House                       │  │
│  │    Coffee Shop · 4.8★                     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

### **2. Confirmation Modal**
**New Component:** `components/admin/ai-eligible-confirmation-modal.tsx`

**Design Requirements:**
- Clean slate-themed modal
- NO emojis
- Transparent buttons with borders
- Clear warning text

**Content:**
```
┌─────────────────────────────────────────────┐
│  Make AI Eligible                            │
│                                               │
│  Are you sure?                                │
│                                               │
│  Selected businesses will be immediately      │
│  viewable in the AI chat with basic           │
│  information and review snippets.             │
│                                               │
│  3 businesses selected                        │
│                                               │
│  [ Cancel ]  [ Make AI Eligible ]            │
└─────────────────────────────────────────────┘
```

**Actions:**
- Cancel → Close modal
- Make AI Eligible → Call API, show loading, show success

---

### **3. API Endpoint: Bulk Update**
**New File:** `app/api/admin/bulk-ai-eligible/route.ts`

**Functionality:**
```typescript
POST /api/admin/bulk-ai-eligible
Body: {
  businessIds: string[]  // UUIDs of businesses to update
}

Response: {
  success: true,
  updated: number,
  failed: number,
  errors: string[]
}
```

**Logic:**
1. Validate admin session and city
2. Verify all businesses are in admin's city
3. Verify all businesses are `status='unclaimed'`
4. Update `admin_chat_fallback_approved = true` for all
5. Return summary of successes/failures

**Security:**
- Only update businesses in admin's city (franchise isolation)
- Only update unclaimed businesses (no effect on claimed/approved)
- Use admin Supabase client

---

### **4. Auto-Set AI Eligible on Claim**
**File:** `app/api/admin/approve-claim/route.ts`

**Change Required:**
Add `admin_chat_fallback_approved: true` to the update payload when approving a claim.

**Current Code (line 114):**
```typescript
const { error: updateProfileError } = await supabaseAdmin
  .from('business_profiles')
  .update({
    status: 'claimed_free',
    owner_user_id: claim.user_id,
    email: claim.email,
    // ... other fields ...
  })
  .eq('id', claim.business_id)
```

**New Code:**
```typescript
const { error: updateProfileError } = await supabaseAdmin
  .from('business_profiles')
  .update({
    status: 'claimed_free',
    owner_user_id: claim.user_id,
    email: claim.email,
    admin_chat_fallback_approved: true,  // ✅ NEW: Auto-enable AI chat
    // ... other fields ...
  })
  .eq('id', claim.business_id)
```

**Rationale:**
- Claimed businesses should be AI-visible by default (Tier 2 Lite)
- They can add 1-5 featured items to improve visibility
- No manual admin action required

---

### **5. Dashboard Prompt for Menu Items**
**File:** `components/dashboard/improved-dashboard-home.tsx`

**Requirement:**
For `status='claimed_free'` users, show a prominent card prompting them to add menu items.

**Design:**
```
┌─────────────────────────────────────────────────┐
│  Boost Your AI Chat Visibility                  │
│                                                   │
│  Users can discover you with dish-level          │
│  recommendations                                  │
│                                                   │
│  Add up to 5 featured menu items to help         │
│  customers find you when they ask "Where's       │
│  the best burger?" or "Show me Italian food"     │
│                                                   │
│  [ Add Menu Items ]                              │
└─────────────────────────────────────────────────┘
```

**Logic:**
- Show if `profile.status === 'claimed_free'`
- Show if `!profile.menu_preview || profile.menu_preview.length === 0`
- Hide once they've added items

**CTA:**
- Link to menu management page: `/dashboard/menu`

---

### **6. Offer Restrictions for Free Tier**

#### **A. Limit to 1 Offer**
**File:** `supabase/migrations/20250929200000_create_multiple_offers_system.sql`

**Current Logic:**
```sql
CASE business_plan
  WHEN 'starter' THEN max_offers := 1;
  WHEN 'featured' THEN max_offers := 3;
  WHEN 'spotlight' THEN max_offers := 999;
  ELSE max_offers := 1;
END CASE;
```

**Problem:**
- Uses `subscription_plan` field
- Does NOT check `status='claimed_free'`

**Solution:**
Update `check_offer_limit()` function to also check `status`:

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
    AND bo.status = 'approved'
  WHERE bp.id = NEW.business_id
  GROUP BY bp.subscription_plan, bp.status;
  
  -- ✅ NEW: Handle claimed_free status (max 1 offer)
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

#### **B. One Free Edit Limit**
**New Column:** `business_offers.edit_count` (INTEGER DEFAULT 0)

**Migration Required:**
```sql
-- Add edit_count column to track number of edits
ALTER TABLE business_offers
ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Backfill existing offers (assume they haven't been edited yet)
UPDATE business_offers
SET edit_count = 0
WHERE edit_count IS NULL;

-- Create function to enforce 1 edit limit for claimed_free
CREATE OR REPLACE FUNCTION check_offer_edit_limit()
RETURNS TRIGGER AS $$
DECLARE
  business_status text;
  current_edit_count integer;
BEGIN
  -- Only apply to claimed_free businesses
  SELECT bp.status
  INTO business_status
  FROM business_profiles bp
  WHERE bp.id = NEW.business_id;
  
  IF business_status != 'claimed_free' THEN
    -- No restriction for paid tiers
    RETURN NEW;
  END IF;
  
  -- Get current edit count for THIS offer
  SELECT edit_count
  INTO current_edit_count
  FROM business_offers
  WHERE id = NEW.id;
  
  -- Block if already edited once
  IF current_edit_count >= 1 THEN
    RAISE EXCEPTION 'Free tier offers can only be edited once. You have already used your edit. Upgrade to make unlimited changes.';
  END IF;
  
  -- Increment edit count
  NEW.edit_count := COALESCE(OLD.edit_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for UPDATE operations
CREATE TRIGGER enforce_offer_edit_limit
  BEFORE UPDATE ON business_offers
  FOR EACH ROW
  WHEN (
    -- Only trigger if actual offer data changed (not status/approval by admin)
    NEW.offer_name IS DISTINCT FROM OLD.offer_name OR
    NEW.offer_type IS DISTINCT FROM OLD.offer_type OR
    NEW.offer_value IS DISTINCT FROM OLD.offer_value OR
    NEW.offer_terms IS DISTINCT FROM OLD.offer_terms OR
    NEW.offer_start_date IS DISTINCT FROM OLD.offer_start_date OR
    NEW.offer_end_date IS DISTINCT FROM OLD.offer_end_date
  )
  EXECUTE FUNCTION check_offer_edit_limit();

COMMENT ON COLUMN business_offers.edit_count IS
  'Tracks number of edits for claimed_free tier. Max 1 edit allowed. Resets on upgrade.';
```

**Frontend Handling:**

**Before Edit (Warning):**
Show badge on edit page for `claimed_free` users:
```
┌────────────────────────────────────────────┐
│  Edit Offer                                 │
│  ┌──────────────────────────────────────┐  │
│  │ ⓘ  Free tier: 1 edit remaining       │  │
│  │    Upgrade for unlimited edits        │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Offer Name: [___________________]          │
└────────────────────────────────────────────┘
```

**After 1 Edit (Locked):**
Show error and disable edit button:
```
┌────────────────────────────────────────────┐
│  Cannot Edit Offer                          │
│                                              │
│  You've used your free edit allowance.      │
│                                              │
│  Upgrade to make unlimited changes to       │
│  your offers anytime.                       │
│                                              │
│  [ Cancel ]  [ Upgrade Now ]                │
└────────────────────────────────────────────┘
```

**Dashboard Display:**
Show edit status on free tier offer cards:
```
┌────────────────────────────────────────────┐
│  Your Offer                                 │
│  10% off all drinks                         │
│                                              │
│  [ Edit ] (1 edit remaining)                │
│  or                                          │
│  [ Edit ] (No edits remaining - Upgrade)    │
└────────────────────────────────────────────┘
```

**Free Tier Dashboard Summary:**
Add to `components/dashboard/improved-dashboard-home.tsx`:
```
┌────────────────────────────────────────────┐
│  Your Free Listing Includes                 │
│  ✓ Visible in Discover section              │
│  ✓ Basic AI chat visibility                 │
│  ✓ Up to 5 featured menu items              │
│  ✓ 1 offer (1 free edit)                    │
└────────────────────────────────────────────┘
```

**Offers Tab in Dashboard:**
For `claimed_free` users, show:
- Offer count: "1 of 1 offer" (vs "2 of 3 offers" for paid)
- Edit status badge on each offer card
- Clear upgrade CTA when limit reached

**Menu/Services Tab in Dashboard:**
For `claimed_free` users, show:
- Item count: "3 of 5 items" 
- Clear message: "Add up to 5 featured items for AI recommendations"
- Upgrade CTA: "Upload full menu with unlimited items"

---

## 📊 **DASHBOARD UI REQUIREMENTS**

### **1. Free Tier Dashboard Home**
**File:** `components/dashboard/improved-dashboard-home.tsx`

**Status Pill:**
```
Free Listing
Basic AI visibility • Upgrade for premium carousel cards
```

**"Your Free Listing Includes" Section:**
- ✓ Visible in Discover section
- ✓ Basic AI chat visibility (text mentions)
- ✓ Up to 5 featured menu items
- ✓ 1 offer (1 free edit allowed)

---

### **2. Offers Dashboard Tab**
**File:** TBD (offers management page)

**For `claimed_free` users:**

**Header:**
```
Your Offers (1 of 1)
Free tier includes 1 offer with 1 free edit
```

**Offer Card:**
```
┌────────────────────────────────────────────┐
│  10% off all drinks                         │
│  Discount • Ongoing                         │
│                                              │
│  Status: Active                             │
│  Edits remaining: 1                         │  ← Show this
│                                              │
│  [ Edit Offer ]  [ Delete ]                 │
└────────────────────────────────────────────┘
```

**After 1 edit used:**
```
┌────────────────────────────────────────────┐
│  10% off all drinks                         │
│  Discount • Ongoing                         │
│                                              │
│  Status: Active                             │
│  Edits: None remaining                      │  ← Show this
│                                              │
│  [ View Offer ]  [ Upgrade to Edit ]        │  ← Disable edit
└────────────────────────────────────────────┘
```

**Create Offer Button State:**
- If 0 offers → "Create Offer" (enabled)
- If 1 offer → "Upgrade for More Offers" (disabled, shows upgrade CTA)

---

### **3. Menu/Services Dashboard Tab**
**File:** TBD (menu management page)

**For `claimed_free` users:**

**Header:**
```
Featured Menu Items (3 of 5)
Add up to 5 items for AI recommendations
```

**Add Item Button State:**
- If < 5 items → "Add Item" (enabled)
- If = 5 items → "Upgrade for Unlimited Items" (shows upgrade modal)

**Empty State:**
```
┌────────────────────────────────────────────┐
│  No featured items yet                      │
│                                              │
│  Users can discover you with dish-level     │
│  recommendations                             │
│                                              │
│  Add up to 5 featured items to help         │
│  customers find you when they ask           │
│  "Where's the best burger?"                 │
│                                              │
│  [ Add Your First Item ]                    │
└────────────────────────────────────────────┘
```

---

### **4. Upgrade CTAs**

**When creating 2nd offer:**
```
┌────────────────────────────────────────────┐
│  Offer Limit Reached                        │
│                                              │
│  Free tier includes 1 offer.                │
│                                              │
│  Upgrade to create unlimited offers and     │
│  make changes anytime.                      │
│                                              │
│  [ Cancel ]  [ View Plans ]                 │
└────────────────────────────────────────────┘
```

**When trying to edit after 1 edit used:**
```
┌────────────────────────────────────────────┐
│  Edit Limit Reached                         │
│                                              │
│  You've used your free edit allowance.      │
│                                              │
│  Upgrade to make unlimited changes to       │
│  your offers anytime.                       │
│                                              │
│  [ Cancel ]  [ View Plans ]                 │
└────────────────────────────────────────────┘
```

**When adding 6th menu item:**
```
┌────────────────────────────────────────────┐
│  Item Limit Reached                         │
│                                              │
│  Free tier includes up to 5 featured items. │
│                                              │
│  Upgrade to add unlimited menu items        │
│  and upload full menus via PDF.             │
│                                              │
│  [ Cancel ]  [ View Plans ]                 │
└────────────────────────────────────────────┘
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Admin Bulk Selection UI**
- [ ] Add selection state to `components/admin/admin-dashboard.tsx`
- [ ] Add checkboxes to unclaimed business cards
- [ ] Add "Select All" checkbox
- [ ] Add "Make AI Eligible" button (count badge)
- [ ] Add counter display: "X selected"

### **Phase 2: Confirmation Modal**
- [ ] Create `components/admin/ai-eligible-confirmation-modal.tsx`
- [ ] NO emojis, clean design, transparent buttons
- [ ] Show count of selected businesses
- [ ] Handle cancel and confirm actions

### **Phase 3: API Endpoint**
- [ ] Create `app/api/admin/bulk-ai-eligible/route.ts`
- [ ] Validate admin session and city
- [ ] Verify all businesses are unclaimed and in admin's city
- [ ] Bulk update `admin_chat_fallback_approved = true`
- [ ] Return success/failure summary

### **Phase 4: Loading & Success States**
- [ ] Add loading spinner during API call
- [ ] Show progress: "Updating X of Y businesses..."
- [ ] Show success modal: "X businesses now AI-eligible"
- [ ] Clear selection after success
- [ ] Refresh business list

### **Phase 5: Auto-Set on Claim**
- [ ] Update `app/api/admin/approve-claim/route.ts`
- [ ] Add `admin_chat_fallback_approved: true` to update payload
- [ ] Test: Approve a claim → verify AI eligible is set

### **Phase 6: Dashboard Menu Prompt**
- [ ] Add card to `components/dashboard/improved-dashboard-home.tsx`
- [ ] Show for `status='claimed_free'` with no menu items
- [ ] Message: "Users can discover you with dish-level recommendations"
- [ ] CTA: "Add Menu Items" → link to `/dashboard/menu`
- [ ] Hide once items added

### **Phase 7: Offer Restrictions**
- [ ] Create migration: `20260128000000_claimed_free_offer_restrictions.sql`
- [ ] Update `check_offer_limit()` function to handle `status='claimed_free'`
- [ ] Add `edit_count` column to `business_offers` (INTEGER DEFAULT 0)
- [ ] Create `check_offer_edit_limit()` function (max 1 edit)
- [ ] Create trigger `enforce_offer_edit_limit`
- [ ] Add frontend badge showing "X edits remaining"
- [ ] Add frontend validation and error handling
- [ ] Update dashboard to show edit status on offer cards
- [ ] Test: Try creating 2nd offer → should fail
- [ ] Test: Edit once → should succeed
- [ ] Test: Try editing again → should fail with "Upgrade" CTA

### **Phase 8: Dashboard UI Updates**
- [ ] Update free tier status pill to show "1 offer (1 free edit allowed)"
- [ ] Add offer count header: "Your Offers (1 of 1)"
- [ ] Add "Edits remaining: X" to offer cards
- [ ] Show "None remaining" after edit used
- [ ] Disable edit button when no edits left
- [ ] Add menu item counter: "Featured Items (X of 5)"
- [ ] Show upgrade CTAs for all limits (offers, edits, menu items)
- [ ] Test all limit scenarios in dashboard UI

---

## 🧪 **TESTING CHECKLIST**

### **Admin Bulk Selection**
- [ ] Select 1 business → button shows "Make AI Eligible (1)"
- [ ] Select All → all checkboxes checked
- [ ] Deselect All → all checkboxes unchecked
- [ ] Click "Make AI Eligible" → confirmation modal appears
- [ ] Cancel → modal closes, selection persists
- [ ] Confirm → loading state, then success
- [ ] Check DB: `admin_chat_fallback_approved = true` for selected businesses
- [ ] Refresh page → businesses now AI-eligible

### **Claim Approval Auto-Set**
- [ ] Create unclaimed business
- [ ] User claims business
- [ ] Admin approves claim
- [ ] Check DB: `admin_chat_fallback_approved = true`
- [ ] Check AI chat: Business appears in Tier 2 (if they add menu items)

### **Dashboard Menu Prompt**
- [ ] Log in as `claimed_free` user with no menu items
- [ ] Dashboard shows "Boost Your AI Chat Visibility" card
- [ ] Click "Add Menu Items" → goes to `/dashboard/menu`
- [ ] Add 1 menu item
- [ ] Return to dashboard → card should disappear

### **Offer Restrictions**
- [ ] Log in as `claimed_free` user
- [ ] Create 1st offer → should succeed
- [ ] Try to create 2nd offer → should fail with error message
- [ ] Edit page shows "1 edit remaining" badge
- [ ] Edit the 1st offer → should succeed (first edit)
- [ ] Edit page now shows "No edits remaining - Upgrade"
- [ ] Try to edit again → should fail with error "You've used your free edit"
- [ ] Verify dashboard shows edit status on offer card

---

## 🎨 **DESIGN REQUIREMENTS**

### **Color Palette (NO Bright Colors)**
```css
/* Buttons - Transparent with borders */
.ai-eligible-button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0; /* slate-200 */
}

.ai-eligible-button:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Modal */
.ai-eligible-modal {
  background: #0f172a; /* slate-900 */
  border: 1px solid #334155; /* slate-700 */
}

/* Checkboxes */
.business-checkbox {
  accent-color: #64748b; /* slate-500 */
}
```

### **NO Emojis**
- ❌ Don't use: 🎉, ✅, 🚀, 💚, etc.
- ✅ Use: Plain text, SVG icons, minimal graphics

### **Button Style**
```tsx
<Button
  variant="outline"
  className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-800/50"
>
  Make AI Eligible (3)
</Button>
```

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files:**
1. `components/admin/ai-eligible-confirmation-modal.tsx` - Confirmation modal
2. `app/api/admin/bulk-ai-eligible/route.ts` - Bulk update API
3. `supabase/migrations/20260128000000_claimed_free_offer_restrictions.sql` - Offer restrictions

### **Modified Files:**
1. `components/admin/admin-dashboard.tsx` - Add bulk selection UI
2. `app/api/admin/approve-claim/route.ts` - Auto-set AI eligible
3. `components/dashboard/improved-dashboard-home.tsx` - Add menu prompt
4. `supabase/migrations/20250929200000_create_multiple_offers_system.sql` - Update offer limit function

---

## ✅ **SUMMARY**

### **What Exists:**
- ✅ `admin_chat_fallback_approved` column
- ✅ Unclaimed listings tab
- ✅ `menu_preview` max 5 constraint
- ✅ Offer limits (but needs update for `claimed_free`)
- ✅ Claim approval flow

### **What Needs Building:**
- ❌ Admin bulk selection UI
- ❌ Confirmation modal
- ❌ Bulk update API endpoint
- ❌ Auto-set on claim approval
- ❌ Dashboard menu prompt
- ❌ `claimed_free` offer restrictions (1 offer, 1 free edit)

### **Estimated Effort:**
- **Phase 1-4 (Admin UI):** 4-6 hours
- **Phase 5-6 (Auto-set + Prompt):** 2-3 hours
- **Phase 7 (Offer Restrictions):** 3-4 hours
- **Phase 8 (Dashboard UI Updates):** 3-4 hours
- **Testing:** 2-3 hours
- **Total:** 14-20 hours

---

## 🎯 **FREE TIER USER JOURNEY**

### **Day 1: Claim Approved**
1. Admin approves claim
2. `admin_chat_fallback_approved` auto-set to `true`
3. User logs in → sees welcome modal
4. Dashboard shows: "Boost Your AI Chat Visibility - Add up to 5 featured items"

### **Day 2: Add Menu Items**
1. User clicks "Add Menu Items"
2. Adds 3 featured dishes
3. Dashboard shows: "Featured Items (3 of 5)"
4. User now appears in AI chat (Tier 2 text mentions)

### **Week 1: Create Offer**
1. User creates first offer: "10% off drinks"
2. Offer card shows: "Edits remaining: 1"
3. Offer appears in Discover section

### **Week 2: Edit Offer (First Time)**
1. User spots typo: "10% of drinks" → "10% off drinks"
2. Edits offer successfully
3. Offer card now shows: "Edits: None remaining"
4. Edit button becomes: "Upgrade to Edit"

### **Week 3: Try to Edit Again**
1. User clicks "Edit" 
2. Modal appears: "Edit Limit Reached - Upgrade for unlimited changes"
3. Clear CTA to view plans

### **Month 2: Try to Add 6th Item**
1. User tries to add 6th menu item
2. Modal appears: "Item Limit Reached - Upgrade for unlimited items + PDF upload"
3. Clear path to upgrade

### **Result:**
- Clear, non-annoying limits
- 1 free edit is forgiving (typos happen!)
- Natural upgrade points when hitting limits
- User understands value of paid tier

---

**Ready to begin implementation?** Start with Phase 1 (Admin Bulk Selection UI) as it's the foundation for all other features. 🚀
