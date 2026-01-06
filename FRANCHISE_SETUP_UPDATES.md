# Franchise Setup Updates - Free Tier System

**Date:** January 6, 2026  
**Current Flow:** 5 steps (Admin → Details → API Services → Integrations → Save)  
**Changes Needed:** Add Google Places API + Founding Member settings

---

## Current Flow Analysis

### ✅ Step 1: Admin Account
**Status:** Perfect, no changes needed
- Owner name, email, password

### ✅ Step 2: Franchise Details
**Status:** Needs addition for Founding Member settings
- Display name, subdomain, phone, timezone, address
- **ADD:** Founding Member Configuration (see below)

### ⚠️ Step 3: Your API Services
**Status:** Needs Google Places API addition
- Currently: Resend, OpenAI, Anthropic
- **ADD:** Google Places API (see below)

### ✅ Step 4: Integrations
**Status:** Perfect, no changes needed
- GHL, WalletPush, Slack, Stripe

### ✅ Step 5: Save & Launch
**Status:** Update summary to include new settings
- Currently shows: Admin, Franchise Info, API Services, Integrations
- **UPDATE:** Include Google Places & Founding Member in summary

---

## STEP 2 UPDATES: Add Founding Member Configuration

**Add this section AFTER "Contact Address" field:**

```
┌────────────────────────────────────────────────────────────┐
│  🎁 Founding Member Program (Optional)                     │
│  ───────────────────────────────────────────────────────   │
│  Reward early adopter businesses with special benefits     │
│                                                             │
│  [✅] Enable founding member benefits                      │
│                                                             │
│  Trial Configuration                                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Trial Duration:  [90] days                            │ │
│  │                                                        │ │
│  │ Trial Tier:      [Featured ▼]                         │ │
│  │                  Options: Starter, Featured, Spotlight│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Discount Configuration                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Lifetime Discount: [20]% off annual plans            │ │
│  │                    Applied forever to founding members│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Eligibility Window                                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Claim within:    [30] days from listing creation     │ │
│  │                                                        │ │
│  │ 💡 Businesses must claim within this period to get   │ │
│  │    founding member status                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  🎯 Example: A business imported on Jan 1st has until     │
│     Jan 31st to claim and receive:                         │
│     • 90-day Featured trial (worth £165)                   │
│     • 20% lifetime discount on annual plans                │
└────────────────────────────────────────────────────────────┘
```

**UI Specs:**
- Matches existing purple info boxes
- Toggle switch for enable/disable
- Number inputs with validation (1-365 days, 0-50%)
- Dropdown for tier selection
- Help text with emoji icons
- Example calculation box

---

## STEP 3 UPDATES: Add Google Places API

**Add this as the THIRD service (after Anthropic Claude):**

```
┌────────────────────────────────────────────────────────────┐
│  🗺️  Google Places API (Business Import)                   │
│  ───────────────────────────────────────────────────────   │
│  Import businesses from Google to auto-populate your city  │
│                                                             │
│  [Sign Up →]                                                │
│                                                             │
│  Google Places API Key *                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ AIza...                                        [👁️]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Used for: Business auto-import, location data, photos     │
│                                                             │
│  💰 Pricing (You pay directly to Google)                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📊 Cost Calculator                                    │ │
│  │                                                        │ │
│  │  Import [50] businesses ═══●═══ (10 to 500)          │ │
│  │                                                        │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Place Search:    50 × $0.032 = $1.60          │ │ │
│  │  │  Place Details:   50 × $0.017 = $0.85          │ │ │
│  │  │  Photos (avg 3):  150 × $0.007 = $1.05         │ │ │
│  │  │  ─────────────────────────────                  │ │ │
│  │  │  Total Cost:              $3.50                 │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  📈 Monthly Estimates:                                 │ │
│  │  • 20 businesses/month  ≈ $1.96                       │ │
│  │  • 50 businesses/month  ≈ $4.90                       │ │
│  │  • 100 businesses/month ≈ $9.80                       │ │
│  │  • 200 businesses/month ≈ $19.60                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ⚙️ Setup Instructions:                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  1. Visit: Google Cloud Console                      │ │
│  │     [🔗 Open Setup Guide]                             │ │
│  │                                                        │ │
│  │  2. Enable "Places API (New)"                         │ │
│  │                                                        │ │
│  │  3. Create API key with Places API access            │ │
│  │                                                        │ │
│  │  4. Add billing info (Google requires it)            │ │
│  │                                                        │ │
│  │  5. Copy your API key and paste above                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  [🧪 Test Connection]  Status: ⏹️ Not tested yet           │
│                                                             │
│  ⚠️ Important Notes:                                        │
│  • You are billed directly by Google                       │
│  • QWIKKER HQ does not cover these costs                   │
│  • Rate limit: 1,000 requests/day (free tier)             │
│  • For 100+ businesses/day, upgrade to paid tier          │
│  • All data is cached to minimize API calls               │
└────────────────────────────────────────────────────────────┘
```

