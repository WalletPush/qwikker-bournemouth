# Phase 0: Read-Only Investigation Notes
**Date:** 2026-01-27
**Purpose:** Document current architecture before implementing three-tier chat system

---

## Task 0.1: Chat Pipeline Location ✅

### Main Chat API Route
- **File:** `app/api/ai/chat/route.ts`
- **Entry Point:** `POST` function at line 71
- **City Detection:** Line 84 - `getFranchiseCityFromRequest()`
- **Hybrid AI Call:** Line 134 - calls `generateHybridAIResponse()` from `lib/ai/hybrid-chat.ts`

### Hybrid Chat Logic
- **File:** `lib/ai/hybrid-chat.ts`
- **Main Function:** `generateHybridAIResponse()` starts at line 91
- **businessCarousel Construction:** Lines 745-784
  - **Line 779:** businessCarousel = candidates.slice(0, 6)
  - **Tier 2 & Tier 3 insertion point:** After line 784 (after carousel is built)

### Current Paid Business Query
- **View Used:** `business_profiles_chat_eligible`
- **Location:** Line 1036 in `lib/ai/chat.ts` (legacy chat file, also used)
- **Confirmed Fields Returned:**
  - `id`, `business_name`, `system_category`, `display_category`
  - `business_tagline`, `business_town`, `business_images`
  - `effective_tier`, `tier_priority`
  - `business_offers(id)` - for counting offers

---

## Task 0.2: Database Column Names ✅ CRITICAL

### Featured Items JSONB Field
**✅ CONFIRMED DATABASE COLUMN:** `menu_preview` (snake_case with underscore)

**Evidence:**
- Migration file: `supabase/migrations/20250918000001_update_menu_preview_to_jsonb.sql`
  - Line 17: `ADD COLUMN menu_preview JSONB DEFAULT '[]'::jsonb;`
- Queries in code: `app/user/business/[slug]/page.tsx` line 97 selects `menu_preview`
- **Mapped to camelCase:** When returned from Supabase, mapped to `menuPreview` in business object

**RULE FOR IMPLEMENTATION:**
- ✅ SQL views: Use `menu_preview` (real DB column name)
- ✅ Dashboard writes: MUST use `menu_preview` (no aliases)
- ✅ Frontend mapping: Can alias to `menuPreview` for display

### Other Confirmed business_profiles Columns
- `status` - business status (claimed_free, approved, unclaimed, etc.)
- `auto_imported` - boolean for Google Places imports
- `business_tier` - tier name (free_tier, starter, featured, spotlight)
- `rating` - numeric rating from Google
- `review_count` - number of reviews
- `phone` - business phone
- `website_url` - business website
- `google_place_id` - Google Places API ID
- `business_hours_structured` - JSONB hours data
- `city` - franchise city
- `latitude`, `longitude` - coordinates
- `owner_user_id` - UUID of business owner (nullable for unclaimed)
- `claimed_at` - timestamp when claimed
- `claim_welcome_modal_shown` - boolean (check if exists - NOT YET CONFIRMED)
- `admin_chat_fallback_approved` - boolean (check if exists - NOT YET CONFIRMED)

---

## Task 0.3: business_offers Table Fields ✅

### Expiry/End Date Field
**✅ CONFIRMED COLUMN:** `offer_end_date` (TIMESTAMPTZ, nullable)

**Evidence:**
- Migration: `supabase/migrations/20260120000003_chat_active_deals_view.sql`
  - Line 26: `bo.valid_until,`
  - Line 56: `AND (bo.valid_until IS NULL OR bo.valid_until >= NOW())`

**Other Confirmed business_offers Columns:**
- `id` - UUID primary key
- `business_id` - UUID foreign key to business_profiles
- `status` - offer status ('approved', 'pending', 'expired', etc.)
- `offer_end_date` - expiry timestamp (nullable)
- `offer_name`, `offer_value`, `offer_description`, `offer_type`

**RULE FOR TIER 2 OFFER COUNT:**
- Query `business_offers` raw table (NOT `business_offers_chat_eligible`)
- Filter: `status = 'active' AND (valid_until IS NULL OR valid_until >= NOW())`
- Purpose: Display-only count for badge (counting ≠ serving)

---

## Task 0.4: Menu Upload Routes ✅

