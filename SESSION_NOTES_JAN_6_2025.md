# Session Notes - January 6, 2025
## Free Tier + Claim Flow Implementation

---

## 🎯 **What We Built Today (Mock UIs):**

### 1. **Claim Flow** (`/app/claim/page.tsx`)
- ✅ Search for businesses (live search, appears as you type)
- ✅ Business confirmation component
- ✅ Contact info form (business email + website URL)
- ✅ Email verification (6-digit code)
- ✅ Account creation flow
- ✅ Pending approval screen
- ⚠️ **All mock data - not connected to backend yet**

### 2. **Admin Claim Approvals** (`components/admin/admin-dashboard.tsx`)
- ✅ Claim Requests tab in admin sidebar (under "Pending Updates")
- ✅ Risk scoring system (email domain match, duplicate claims, account age, denied history)
- ✅ Confidence badges (Low/Medium/High/Critical Risk)
- ✅ Clickable tabs (Pending/Approved/Denied)
- ✅ Approve/Deny actions
- ✅ Founding member eligibility display
- ⚠️ **All mock data - not connected to backend yet**

### 3. **Import Businesses Tool** (`app/admin/import/page.tsx`)
- ✅ Google Places import interface
- ✅ Filters (location, categories, rating, radius, max results)
- ✅ Cost calculator (shows estimated API cost)
- ✅ Preview mode (shows what will be imported)
- ✅ Batch import functionality
- ⚠️ **Mock UI only - not connected to Google Places API yet**
- ⚠️ **Embedded in admin sidebar under "Control Center"**

### 4. **Admin Sidebar Updates**
- ✅ Moved "Import Businesses" to Control Center section
- ✅ Moved "Claim Requests" under Pending Updates
- ✅ Removed counter from Dashboard Overview
- ✅ Made tabs function correctly (inline content, not redirects)