**UI Specs:**
- Orange/brown warning color (different from other services)
- Interactive cost calculator slider
- Live cost calculation
- Collapsible setup instructions
- Test connection button
- Clear warnings about costs
- Links to Google Cloud Console

---

## STEP 5 UPDATES: Summary Page

**Update "What gets saved?" section:**

```
┌────────────────────────────────────────────────────────────┐
│  What gets saved?                                          │
│                                                             │
│  ┌─────────────┐  Admin Account                            │
│  │      1      │  Owner details and login credentials      │
│  └─────────────┘                                            │
│                                                             │
│  ┌─────────────┐  Franchise Info                           │
│  │      2      │  Display name, subdomain, contact details │
│  │             │  + Founding member settings               │ << NEW
│  └─────────────┘                                            │
│                                                             │
│  ┌─────────────┐  Your API Services                        │
│  │      3      │  Resend, OpenAI, Anthropic, Google Places │ << UPDATED
│  └─────────────┘                                            │
│                                                             │
│  ┌─────────────┐  Integrations                             │
│  │      4      │  GHL, WalletPush, Slack, and Stripe      │
│  └─────────────┘                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Backend)

**Update `franchise_crm_configs` table:**

```sql
-- New columns for Step 2 (Founding Member)
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS founding_member_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS founding_member_trial_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS founding_member_trial_tier TEXT DEFAULT 'featured'
  CHECK (founding_member_trial_tier IN ('starter', 'featured', 'spotlight')),
ADD COLUMN IF NOT EXISTS founding_member_discount_percent INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS founding_member_eligibility_days INTEGER DEFAULT 30;

-- New columns for Step 3 (Google Places API)
ALTER TABLE franchise_crm_configs
ADD COLUMN IF NOT EXISTS google_places_api_key TEXT;  -- Encrypted
```

---

## New Admin Features AFTER Setup

Once franchise setup is complete, add these to admin dashboard:

### 1. Business Import Tool (NEW PAGE)

**Location:** `/admin/import/google-places`

**Access:** Sidebar → "Import Businesses" (new menu item under "Control Center")

**Features:**
- Use the UI design from `FREE_TIER_UX_DESIGN.md`
- Batch size selector with live cost calculator
- Category filters
- Quality filters (rating, reviews)
- Preview before import
- Progress tracking

---

### 2. Claim Approvals Dashboard (NEW PAGE)

**Location:** `/admin/claims`

**Access:** Sidebar → "Claim Requests" (new menu item, shows badge with pending count)

**Features:**
- List of pending claims
- Email verification status
- One-click approve/deny
- Admin notes
- Auto-approve toggle in franchise settings

---

### 3. Update Existing "Incomplete Listings" (MODIFY)

**Current:** Shows businesses with incomplete profiles

**Add:** Show unclaimed businesses separately

```
┌────────────────────────────────────────────────────────────┐
│  📋 Business Status                                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  [Incomplete (1)] [Unclaimed (52)] [Claimed (12)]          │
│                                                             │
│  Showing: Unclaimed Businesses                              │
│                                                             │
│  🔓 The Larder House                                        │
│     Created 15 days ago • ✅ Founding member eligible      │
│     143 views • 23 clicks • 0 claims yet                   │
│     [👀 View] [🗑️ Delete] [📧 Send Reminder]                │
│                                                             │
│  🔓 Urban Reef                                              │
│     Created 3 days ago • ✅ Founding member eligible       │
│     89 views • 12 clicks • 0 claims yet                    │
│     [👀 View] [🗑️ Delete] [📧 Send Reminder]                │
│                                                             │
│  ... 50 more ...                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Copy & Messaging Guidelines

### For Franchise Setup:

**Google Places API Section:**

**Header:** "Google Places API (Business Import)"
**Description:** "Import businesses from Google to auto-populate your city"

**Cost Warning (Red/Orange box):**
```
⚠️ Important Notes:
• You are billed directly by Google
• QWIKKER HQ does not cover these costs
• Rate limit: 1,000 requests/day (free tier)
• For 100+ businesses/day, upgrade to paid tier
• All data is cached to minimize API calls
```

**Founding Member Section:**

**Header:** "Founding Member Program (Optional)"
**Description:** "Reward early adopter businesses with special benefits"

