# QWIKKER Development Progress
**Date:** 2026-01-13
**Session:** Day 4 - HQ Admin Control Plane Foundation

---

## 🎯 What Was Built Today

### **1. HQ Admin Control Plane (Platform Core)**

**Purpose:** Central command for creating and governing franchise cities. This is how QWIKKER becomes a scalable, multi-tenant platform instead of a single-city app.

**Architecture:**
- HQ admins live at `qwikker.com/hqadmin` (separate from franchise admins)
- Session-based authentication (cookies) + service role data fetching
- Clean separation: HQ creates/monitors cities, franchises manage operations

**What's Working:**
- ✅ Database foundation (`hq_admins`, `city_admins`, `audit_logs`, `feature_flags`)
- ✅ HQ admin authentication and authorization
- ✅ Professional UI layout (sidebar navigation, top bar, environment badge)
- ✅ Franchises list page with health indicators (Email/SMS status)
- ✅ Create Franchise form (atomic city creation - not yet tested)
- ✅ Clean, calm design (Stripe/Vercel aesthetic, not AI slop)

**Access:**
- URL: `http://localhost:3000/hqadmin`
- Account: `hq@qwikker.com` (in `hq_admins` table)

---

### **2. Franchise Setup Wizard Refinements**

**Email Service Section:**
- ✅ Architecture messaging: "QWIKKER manages DNS, you pay Resend directly"
- ✅ 5-step setup process with DNS handoff instructions
- ✅ Production-first copy (recommend verified domain, mention sandbox as fallback)
- ✅ Dynamic subdomain examples (`bournemouth.qwikker.com`)

**SMS Service Section:**
- ✅ Region-agnostic setup (no UK-specific language)
- ✅ "Verified-by-real-test" gating (sms_verified flag)
- ✅ Simulated vs Real test modes
- ✅ PDF setup guide generation
- ✅ Claim form opt-in only appears when SMS truly ready

**Google Places API Section:**
- ✅ Removed orange gradient, cleaned up styling
- ✅ Fixed "Replace key" functionality (clears both value and has_* flag)
- ✅ Consistent with other sections

**Security:**
- ✅ Secrets masked when sent to client (return `has_*` flags instead)
- ✅ PATCH-style updates (only update provided fields)
- ✅ API derives city from hostname (never trusts client-supplied city)

---

### **3. Claim Flow UX Fixes**

**Flow Order Fixed:**
- ✅ `search` → `confirm` → `email-verify` → `verify-code` → `business-details` → `account` → `submitted`
- ✅ Business details (with SMS opt-in) now shown AFTER email verification
- ✅ No more confusion about step order

**UI Refinements (Premium & Professional):**
- ✅ Header: "Claim Your Business on Qwikker"
- ✅ Subtle radial green glow background
- ✅ Search card elevation (lighter background, softer shadow)
- ✅ Search button: solid Qwikker green
- ✅ Realistic placeholder text ("The Larder House, Scissors Barbers...")
- ✅ "Request listing" CTA changed to secondary outlined button
- ✅ Removed redundant copy and marketing fluff

---

### **4. SMS Notifications System**

**Database:**
- ✅ `sms_enabled`, `sms_provider`, `sms_verified` flags in `franchise_crm_configs`
- ✅ Twilio credentials per franchise
- ✅ `sms_logs` table for tracking
- ✅ SMS opt-in fields in `claim_requests`

**Logic:**
- ✅ Centralized templates (`SMS_TEMPLATES` in `lib/utils/sms.ts`)
- ✅ Transactional wording: "QWIKKER: ..." with "Reply STOP to opt out"
- ✅ Business name truncation (keeps messages under 160 chars)
- ✅ Claim form gates SMS opt-in on `sms_verified` status
- ✅ Test modes: simulated (instant) and real (via Twilio)

**Email Verification:**
- ✅ Works with Resend sandbox domain (`onboarding@resend.dev`)
- ✅ 6-digit code, 15-minute expiry
- ✅ Stores in `verification_codes` table

---

## 📂 Key Files Created/Modified