### 5. **Franchise Setup Updates**
- ✅ Added Google Places API field to Step 3 (API Services) in admin setup wizard
- ✅ Added to showKeys state for show/hide toggle
- ✅ Info boxes explaining cost, purpose, and setup
- ⚠️ Founding Member settings already exist in Pricing & Billing sidebar tab (didn't touch)

### 6. **Database Migration** (`supabase/migrations/20250107000000_add_free_tier_franchise_config.sql`)
- ✅ Created migration adding columns to `franchise_crm_configs`:
  - `google_places_api_key` (TEXT)
  - `founding_member_enabled` (BOOLEAN, default true)
  - `founding_member_total_spots` (INTEGER, default 150)
  - `founding_member_trial_days` (INTEGER, default 90)
  - `founding_member_discount_percent` (INTEGER, default 20)
- ✅ Helper function: `is_founding_member_spot_available(city TEXT)`
- ⚠️ **Migration not run yet**

### 7. **API Updates** (`app/api/admin/franchise/route.ts`)
- ✅ Updated POST endpoint to accept and save new fields
- ✅ Added defaults for founding member settings

### 8. **Documentation**
- ✅ Created `FRANCHISE_FREE_TIER_SETUP.md` (multi-tenant architecture doc)
- ✅ This session notes file

---

## 💡 **CRITICAL REALIZATIONS (Game-Changing):**

### **The Quality Control Strategy:**

We spent significant time refining the approach and landed on this workflow:

#### **Status Flow:**
```
unclaimed (Google import)
    ↓ (user claims)
pending_claim (admin reviews claim request)
    ↓ (admin approves claim)
claimed_free (dashboard access, features locked, can edit profile)
    ↓ (user decides to upgrade, completes action items)
pending_upgrade (admin reviews quality - photos, spelling, completeness)
    ↓ (admin approves upgrade)
claimed_trial OR claimed_paid (features unlock, AI visibility ON)
```

#### **Key Insight: Manual Review is the FEATURE, not the burden**

**Why this works:**
1. **Free tier = minimal review** (just approve claim to prevent fraud)
2. **Paid tier = quality gate** (photos, spelling, completeness)
3. **Ongoing edits = quality maintained** (changes go through Pending Updates)
4. **Slack → Mobile = fast approvals** ("Most approved same day, up to 24 hours")
5. **Scales later** (hire reviewer, franchise owners review their own, AI-assist)

#### **Admin Approval Queues:**

| Queue | Purpose | When | What Admin Checks |
|-------|---------|------|-------------------|
| **Claim Requests** | Prevent fraud | Unclaimed → Claimed Free | Email legitimacy, risk score, no red flags |
| **Pending Review** | Quality gate | Claimed Free → Trial/Paid | Photo quality, spelling, completeness, no spam |
| **Pending Updates** | Maintain quality | Any edit to approved listing | Professional appearance, accurate info |

---

## 🗂️ **Database Architecture (Finalized):**

### **Status States (business_profiles table):**

| Status | Owner? | Dashboard? | AI Visible? | Features? | Description |
|--------|--------|------------|-------------|-----------|-------------|
| `unclaimed` | ❌ | ❌ | ❌ | None | Google import, Discover only |
| `pending_claim` | ⏳ | ❌ | ❌ | None | Claim submitted, awaiting admin approval |
| `claimed_free` | ✅ | ✅ | ❌ | Edit only | Can view/edit, all features locked |
| `pending_upgrade` | ✅ | ✅ | ❌ | Limited | Submitted action items, awaiting review |
| `claimed_trial` | ✅ | ✅ | ✅ | Featured tier | 90-day trial, full Featured access |
| `claimed_paid` | ✅ | ✅ | ✅ | Tier-based | Active subscription |
| `pending_update` | ✅ | ✅ | ✅ | Current tier | Made edit to approved listing |

### **New Columns Needed (business_profiles):**

Already discussed in memories, but refined:
```sql
ALTER TABLE business_profiles
ADD COLUMN owner_user_id UUID REFERENCES auth.users(id),
ADD COLUMN status TEXT CHECK (status IN ('unclaimed', 'pending_claim', 'claimed_free', 'pending_upgrade', 'claimed_trial', 'claimed_paid', 'pending_update')),
ADD COLUMN visibility TEXT CHECK (visibility IN ('discover_only', 'ai_enabled')),
ADD COLUMN founding_member BOOLEAN DEFAULT false,
ADD COLUMN founding_member_discount INTEGER DEFAULT 0,
ADD COLUMN trial_start_date TIMESTAMP,
ADD COLUMN trial_end_date TIMESTAMP,
ADD COLUMN google_place_id TEXT UNIQUE,
ADD COLUMN auto_imported BOOLEAN DEFAULT false;
```

### **New Table Needed (claim_requests):**

```sql
CREATE TABLE claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')),
  verification_method TEXT CHECK (verification_method IN ('email', 'manual')),
  verification_code TEXT,
  business_email TEXT,
  business_website TEXT,
  risk_score INTEGER, -- 0-100
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  email_domain_match BOOLEAN,
  duplicate_claims INTEGER DEFAULT 0,
  denied_claims INTEGER DEFAULT 0,
  is_founding_member BOOLEAN DEFAULT false,
  founding_member_spot_number INTEGER,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id, status) -- One active claim per business per user
);
```

---

## 🎨 **UX Journey (User Perspective):**

### **Phase 1: Discovery**
- Scans QR code from promo pack or finds listing
- Lands on `/claim` page
- "You're already on QWIKKER!" (with analytics if available)

### **Phase 2: Claim** (~2 minutes)
1. Search business name (live results)
2. Confirm: "Is this your business?"
3. Enter business email + website (optional)
4. Email verification (6-digit code sent to business email)
5. Create account (password)
6. "Thanks! We're reviewing your claim. Most approved same day, up to 24 hours."

### **Phase 3: Claimed - Free Tier** (Days? Weeks?)
- Dashboard access granted
- Everything locked except "Edit Profile"
- Business Status: "Free Listing (Manage)"
- Big banner: "🏅 Upgrade to Featured - 90 days FREE for founding members!"
- Activity feed visible (read-only)
- Action items hidden until upgrade decision

### **Phase 4: Decides to Upgrade** (~10-20 minutes)
- Clicks "Upgrade" → Founding member offer shown
- Action Items checklist appears:
  - ✅ Add high-quality photos (or confirm Google photos)
  - ✅ Write compelling description
  - ✅ Add/confirm menu or services
  - ✅ Verify opening hours
  - ✅ Add social media links
  - ✅ Confirm contact info
- Must complete ALL items
- "Submit for Review" button
- "We're reviewing your profile! Most approved same day."

### **Phase 5: Approved - Trial/Paid**
- Email: "Congratulations! Your premium listing is live 🎉"
- All features unlock
- NOW visible in AI recommendations
- Trial countdown begins (90 days)
- Dashboard shows full capabilities

### **Phase 6: Ongoing Use**
- Makes any edit → Goes to "Pending Updates"
- Slack notification to admin
- Admin reviews quickly
- Changes go live

---

## 🔔 **Slack Notifications (Critical for Speed):**

### **Setup:**
- Separate channels per franchise: `#qwikker-bournemouth-claims`, `#qwikker-bournemouth-upgrades`, etc.
- OR per type: `#qwikker-claims`, `#qwikker-upgrades`, `#qwikker-edits`

### **Message Format:**
```
🔔 New Claim Request
Business: Ember & Oak Bistro
User: john@emberoak.co.uk
Risk: ✅ LOW RISK (95% confidence)
Action: [Approve] [Deny] [View Details]
```

```
⭐ Business Ready for Upgrade Review
Business: Ember & Oak Bistro
Plan: Featured (90-day trial - Founding Member)
Action Items: 6/6 complete ✅
Action: [Review Now] [View Profile]
```

```
✏️ Profile Update Pending
Business: Ember & Oak Bistro
Changed: Updated opening hours
Action: [Approve] [Reject] [View Changes]
```

---

## 🚀 **What's Next (Priority Order):**

### **Phase 1: Database Foundation** (Week 1)
1. ✅ Run the franchise config migration (Google Places API key)
2. ❌ Create `claim_requests` table migration
3. ❌ Add new columns to `business_profiles` (status, visibility, owner_user_id, etc.)
4. ❌ Create indexes for performance
5. ❌ Update RLS policies for new columns
6. ❌ Test migrations on dev database

### **Phase 2: Backend Integration** (Week 2)
1. ❌ Build claim flow API routes:
   - `/api/claim/search` (search businesses)
   - `/api/claim/verify-email` (send verification code)
   - `/api/claim/create` (create claim request)
2. ❌ Email service integration (Resend)
   - Verification emails
   - Approval notifications
   - Welcome emails
3. ❌ Admin approval API:
   - `/api/admin/claims/approve`
   - `/api/admin/claims/deny`
4. ❌ Slack webhook integration
5. ❌ Link users to businesses (owner_user_id)

### **Phase 3: Dashboard Updates** (Week 2-3)
1. ❌ Add free tier to `isFeatureUnlocked()` logic
2. ❌ Lock quick action cards for free tier (except Edit Profile)
3. ❌ Update Business Status card for free tier
4. ❌ Hide/show action items based on tier
5. ❌ Add upgrade banner for free tier
6. ❌ Test dashboard with each status state

### **Phase 4: Google Places Integration** (Week 3)
1. ❌ Build import API route:
   - `/api/admin/import/search` (Google Nearby Search)
   - `/api/admin/import/details` (Google Place Details)
   - `/api/admin/import/photos` (Google Place Photos)
   - `/api/admin/import/batch` (Batch create businesses)
2. ❌ Test with real Google API key
3. ❌ Handle rate limiting
4. ❌ Store Google Place IDs for deduplication

### **Phase 5: Testing & Polish** (Week 4)
1. ❌ End-to-end testing (unclaimed → claimed_paid)
2. ❌ Test all admin approval flows
3. ❌ Test Slack notifications
4. ❌ Test email deliverability
5. ❌ Test fraud prevention (duplicate claims, etc.)
6. ❌ UI/UX refinements
7. ❌ Mobile responsiveness checks

### **Phase 6: Launch Prep** (Week 5)
1. ❌ Import 200 Bournemouth businesses
2. ❌ Verify all listings in Discover
3. ❌ Test claim flow with friends/family
4. ❌ Prepare promo packs (physical materials)
5. ❌ Launch to users first (marketing campaign)
6. ❌ Then hand-deliver to businesses (Week 6-7)

---

## ⚠️ **Open Questions / Decisions Needed:**

### **1. Founding Member Spot Tracking**
- **Question:** How do we track "first 150 claims" across multiple claim attempts?
- **Options:**
  - A) First 150 APPROVED claims
  - B) First 150 claim ATTEMPTS (even if denied)
  - **Recommendation:** Option A (first 150 approved)