**Example Box:**
```
🎯 Example: A business imported on Jan 1st has until
   Jan 31st to claim and receive:
   • 90-day Featured trial (worth £165)
   • 20% lifetime discount on annual plans
```

---

## Validation Rules

### Step 2 (Founding Member):
- Trial days: 1-365 (default: 90)
- Discount percent: 0-50 (default: 20)
- Eligibility days: 1-90 (default: 30)
- Trial tier: Must be valid tier name

### Step 3 (Google Places):
- API key: Must start with "AIza" or "goog-" (Google format)
- Test connection before allowing save
- Show error if key is invalid
- Warn if quota is exceeded

---

## Visual Design Specs

### Color Scheme (Match Existing):
- **Resend:** Blue (`#3B82F6`)
- **OpenAI:** Green (`#10B981`)
- **Anthropic:** Purple (`#8B5CF6`)
- **Google Places:** Orange (`#F59E0B`) ← NEW
- **Founding Member:** Gold (`#F59E0B`) ← NEW

### Icons:
- Resend: `RS` badge (blue)
- OpenAI: `AI` badge (green)
- Anthropic: `CL` badge (purple)
- Google Places: `🗺️` or `GP` badge (orange) ← NEW
- Founding Member: `🎁` emoji ← NEW

### Input Fields:
- API Keys: Password field with show/hide toggle (👁️)
- Sliders: Interactive range with live value display
- Dropdowns: Consistent with existing Shadcn UI dropdowns
- Toggle switches: Same as existing (green when enabled)

---

## Testing Checklist

### After Updates, Test:
- [ ] Step 2: Founding member settings save correctly
- [ ] Step 3: Google Places API test connection works
- [ ] Step 3: Cost calculator updates in real-time
- [ ] Step 5: Summary shows new fields
- [ ] Database: New columns created with correct defaults
- [ ] API keys are encrypted in database
- [ ] Existing franchises aren't broken by new columns
- [ ] Setup flow completes without errors

---

## Migration Path for Existing Franchises

**For franchises that already completed setup:**

1. **Show banner in admin dashboard:**
```
┌────────────────────────────────────────────────────────────┐
│  🎉 New Features Available!                                │
│                                                             │
│  • Google Places API: Auto-import businesses               │
│  • Founding Member Program: Reward early adopters          │
│                                                             │
│  [⚙️ Update Your Franchise Settings]                        │
└────────────────────────────────────────────────────────────┘
```

2. **Allow editing franchise settings:**
   - Add "Edit Configuration" button in `/admin/settings`
   - Opens same 5-step flow (pre-filled with current values)
   - Can update API keys and founding member settings

3. **Default values for existing franchises:**
   - `founding_member_enabled`: `true`
   - `founding_member_trial_days`: `90`
   - `founding_member_discount_percent`: `20`
   - `founding_member_eligibility_days`: `30`
   - `google_places_api_key`: `NULL` (not configured yet)

---

## Implementation Order

1. **Week 1: Database & Backend**
   - Add new columns to `franchise_crm_configs`
   - Add API key encryption
   - Create validation functions
   - Update setup API routes

2. **Week 2: Frontend - Setup Flow**
   - Update Step 2: Add Founding Member section
   - Update Step 3: Add Google Places API section
   - Update Step 5: Show new settings in summary
   - Add interactive cost calculator
   - Test connection functionality

3. **Week 3: Admin Dashboard**
   - Create "Import Businesses" page
   - Create "Claim Requests" page
   - Update "Incomplete Listings" to show unclaimed
   - Add new sidebar menu items

4. **Week 4: Polish & Testing**
   - Test complete setup flow
   - Test editing existing franchise
   - Verify encryption works
   - Test cost calculator accuracy
   - Documentation & screenshots

---

## Questions for You:

1. **Should Step 3 (API Services) be reordered?**
   - Current: Resend → OpenAI → Anthropic
   - Proposed: Resend → Google Places → OpenAI → Anthropic
   - OR: Keep as-is, add Google Places at the end?

2. **Should Founding Member settings be in Step 2 or separate step?**
   - Option A: Add to Step 2 (simpler, fewer steps)
   - Option B: Create new "Step 2B: Founding Member Program" (clearer separation)

3. **Should Google Places API be required or optional?**
   - Required: Forces every franchise to set it up
   - Optional: Can skip if they want to manually add businesses

4. **Auto-approve claims toggle - where should it go?**
   - Option A: In Founding Member settings (Step 2)
   - Option B: Separate "Claim Settings" section
   - Option C: In admin dashboard settings (not franchise setup)

---

**Ready to proceed with these designs?** Let me know your answers to the 4 questions and I'll create the exact components! 🎨