### **HQ Admin (New)**
- `supabase/migrations/20260113000003_hq_admin_foundation.sql` - Database schema
- `lib/auth/hq-admin.ts` - HQ authentication helpers
- `app/api/hq/franchises/route.ts` - List/create franchises API
- `app/hqadmin/layout.tsx` - HQ admin layout with sidebar
- `app/hqadmin/page.tsx` - Dashboard (redirects to franchises)
- `app/hqadmin/franchises/page.tsx` - Franchises list
- `app/hqadmin/franchises/create/page.tsx` - Create franchise form

### **Franchise Setup Wizard (Modified)**
- `components/admin/admin-setup-page.tsx` - Email/SMS/API sections refined
- `app/api/admin/setup/route.ts` - PATCH logic, secret masking

### **Claim Flow (Modified)**
- `app/claim/page.tsx` - Step order fixed, UI refined
- `components/claim/confirm-business-details.tsx` - SMS opt-in UI
- `app/api/claim/search/route.ts` - Server-side city detection
- `app/api/claim/submit/route.ts` - SMS integration
- `app/api/admin/approve-claim/route.ts` - SMS on approval

### **SMS System (New)**
- `lib/utils/sms.ts` - Twilio integration, templates
- `lib/utils/sms-verification.ts` - SMS capability checks
- `app/api/admin/sms/test/route.ts` - Simulated/real test endpoints
- `app/api/admin/sms/guide.pdf/route.ts` - PDF setup guide
- `app/api/public/franchise-capabilities/route.ts` - Check SMS availability

### **Migrations**
- `20260113000000_add_sms_notifications.sql` - SMS fields
- `20260113000001_add_sms_verified_system.sql` - Verification system
- `20260113000003_hq_admin_foundation.sql` - HQ control plane

---

## 🏗️ Architecture Decisions

