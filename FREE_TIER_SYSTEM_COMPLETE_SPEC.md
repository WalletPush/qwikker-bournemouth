# FREE TIER SYSTEM - COMPLETE SPECIFICATION
**Date:** January 8, 2026  
**Critical:** DO NOT BREAK EXISTING FOUNDING MEMBER FLOW!

---

## 🎯 CURRENT DATABASE STRUCTURE (DO NOT CHANGE!)

### `business_profiles` (EXISTING)
- `status` values: **"incomplete"**, **"approved"** (currently used)
- `business_tier`: "free_trial", "featured", "spotlight", "qwikker_picks"
- `current_subscription_id`: UUID → links to business_subscriptions
- `is_founder`: BOOLEAN (founding member flag)
- `city`: TEXT (multi-tenant!)

### `business_subscriptions` (EXISTING)
- `status`: **"trial"** or **"active"** (subscription status!)
- `is_in_free_trial`: BOOLEAN
- `free_trial_start_date` / `free_trial_end_date`
- `tier_id`: UUID → links to subscription tier
- `billing_cycle`: "monthly"
- `business_id`: UUID → links to business_profiles

### `franchise_crm_configs` (EXISTING)
- `city`: TEXT (primary key)
- Per-franchise settings for founding member program
- Will add: Google Places API key, trial length settings

---

## 🚀 TWO COMPLETELY SEPARATE FLOWS

### FLOW 1: FOUNDING MEMBER (EXISTING - DO NOT TOUCH!)

**Purpose:** Business self-signup with free trial

**Journey:**
1. Business fills out onboarding form
2. `status = "incomplete"` → completes action items
3. Submits for review → `status = "pending_review"` (maybe? or stays "incomplete"?)
4. **Admin Dashboard:** Shows in **"Pending Applications"** tab
5. Admin approves → `status = "approved"`
6. **Subscription created:** 
   - `business_subscriptions` row created
   - `is_in_free_trial = TRUE`
   - `status = "trial"`
   - Featured tier (90-120 days, set by franchise)
7. **Full features unlocked:**
   - Can create offers
   - Can create secret menu
   - Visible in AI recommendations
   - All dashboard features unlocked
8. Trial expires → can upgrade/downgrade to Starter/Featured/Spotlight (paid)

**Database state when approved:**
- `business_profiles.status = "approved"`
- `business_profiles.current_subscription_id = [UUID]`
- `business_subscriptions.status = "trial"`
- `business_subscriptions.is_in_free_trial = TRUE`

---

### FLOW 2: FREE TIER (NEW - WHAT WE'RE BUILDING!)

**Purpose:** Google Places import → Business claims → Upgrades

#### PHASE 1: CLAIM PHASE

**Journey:**
1. **Admin imports from Google Places API**
   - `status = "unclaimed"`
   - `auto_imported = TRUE`
   - `google_place_id = [place_id]` (for deduplication)
   - `visibility = "discover_only"`
   - Basic info only (name, address, category from Google)
   - **NO subscription created**
   - **NO owner_user_id**

2. **Business claims their listing** (`/claim` page)
   - User searches, finds business, submits claim
   - `claim_requests` table: new row created
   - `status = "pending_claim"`
   - **Slack notification:** "🔔 New claim awaiting approval - [Business Name] - [City]"

3. **Admin reviews claim** (Claim Requests tab)
   - **Admin Dashboard:** Shows in **"Claim Requests"** tab
   - Risk scoring (email domain match, duplicate claims, etc.)
   - Admin clicks Approve or Deny

4. **Admin approves claim**
   - `business_profiles.status = "claimed_free"`
   - `business_profiles.owner_user_id = [user_id]`
   - `business_profiles.claimed_at = NOW()`
   - `claim_requests.status = "approved"`
   - User gets dashboard access

**Free Tier Dashboard State:**
- ✅ Can view dashboard
- ✅ Can edit profile (name, hours, description)
- ❌ Cannot create offers (locked)
- ❌ Cannot create secret menu (locked)
- ❌ Cannot create events (locked)
- ❌ Not visible in AI chat (visibility = "discover_only")
- ❌ No analytics (locked)
- ❌ No social wizard (locked)
- Big banner: "Upgrade to unlock all features + free trial!"

**Database state after claim approved:**
- `business_profiles.status = "claimed_free"`
- `business_profiles.owner_user_id = [UUID]`
- `business_profiles.visibility = "discover_only"`
- **NO subscription** (or subscription.status = "free" if we create one)