### **2. Claim Denial Handling**
- **Question:** What happens if admin denies a claim?
- **Current thinking:**
  - Email with reason
  - Can resubmit with better proof
  - 3 denials = contact support
- **Needs:** Denial reason dropdown in admin UI

### **3. Free Tier Edit Approval**
- **Question:** Auto-approve minor edits or review everything?
- **Current thinking:** Review everything (at least initially)
- **Future:** Auto-approve minor changes (hours, phone) if business has good history

### **4. Action Items Pre-fill for Claimed Businesses**
- **Question:** If Google provided photos/description, mark as complete or require confirmation?
- **Current thinking:** Mark as complete but allow replacement
- **Needs:** Clear UI showing "Google provided" vs "Owner uploaded"

### **5. Trial Cancellation**
- **Question:** What happens if trial expires and they don't pay?
- **Options:**
  - A) Stay on claimed_free (features lock)
  - B) Go back to unclaimed (harsh)
  - C) Grace period (14 days)
- **Recommendation:** Option A with 7-day grace period

---

## 🎯 **Success Metrics (How We'll Know It's Working):**

### **Conversion Funnel:**
```
200 imports (100%)
  ↓
100 claims (50% claim rate)
  ↓
75 approved claims (75% approval rate)
  ↓
50 upgrade attempts (67% upgrade rate from claimed_free)
  ↓
40 approved upgrades (80% approval rate)
  ↓
30 convert to paid after trial (75% trial-to-paid)
```