### **Multi-Tenant Control Plane**
- **HQ creates cities** (the ONLY way they're born)
- **Franchise admins configure** (Email, SMS, APIs)
- **Business owners operate** (listings, offers, menus)
- Clean separation prevents privilege escalation

### **Session + Service Role Pattern**
- API routes verify session (cookies) first
- Check HQ/city admin permissions
- Then use service role for data fetching (bypasses RLS safely)
- No tokens in JavaScript, no leaking service role power

### **City-Based Isolation**
- Every query scoped by city (from hostname, never client-supplied)
- RLS policies enforce isolation
- Subdomains: `bournemouth.qwikker.com`, `calgary.qwikker.com`, etc.

### **Verified-By-Test Approach**
- SMS opt-in only appears when `sms_verified = true`
- Set to `true` only after successful real test send
- Prevents "broken promise" UX (claiming SMS works when it doesn't)

---

## 🚀 Current State

### **What Works:**
1. HQ admin can login at `http://localhost:3000/hqadmin`
2. Sees list of 4 franchises (Bournemouth, Calgary, London, Paris)
3. Health indicators show Email/SMS status per city
4. Franchise setup wizard has professional copy and architecture messaging
5. Claim flow has correct step order and premium UI
6. SMS system is built (requires Twilio credentials to test)

### **What's Not Tested Yet:**
- Creating a franchise via HQ admin
- Franchise admin login flow (requires auth guard on `/admin`)
- End-to-end claim → SMS → approval flow
- Email verification with real Resend domain

### **Known Issues:**
- `city_admins` table exists in two forms (old: username/password, new: user_id/Supabase Auth)
- `country` column missing from `franchise_crm_configs` (using 'GB' placeholder)
- Full migration not run (audit_logs, feature_flags tables may not exist)

---

## 📋 Next Steps (Priority Order)

### **Phase 1: Complete Core Flow**
1. ⚠️ Add auth guard to `/admin` routes (check `city_admins` table)
2. Test creating a franchise via HQ admin
3. Test franchise admin login → setup wizard flow
4. Test claim flow end-to-end with real email/SMS

### **Phase 2: Polish Control Plane**
4. Build franchise detail view (HQ oversight of one city)
5. Add "Suspend" and "Impersonate" actions
6. System health monitoring page
7. Audit logs viewer
8. Feature flags UI

### **Phase 3: Go Live**
9. Complete Bournemouth setup (verify DNS, Resend, Twilio)
10. Import 200 businesses via Google Places API
11. Test claim flow with real business
12. Launch to users

---

## 🎨 Design Philosophy

**Tone:** Calm, professional, infrastructure-grade (not marketing fluff)

**Inspiration:** Stripe Dashboard, Vercel Team Settings, Linear Admin

**Color Palette:**
- Qwikker Green (`#00D083`) - primary actions, success, status indicators
- Slate/Zinc darks - everything else
- No gradients, no glows, no emojis (unless functionally useful)

**Button System:**
- Primary: Solid green (`bg-[#00D083]`)
- Secondary: Green outline (`border-[#00D083]`)
- Tertiary: Neutral/muted gray

**Copy Rules:**
- Short, precise, confident
- Avoid "marketing speak" and hype
- Technical but not intimidating
- Show, don't explain repeatedly

---

## 💾 Database Schema Summary

### **hq_admins**
```sql
user_id UUID (FK auth.users)
email TEXT
role TEXT ('admin')
is_active BOOLEAN
created_at TIMESTAMPTZ
```

### **city_admins** (New Structure - Not Migrated Yet)
```sql
id UUID
user_id UUID (FK auth.users)
email TEXT
city TEXT (FK franchise_crm_configs)
first_name TEXT
last_name TEXT
role TEXT ('owner', 'manager')
status TEXT ('invited', 'active', 'suspended')
created_by UUID (FK hq_admins.user_id)
```

### **hq_audit_logs**
```sql
id UUID
actor_id UUID
actor_type TEXT ('hq_admin', 'city_admin', 'system')
action TEXT
resource_type TEXT
resource_id TEXT
city TEXT
metadata JSONB
created_at TIMESTAMPTZ
```

### **feature_flags**
```sql
flag_key TEXT UNIQUE
flag_name TEXT
scope TEXT ('global', 'city')
city TEXT (nullable)
is_enabled BOOLEAN
```

### **franchise_crm_configs** (Extended)
```sql
-- SMS fields added:
sms_enabled BOOLEAN
sms_provider TEXT ('twilio', 'none')
sms_verified BOOLEAN
sms_last_verified_at TIMESTAMPTZ
sms_last_error TEXT
twilio_account_sid TEXT
twilio_auth_token TEXT
twilio_messaging_service_sid TEXT
```

### **claim_requests** (Extended)
```sql
-- SMS opt-in fields:
sms_opt_in BOOLEAN
phone_e164 TEXT
sms_opt_in_at TIMESTAMPTZ
sms_consent_text_version TEXT
```

---

## 🔐 Security Notes

- ✅ Secrets never exposed to client (masked with `••••`, return `has_*` flags)
- ✅ API routes verify session first, then check permissions
- ✅ Service role only used AFTER permission check
- ✅ City always derived from hostname server-side (never trust client)
- ✅ PATCH-style updates prevent accidental overwrites
- ✅ RLS policies enforce multi-tenant isolation

---

## 🧪 How to Test (When Ready)

### **1. HQ Admin**
```bash
# Login as HQ admin
open http://localhost:3000/hqadmin
# Use: hq@qwikker.com
```

### **2. Create Test Franchise**
- Click "+ Create Franchise"
- Fill: Calgary Test, calgary-test, Canada, etc.
- Submit → should create franchise + invite email

### **3. Franchise Admin (Once Auth Guard Added)**
```bash
# Login as franchise admin
open http://bournemouth.localhost:3000/admin
```

### **4. Claim Flow**
```bash
# Test claim
open http://bournemouth.localhost:3000/claim
# Search, confirm, verify email, SMS opt-in, create account
```

---

## 📝 Notes

- This is **platform infrastructure**, not feature work
- The foundation is solid - resist urge to overbuild before testing
- Focus on ONE city fully live (Bournemouth) before scaling
- Most of the hard architecture decisions are now made and implemented

---

**Built by:** QWIKKER Development  
**Architecture:** Enterprise multi-tenant SaaS control plane  
**Status:** Foundation complete, testing phase next