---

#### PHASE 2: UPGRADE PHASE

**Journey:**
5. **Business clicks "Upgrade"**
   - Action Items checklist appears (SAME as founding member)
   - Must complete ALL items:
     - ✅ Upload high-quality photos
     - ✅ Write compelling description
     - ✅ Confirm opening hours
     - ✅ Add/confirm menu
     - ✅ Verify contact info
     - ✅ Add social links

6. **Business submits for review**
   - `status = "pending_upgrade"`
   - **Admin Dashboard:** Shows in **"Pending Applications"** tab (alongside founding members!)
   - **Slack notification:** "⭐ Business ready for upgrade review - [Business Name] - [City]"

7. **Admin reviews quality** (Pending Applications tab)
   - Reviews photos, spelling, completeness (SAME quality gate as founding member)
   - Admin clicks Approve or Deny

8. **Admin approves upgrade**
   - Admin chooses: Free Trial OR Paid
   - If Free Trial:
     - `business_subscriptions` row created
     - `is_in_free_trial = TRUE`
     - `free_trial_start_date = NOW()`
     - `free_trial_end_date = NOW() + [franchise trial days]`
     - `status = "trial"`
     - Trial length from `franchise_crm_configs` (per city!)
   - If Paid:
     - `business_subscriptions` row created
     - `is_in_free_trial = FALSE`
     - `status = "active"`
   - **Business state updated:**
     - `business_profiles.status = "approved"`
     - `business_profiles.visibility = "ai_enabled"`
     - `business_profiles.current_subscription_id = [UUID]`

9. **Full features unlocked!**
   - Can create offers
   - Can create secret menu
   - Can create events
   - Visible in AI recommendations
   - Analytics unlocked
   - All premium features based on tier

**Database state after upgrade approved:**
- `business_profiles.status = "approved"` (SAME as founding member!)
- `business_profiles.visibility = "ai_enabled"`
- `business_profiles.current_subscription_id = [UUID]`
- `business_subscriptions.status = "trial"` OR `"active"`
- `business_subscriptions.is_in_free_trial = TRUE` OR `FALSE`

---

## 📊 ADMIN DASHBOARD TABS

### 1. **Claim Requests Tab** (NEW!)
**Shows:** Businesses with `status = "pending_claim"`

**Purpose:** Fraud prevention - verify legitimate claim