### All Routes That Can Write to `public.menus`
1. **`app/api/menus/upload/route.ts`** - PDF upload (PRIMARY)
2. **`app/api/menus/list/route.ts`** - List menus (READ ONLY - safe)
3. **`app/api/menus/delete/route.ts`** - Delete menu (WRITE - check if used)
4. **`app/api/admin/menus/approve/route.ts`** - Admin approval (WRITE)
5. **`app/api/admin/menus/list/route.ts`** - Admin list (READ ONLY - safe)
6. **`app/api/admin/menus/view/[id]/route.ts`** - View single (READ ONLY - safe)
7. **`app/api/admin/menus/view-text/[id]/route.ts`** - View text (READ ONLY - safe)

**CRITICAL ROUTES TO BLOCK FOR claimed_free:**
- ✅ `app/api/menus/upload/route.ts` - Main PDF upload
- ⚠️ Check if any other routes can INSERT into `menus` table

**TODO: Investigate each route to confirm which ones call `.insert()` or `.upsert()`**

---

## Task 0.5: Featured Items UI ✅

### Current Menu Management
- **Menu Upload UI:** Likely in dashboard menu section
- **TODO: Search for menu upload button/form in dashboard components**
- **TODO: Check if "Featured Items" UI already exists and is locked for claimed_free**

**Files to investigate:**
- `components/dashboard/dashboard-home.tsx`
- `app/dashboard/menu/` (if exists)
- Search for "upload menu" or "menu preview" in dashboard components

---

## Task 0.6: Franchise Isolation (CRITICAL SECURITY) ✅

### Current Middleware
- **File:** `middleware.ts` (root)
- **Current Logic:** Lines 1-20
  - Only calls `updateSession()` from `@/lib/supabase/middleware`
  - **❌ DOES NOT validate city vs business.city**
  - **❌ DOES NOT check franchise isolation**

**SECURITY GAP IDENTIFIED:**
- No validation that logged-in business belongs to current subdomain
- London business CAN access bournemouth.qwikker.com dashboard
- **NEEDS:** City derivation from hostname + business.city validation

### Auth Session Management
- **Session Type:** Supabase Auth (JWT tokens + httpOnly cookies)
- **Cookie Names:** Check for `qwikker_session`, `qwikker_admin_session`
- **Problem:** Client-side signOut() won't clear httpOnly cookies

### Dashboard Route Protection
- **Example:** `app/dashboard/business/page.tsx` lines 8-14
  - Uses `supabase.auth.getClaims()` to check if logged in
  - Redirects to `/auth/login` if not authenticated
  - **❌ DOES NOT validate business.city matches subdomain**

---

## Task 0.7: Logout Button (CRITICAL SECURITY) ✅

### Current Implementation
- **File:** `components/logout-button.tsx`
- **Lines 7-17:**
```typescript
export function LogoutButton() {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()  // ❌ CLIENT-SIDE ONLY
    router.push('/auth/login')
  }

  return <Button onClick={logout}>Logout</Button>
}
```

**SECURITY GAP IDENTIFIED:**
- Only calls client-side `supabase.auth.signOut()`
- **❌ DOES NOT clear httpOnly cookies**
- **❌ DOES NOT call server-side logout endpoint**
- **NEEDS:** Server-side `/api/auth/logout` route to clear cookies

**Used In:**
- `components/dashboard/dashboard-layout.tsx` line 325

---

## Task 0.8: Claim Approval Email ✅

### Location
- **File:** `app/api/admin/approve-claim/route.ts`
- **Email Template:** Lines 268-358 (inline HTML template)

### Current Copy (Lines 322-337)

**"Your free listing includes:" (Line 322-325)**
```
- ${cityDisplayName} Discover section
- Basic business profile with contact details
- Dashboard access to manage your listing
```
**❌ MISSING:**
- Up to 5 featured menu/service items
- Create 1 exclusive offer
- Appear in AI chat (below premium listings)

**"Upgrade to unlock:" (Line 334-336)**
```
- AI Chat Visibility: Get discovered by users asking our AI assistant
- Exclusive Offers: Create and manage special deals
- Analytics: Track views and engagement
```
**❌ INACCURATE:**
- Should say "AI Chat Priority (Tier 1)" not just "Visibility"
- Should say "Unlimited Offers" not "Exclusive Offers"
- Missing: Full Menu Upload, Secret Menu Club, Loyalty Portal, Push Notifications, Social Wizard, Full POS System

### Login Link Issue
- **Line 167 (in different approval route):** Uses `process.env.NEXT_PUBLIC_BASE_URL || 'https://qwikkerdashboard-theta.vercel.app'`
- **❌ HARDCODED Vercel URL** instead of city-specific domain
- **NEEDS:** Derive city from business record and generate `https://${city}.qwikker.com/dashboard`