**Target: 30 paying customers = £1,770-3,870/month MRR**

### **Admin Efficiency:**
- Claim approval time: <2 hours average
- Upgrade approval time: <4 hours average
- Edit approval time: <1 hour average

### **Quality Indicators:**
- Rejection rate <25% (not too strict)
- Resubmission rate <30% (clear guidance)
- Zero spam/offensive content
- Business satisfaction >4/5 stars

---

## 🔧 **Technical Notes:**

### **Multi-Tenancy:**
- All new features are franchise-aware
- Google Places API key stored per franchise
- Founding member settings per franchise
- Slack webhooks per franchise
- Approval queues filtered by city

### **Performance Considerations:**
- Index on `business_profiles.status` for filtering
- Index on `business_profiles.visibility` for AI queries
- Index on `claim_requests.business_id` for lookups
- Cache Google Places results (avoid redundant API calls)

### **Security:**
- Email verification required for claims
- RLS policies on claim_requests table
- Admin-only access to approval endpoints
- Rate limiting on claim attempts (prevent spam)
- API keys encrypted in Supabase Vault (future enhancement)

---

## 📝 **Files Changed Today:**

1. `/app/claim/page.tsx` - NEW (claim flow UI)
2. `/components/claim/email-verification.tsx` - NEW
3. `/components/claim/create-account.tsx` - NEW
4. `/components/claim/pending-approval.tsx` - NEW
5. `/app/admin/import/page.tsx` - NEW (import tool)
6. `/components/admin/admin-dashboard.tsx` - MODIFIED (added claim requests tab)
7. `/components/admin/admin-setup-page.tsx` - MODIFIED (added Google Places API)
8. `/components/ui/tabs.tsx` - NEW (for claim tabs)
9. `/supabase/migrations/20250107000000_add_free_tier_franchise_config.sql` - NEW
10. `/app/api/admin/franchise/route.ts` - MODIFIED (save new fields)
11. `/components/admin/franchise-setup-form.tsx` - MODIFIED (but NOT used? confusion)
12. `/FRANCHISE_FREE_TIER_SETUP.md` - NEW (documentation)
13. `/SESSION_NOTES_JAN_6_2025.md` - NEW (this file)

---

## 🤔 **Confusion Points to Clarify Tomorrow:**

1. **What is `franchise-setup-form.tsx`?**
   - Is it used? Where?
   - Different from admin-setup-page.tsx?
   - Should we delete it?

2. **Which page is "Step 3 of admin setup"?**
   - Confirmed: `admin-setup-page.tsx`
   - User sees it at `/admin/setup` (probably)

3. **Caching issues**
   - Google Places API shows up in code but not in browser
   - User needs to hard refresh (Cmd+Shift+R)
   - May need to clear `.next` folder

---

## 💭 **Final Thoughts:**

This is a really well-thought-out system. The key insight is that **manual review becomes DOABLE at scale** when:
1. You're only reviewing people who opted in (not 200 imports)
2. You have instant mobile notifications (Slack)
3. The UI makes it a 2-click process (approve/deny)
4. The quality gate creates value (curated vs directory)

The founding member program + free tier is a brilliant way to solve the chicken-egg problem while maintaining quality control.

**Next session: Pick up with database migrations and start wiring up the backend.**

---

## ⏰ **Estimated Timeline:**

- Week 1: Database + Backend APIs (40 hours)
- Week 2: Dashboard updates + Email integration (30 hours)
- Week 3: Google Places import + Testing (30 hours)
- Week 4: Polish + Bug fixes (20 hours)
- Week 5: Import businesses + Launch prep (10 hours)

**Total: ~130 hours of focused development**

With your involvement + my assistance: **4-5 weeks to launch-ready.**

---

**Sleep well! Tomorrow we build! 🚀**