**Display:**
- Business name, address, category
- Claimer email, account age
- Risk score (email domain match, duplicate claims, denied history)
- Risk level badge (Safe, Medium, High, Critical)
- Founding member eligibility (#47 of 150)

**Actions:**
- Approve → `status = "claimed_free"`
- Deny → `claim_requests.status = "denied"`

**Slack notification on claim:**
```
🔔 New Claim Request - Bournemouth
Business: The Larder House
Claimer: sarah@thelarderhouse.com
Risk: ✅ LOW (Email matches business name)
Spot: #27/150 (Founding Member Eligible)
[View in Dashboard]
```

---

### 2. **Pending Applications Tab** (EXISTING - Updated!)
**Shows:** Businesses with `status = "pending_review"` (founding member) OR `status = "pending_upgrade"` (free tier)

**Purpose:** Quality control - review photos, spelling, completeness

**Display:**
- Business name, category
- Profile completion: 100%
- Action items: 6/6 complete ✅
- Photos uploaded, description written, etc.
- Source: "Founding Member Signup" OR "Free Tier Upgrade"

**Actions:**
- Approve → `status = "approved"` + create subscription
- Deny → `status = "incomplete"` OR `"claimed_free"` (send back)

**Slack notification on submission:**
```
⭐ Business Ready for Review - Bournemouth
Business: The Larder House
Type: Free Tier Upgrade (was claimed listing)
Action Items: 6/6 Complete ✅
[Review Now]
```

---

## 🗄️ NEW DATABASE COLUMNS NEEDED

### `business_profiles` (ADD THESE):

```sql
-- Ownership
owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL

-- Extended status values (ADD to existing constraint)
-- Current: 'incomplete', 'approved'
-- Add: 'unclaimed', 'pending_claim', 'claimed_free', 'pending_upgrade'
status TEXT CHECK (status IN (
  'incomplete',      -- Existing: Founding member filling out profile
  'pending_review',  -- Existing?: Founding member submitted for review
  'approved',        -- Existing: Live on platform
  'unclaimed',       -- NEW: Google import, no owner
  'pending_claim',   -- NEW: Claim submitted, awaiting admin
  'claimed_free',    -- NEW: Claim approved, free tier access
  'pending_upgrade'  -- NEW: Free tier submitted for upgrade
))

-- Visibility control
visibility TEXT DEFAULT 'ai_enabled' CHECK (visibility IN (
  'discover_only',  -- Free tier: Only in Discover, NOT in AI
  'ai_enabled'      -- Paid/Trial: Visible in AI recommendations
))

-- Google Places import tracking
google_place_id TEXT UNIQUE  -- For deduplication
auto_imported BOOLEAN DEFAULT FALSE

-- Claim tracking
claimed_at TIMESTAMP WITH TIME ZONE

-- Indexes for performance
CREATE INDEX idx_business_profiles_status ON business_profiles(status);
CREATE INDEX idx_business_profiles_visibility ON business_profiles(visibility);
CREATE INDEX idx_business_profiles_owner_user_id ON business_profiles(owner_user_id);
CREATE INDEX idx_business_profiles_google_place_id ON business_profiles(google_place_id) WHERE google_place_id IS NOT NULL;
```

---

### `claim_requests` (NEW TABLE):

```sql
CREATE TABLE claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant
  city TEXT NOT NULL REFERENCES franchise_crm_configs(city),
  
  -- Business & User
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Claim status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  
  -- Verification
  verification_method TEXT CHECK (verification_method IN ('email', 'manual')),
  verification_code TEXT,
  verification_code_expires_at TIMESTAMP WITH TIME ZONE,
  verification_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Contact info provided
  business_email TEXT NOT NULL,
  business_website TEXT,
  
  -- Fraud prevention
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  email_domain_match BOOLEAN DEFAULT FALSE,
  duplicate_claims_count INTEGER DEFAULT 0,
  denied_claims_count INTEGER DEFAULT 0,
  
  -- Founding member
  is_founding_member BOOLEAN DEFAULT FALSE,
  founding_member_spot_number INTEGER,
  
  -- Admin review
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  denial_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_active_claim UNIQUE (business_id, user_id, status)
);

-- Indexes
CREATE INDEX idx_claim_requests_business_id ON claim_requests(business_id);
CREATE INDEX idx_claim_requests_user_id ON claim_requests(user_id);
CREATE INDEX idx_claim_requests_status ON claim_requests(status);
CREATE INDEX idx_claim_requests_city ON claim_requests(city);
CREATE INDEX idx_claim_requests_city_status ON claim_requests(city, status);
```

---

### `franchise_crm_configs` (ADD THESE):

```sql
-- Google Places import
google_places_api_key TEXT

-- Founding member program settings
founding_member_enabled BOOLEAN DEFAULT TRUE
founding_member_total_spots INTEGER DEFAULT 150
founding_member_trial_days INTEGER DEFAULT 90
founding_member_discount_percent INTEGER DEFAULT 20 CHECK (founding_member_discount_percent >= 0 AND founding_member_discount_percent <= 100)
```

---

## 🔔 SLACK NOTIFICATIONS

### 1. New Claim Request
**Trigger:** User submits claim (`status = "pending_claim"`)

**Message:**
```
🔔 New Claim Request - Bournemouth
━━━━━━━━━━━━━━━━━━━━━━━━━━
Business: The Larder House
Address: 123 Old Christchurch Rd
Category: Restaurant & Fine Dining

Claimer: Sarah Williams
Email: sarah@thelarderhouse.com
Account: 3 days old

Risk Score: 15/100 ✅ LOW
✓ Email matches business name
✓ First claim for this business
✓ No previous denials

Founding Member: Eligible (Spot #27/150)

[Approve Claim] [Deny] [View Details]
```

**Channel:** `#qwikker-bournemouth-claims` (per city)

---

### 2. Business Ready for Upgrade Review
**Trigger:** Free tier business submits for upgrade (`status = "pending_upgrade"`)

**Message:**
```
⭐ Business Ready for Review - Bournemouth
━━━━━━━━━━━━━━━━━━━━━━━━━━
Business: The Larder House
Type: Free Tier Upgrade

Profile: 100% Complete ✅
Action Items: 6/6 Complete
✓ High-quality photos uploaded
✓ Compelling description written
✓ Menu uploaded & confirmed
✓ Opening hours verified
✓ Contact info confirmed
✓ Social links added

Plan Requested: Featured (90-day trial)

[Review Now] [View Profile]
```

**Channel:** `#qwikker-bournemouth-approvals` (per city)

---

## 🔒 MULTI-TENANT SAFETY

**Every query MUST be city-filtered:**

```typescript
// ✅ GOOD - City filtered
const claims = await supabase
  .from('claim_requests')
  .select('*')
  .eq('city', adminCity)
  .eq('status', 'pending')

// ❌ BAD - Would show ALL cities!
const claims = await supabase
  .from('claim_requests')
  .select('*')
  .eq('status', 'pending')
```

**RLS policies must check:**
1. Admin's city matches business's city
2. Admin's city matches claim's city
3. User can only view their own claims

---

## 🎨 FEATURE GATING

### Free Tier (`status = "claimed_free"`):
```typescript
function isFeatureUnlocked(feature: string, business: Business): boolean {
  // Free tier: Only edit profile allowed
  if (business.status === 'claimed_free') {
    return feature === 'edit_profile'
  }
  
  // All other statuses: Check subscription
  return checkSubscriptionFeatures(business.subscription, feature)
}
```

**Locked features for free tier:**
- ❌ Create offers
- ❌ Create secret menu items
- ❌ Create events
- ❌ View analytics
- ❌ Social wizard
- ❌ Push notifications
- ❌ QR code customization

**Unlocked features:**
- ✅ View dashboard
- ✅ Edit basic profile (name, hours, description, photos)
- ✅ See basic stats (views)

---

## 🚨 CRITICAL: AI VISIBILITY FILTER

**ALL AI queries MUST filter by visibility:**

```typescript
// ✅ CORRECT - Excludes free tier
const businesses = await supabase
  .from('business_profiles')
  .select('*')
  .eq('city', userCity)
  .eq('visibility', 'ai_enabled')  // ← CRITICAL!
  .eq('status', 'approved')

// ❌ WRONG - Would include free tier!
const businesses = await supabase
  .from('business_profiles')
  .select('*')
  .eq('city', userCity)
  .eq('status', 'approved')
```

**Files to update:**
- `lib/ai/hybrid-chat.ts`
- `lib/ai/rag-system.ts`
- `app/api/chat/route.ts`

---

## ✅ MIGRATION SAFETY CHECKLIST

**Before running migration:**
- [ ] Backup database
- [ ] Test on dev database first
- [ ] Verify existing businesses won't change
- [ ] Confirm `status` constraint extends (not replaces)
- [ ] Check all RLS policies updated
- [ ] Test founding member flow still works

**After migration:**
- [ ] Verify all 9 businesses still `status = "approved"`
- [ ] Verify subscriptions unchanged
- [ ] Test founding member signup (shouldn't break)
- [ ] Test admin dashboard (should show existing pending)

---

## 📝 IMPLEMENTATION ORDER

### Phase 1: Database (Week 1)
1. Run migration to add columns
2. Create `claim_requests` table
3. Update `franchise_crm_configs`
4. Test on dev, then production

### Phase 2: Claim Flow (Week 2)
5. Build `/claim` page (wire up existing mock UI)
6. Build claim APIs (`/api/claim/*`)
7. Build admin claim approval UI (wire up existing mock)
8. Add Slack notifications for claims

### Phase 3: Feature Gating (Week 2)
9. Update `isFeatureUnlocked()` logic
10. Add visibility filter to AI queries
11. Add upgrade banner to free tier dashboard
12. Lock features for `claimed_free` status

### Phase 4: Upgrade Flow (Week 3)
13. Add action items for free tier upgrades
14. Update pending applications UI
15. Admin upgrade approval (trial vs paid choice)
16. Add Slack notifications for upgrades

### Phase 5: Google Places Import (Week 3-4)
17. Build admin import tool (wire up existing mock)
18. Google Places API integration
19. Photo download & storage
20. Deduplication logic

### Phase 6: Testing & Polish (Week 4)
21. End-to-end testing (unclaimed → approved)
22. Multi-tenant testing (multiple cities)
23. Founding member flow regression testing
24. UI/UX refinements

---

## 🎯 SUCCESS METRICS

**Claim Flow:**
- 200 imports → 100 claims (50% claim rate)
- 100 claims → 75 approved (75% approval rate)
- Claim approval time: <2 hours average

**Upgrade Flow:**
- 75 claimed → 50 upgrade attempts (67% upgrade rate)
- 50 upgrades → 40 approved (80% approval rate)
- 40 trials → 30 convert (75% trial-to-paid)

**Target:** 30 paying customers = £1,770-3,870/month MRR

---

**Last Updated:** January 8, 2026 02:35 GMT  
**Status:** Ready to implement ✅