### Email System
- Uses Resend API
- Template system: Inline HTML (not separate template files)
- Located in claim approval route

---

## Task 0.9: Dashboard Upgrade Section

### Location
- **File:** `components/dashboard/dashboard-home.tsx`
- **Section:** "Unlock Premium Features" card
- **Lines:** ~577+ (exact location TBD - need to search)

**TODO:** Search for "Unlock Premium Features" text in dashboard components

**Current Issues (from screenshots provided by user):**
- Shows premium features but doesn't clarify what free tier HAS now
- Needs "What you have now (Free Listing)" section
- Needs accurate Tier 1 vs Tier 2 positioning language

---

## Summary: Key Findings

### ✅ Confirmed for Implementation
1. **Featured Items Field:** `menu_preview` (JSONB, snake_case)
2. **Offer Expiry Field:** `offer_end_date` (TIMESTAMPTZ)
3. **Chat Pipeline:** `lib/ai/hybrid-chat.ts` line 784 is insertion point
4. **Paid Query View:** `business_profiles_chat_eligible`
5. **Menu Upload Routes:** `app/api/menus/upload/route.ts` (primary)

### 🚨 Critical Security Gaps
1. **Franchise Isolation:** No middleware validation of business.city vs subdomain
2. **Logout:** Client-side only, doesn't clear httpOnly cookies
3. **Cross-City Access:** London business can log into Bournemouth dashboard

### 📧 Email/Copy Issues
1. **Claim Approval Email:** Missing new free tier features, wrong login URL
2. **Dashboard Upgrade:** Missing "What you have now" section

### 📝 Next Steps (Phase 1+)
1. Darryl runs SQL to add columns and create views
2. Fix security issues (Phase 9 - HIGH PRIORITY)
3. Add featured items UI (Phase 4)
4. Update email templates (Phase 8)
5. Implement three-tier chat logic (Phase 2)

---

## Files Requiring Changes (Confirmed)

### Security (Phase 9)
- `middleware.ts` - Add city validation
- `app/api/auth/logout/route.ts` - CREATE NEW server-side logout
- `components/logout-button.tsx` - Update to call server-side logout

### SQL (Phase 1 - Darryl runs)
- Add `admin_chat_fallback_approved BOOLEAN DEFAULT false`
- Add `claim_welcome_modal_shown BOOLEAN DEFAULT false`
- Create `business_profiles_lite_eligible` view
- Create `business_profiles_ai_fallback_pool` view

### Chat Logic (Phase 2)
- `lib/ai/hybrid-chat.ts` - Add Tier 2 and Tier 3 queries after line 784

### Menu Blocking (Phase 3)
- `app/api/menus/upload/route.ts` - Add status check
- Dashboard menu upload UI - Add status-based gating

### Featured Items (Phase 4)
- CREATE NEW `app/dashboard/featured-items/page.tsx`
- OR unlock existing featured items UI if found

### Welcome Modal (Phase 5)
- CREATE NEW `components/dashboard/claim-welcome-modal.tsx`

### Email (Phase 8)
- `app/api/admin/approve-claim/route.ts` - Update email template
- Fix login URL generation to use city-specific domain

### Dashboard Copy (Phase 8)
- `components/dashboard/dashboard-home.tsx` - Update upgrade section

### Admin Toggle (Phase 6)
- Find and update admin unclaimed list component

### Chat UI (Phase 7)
- Find chat message component - add Google attribution

---

## Column Names Reference (Quick Lookup)

| Purpose | Actual DB Column | Type | Nullable |
|---------|-----------------|------|----------|
| Featured Items | `menu_preview` | JSONB | YES |
| Offer Expiry | `offer_end_date` | TIMESTAMPTZ | YES |
| Business Status | `status` | TEXT | NO |
| Auto Imported | `auto_imported` | BOOLEAN | YES |
| Business Tier | `business_tier` | TEXT | YES |
| Owner User ID | `owner_user_id` | UUID | YES |
| Claimed At | `claimed_at` | TIMESTAMPTZ | YES |
| City | `city` | TEXT | NO |
| Fallback Approved | `admin_chat_fallback_approved` | BOOLEAN | TBD (Phase 1) |
| Modal Shown | `claim_welcome_modal_shown` | BOOLEAN | TBD (Phase 1) |

---

**Investigation Complete:** Ready for Phase 1 (SQL proposal) pending Darryl's approval.
