# 🔐 FRANCHISE AUTHENTICATION & SETUP - COMPLETE GUIDE

**Date:** 2026-01-12  
**Purpose:** Answer all questions about franchise auth, setup flow, and HQ admin

---

## **🎯 YOUR QUESTIONS - ANSWERED**

###**Q1: Will Calgary's setup form save into the right DB row?**

**🚨 CRITICAL SECURITY ISSUE:** Currently **NO** - it's NOT safe!

#### **The Problem:**

The `/api/admin/setup` endpoint accepts `city` from the client:

```typescript
// app/api/admin/setup/route.ts (Line 79)
const { city, config } = await request.json() // ❌ Client controls city!
```

**Attack Vector:**

```bash
# A Bournemouth admin could update Calgary's keys!
POST /api/admin/setup
{
  "city": "calgary",  // ❌ Attacker chooses city
  "config": {
    "resend_api_key": "stolen_key"
  }
}
```

#### **The Fix:**

Derive city from hostname (server-side only):

```typescript
// ✅ SECURE VERSION
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed)
    const city = await getCityFromRequest(request.headers)
    
    const { config } = await request.json() // Only accept config, NOT city
    
    const supabase = createAdminClient()
    
    // Update THIS city's config only
    const { error } = await supabase
      .from('franchise_crm_configs')
      .upsert({
        city, // ✅ Server-derived, not client-supplied
        ...config,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'city'
      })
    
    if (error) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### **Q2: Can HQ admin "do it for them" if they struggle?**

**Yes, but with important security boundaries:**

#### **What HQ Admin CAN Do:**

✅ **Non-Secret Fields** (edit freely):
- `display_name`, `subdomain`
- `owner_name`, `owner_email`, `owner_phone`
- `timezone`, `country_code`, `currency_code`
- `status` (active/paused/setup_required)
- Pricing cards, founding member settings

✅ **API Keys** (replace only):
- Set/replace keys for franchises
- View "Connected ✅ / Missing ❌" status
- **NEVER** show raw keys after save (only mask: `re_***...***xyz`)

#### **What Franchise Admin CAN Do:**

✅ Set their own API keys (recommended)  
✅ Change their password  
✅ Manage their own settings  
✅ Test API connections  

#### **Best Practice Flow:**

1. **HQ creates city** → Inserts row into `franchise_crm_configs` + `city_admins`
2. **HQ sends invite** → Email with login instructions
3. **Franchise admin logs in** → `username: calgary`, `password: Admin123` (temporary)
4. **Franchise admin completes setup** → Changes password, adds API keys
5. **HQ monitors** → Sees "Setup complete ✅" or "Missing keys ❌"

---

### **Q3: Should you build HQ admin now?**

**✅ YES - Build the MINIMAL version (2-3 hours)**

#### **Why Build It:**

You're **already blocked** by:
- Calgary missing API keys
- No safe way to see setup status across cities
- `/api/admin/franchise` has no auth (major security risk)

#### **What to Build (MVP):**

1. **Cities List** (`/hq/admin`)
   - City name, subdomain, country
   - Status badges (active/setup_required)
   - API key status (✅/❌ for Google Places, Resend)
   - Actions: View, Edit, Pause

2. **City Settings** (`/hq/admin/cities/[city]`)
   - Identity (display name, timezone, owner)
   - API Keys (Google Places, Resend)
   - Test buttons (send test email, test API)
   - Status controls (active/paused)

3. **HQ Auth**
   - Simple `hq_admins` table (just you)
   - Check on every HQ route
   - Separate from city admin auth

#### **What NOT to Build (Yet):**

⏸️ Dashboard with metrics  
⏸️ Import analytics  
⏸️ Audit logs  
⏸️ Global templates  

---

### **Q4: How does franchise admin login work?**

**🔒 CURRENT SYSTEM (Good!):**

#### **Authentication Model:**

You already have a `city_admins` table with:
- `city` (varchar) - Which city they admin
- `username` (varchar) - Their login username
- `password_hash` (text) - Bcrypt hashed password
- `email`, `full_name`, `is_active`, etc.

#### **Dev Convenience Fallback:**

In development only, there's a fallback:

```typescript
// lib/utils/admin-auth.ts (Lines 53-69)
if (isLocalEnv && normalisedUsername === normalisedCity && password === 'Admin123') {
  // ✅ Dev mode: username=calgary, password=Admin123
}
```

**Example:**
- URL: `http://calgary.localhost:3000/admin`
- Username: `calgary`
- Password: `Admin123`

#### **Production Flow:**

1. **HQ creates city + admin:**
   ```sql
   -- Insert into franchise_crm_configs
   INSERT INTO franchise_crm_configs (city, ...) VALUES ('calgary', ...);
   
   -- Insert into city_admins with temp password
   INSERT INTO city_admins (city, username, password_hash, email)
   VALUES (
     'calgary',
     'calgary',
     '$2a$10$...',  -- bcrypt hash of 'Admin123'
     'calgary@qwikker.com'
   );
   ```

2. **HQ sends invite:**
   ```
   Welcome to QWIKKER!
   
   Login: https://calgary.qwikker.com/admin
   Username: calgary
   Temporary Password: Admin123
   
   IMPORTANT: Change your password after first login!
   ```

3. **Franchise admin first login:**
   - Logs in with `calgary` / `Admin123`
   - Redirected to setup wizard
   - **MUST** change password as first step

4. **Password change:**
   - Your setup form already has "Current Password" + "New Password" fields!
   - Uses `changeAdminPassword()` function (already exists!)

---

## **🔧 IMPLEMENTATION PLAN**

### **Step 1: Fix Franchise Setup API (30 mins) - CRITICAL**

Update `/app/api/admin/setup/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromRequest } from '@/lib/utils/city-detection'

export async function GET(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname
    const city = await getCityFromRequest(request.headers)
    
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('*')
      .eq('city', city)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, config: data || null })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (can't be spoofed)
    const city = await getCityFromRequest(request.headers)
    
    const { config } = await request.json()
    
    if (!config) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Upsert THIS city's config only
    const { error } = await supabase
      .from('franchise_crm_configs')
      .upsert({
        city,  // ✅ Server-derived city (secure)
        display_name: config.display_name,
        subdomain: config.subdomain || city,
        owner_name: config.owner_name,
        owner_email: config.owner_email,
        owner_phone: config.owner_phone,
        contact_address: config.contact_address,
        ghl_webhook_url: config.ghl_webhook_url,
        ghl_update_webhook_url: config.ghl_update_webhook_url,
        ghl_api_key: config.ghl_api_key,
        walletpush_api_key: config.walletpush_api_key,
        walletpush_template_id: config.walletpush_template_id,
        walletpush_endpoint_url: config.walletpush_endpoint_url,
        slack_webhook_url: config.slack_webhook_url,
        slack_channel: config.slack_channel,
        timezone: config.timezone,
        status: config.status,
        stripe_account_id: config.stripe_account_id,
        stripe_publishable_key: config.stripe_publishable_key,
        stripe_webhook_secret: config.stripe_webhook_secret,
        stripe_onboarding_completed: config.stripe_onboarding_completed,
        business_registration: config.business_registration,
        business_address: config.business_address,
        billing_email: config.billing_email,
        resend_api_key: config.resend_api_key,
        resend_from_email: config.resend_from_email,
        resend_from_name: config.resend_from_name,
        openai_api_key: config.openai_api_key,
        anthropic_api_key: config.anthropic_api_key,
        google_places_api_key: config.google_places_api_key, // ADD THIS
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'city'
      })
    
    if (error) {
      console.error('❌ Error updating franchise config:', error)
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully'
    })
  } catch (error) {
    console.error('❌ Setup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**Test:**

```bash
# ✅ Can only update Calgary from Calgary subdomain
curl -X POST http://calgary.localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"config":{"resend_api_key":"test"}}'

# ❌ Cannot update Bournemouth from Calgary subdomain
# (City is derived from hostname, not request body)
```

---

### **Step 2: Secure Franchise API (30 mins) - CRITICAL**

See `HQ_ADMIN_QUICK_START.md` for complete implementation.

**Summary:**

1. Create `hq_admins` table
2. Add auth helper (`lib/auth/hq-admin.ts`)
3. Update `/api/admin/franchise/route.ts` to check HQ admin
4. Test with your email

---

### **Step 3: Build HQ Admin UI (2 hours)**

See `HQ_ADMIN_QUICK_START.md` for step-by-step.

**Files to Create:**

- `app/hq/layout.tsx` - HQ layout with auth
- `app/hq/admin/page.tsx` - Cities list
- `app/hq/admin/cities/[city]/page.tsx` - City settings
- `components/hq/city-settings-form.tsx` - Settings form

---

### **Step 4: Create Initial Admin Accounts (10 mins)**

**For Each City:**

```sql
-- Create admin account with temporary password
INSERT INTO city_admins (city, username, password_hash, email, full_name, is_active)
VALUES (
  'calgary',
  'calgary',
  '$2a$10$YourBcryptHashHere',  -- Hash of 'Admin123'
  'calgary@qwikker.com',
  'Calgary Admin',
  true
);
```

**Generate Hash:**

```bash
# Use bcrypt online tool or Node.js:
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Admin123', 10));"
```

---

## **📋 COMPLETE AUTHENTICATION FLOW**

### **Scenario: Adding Calgary**

#### **1. HQ Creates City (HQ Admin)**

```sql
-- HQ runs in Supabase SQL Editor:
INSERT INTO franchise_crm_configs (
  city, display_name, country_code, country_name,
  currency_code, currency_symbol, status,
  created_at, updated_at
) VALUES (
  'calgary', 'Calgary', 'CA', 'Canada',
  'CAD', '$', 'setup_required',
  NOW(), NOW()
);

-- HQ creates initial admin
INSERT INTO city_admins (city, username, password_hash, email, is_active)
VALUES (
  'calgary',
  'calgary',
  '$2a$10$...',  -- bcrypt('Admin123')
  'calgary@qwikker.com',
  true
);
```

#### **2. HQ Sends Invite**

```
Subject: Welcome to QWIKKER - Calgary

Hi Calgary Team!

Your QWIKKER franchise is ready to set up.

Login: https://calgary.qwikker.com/admin
Username: calgary
Temporary Password: Admin123

IMPORTANT: Change your password after first login!

Setup Steps:
1. Log in with temporary credentials
2. Change your password (first step in setup wizard)
3. Add your API keys:
   - Google Places API key
   - Resend API key
4. Complete franchise details

Need help? Reply to this email or call us.

- The QWIKKER Team
```

#### **3. Franchise Admin First Login**

```
1. Visit: https://calgary.qwikker.com/admin
2. Enter: username=calgary, password=Admin123
3. System redirects to /admin/franchise-setup
4. First screen: "Change Password"
   - Current Password: Admin123
   - New Password: [secure password]
   - Confirm Password: [secure password]
5. Click "Save & Continue"
6. System updates password_hash in city_admins
7. Now shows main setup wizard
```

#### **4. Franchise Admin Completes Setup**

```
1. Business Details:
   - Display name: Calgary
   - Owner name, email, phone
   - Timezone: America/Edmonton

2. API Keys:
   - Google Places API key: [paste key]
   - Test Connection: ✅ Success
   - Resend API key: [paste key]
   - From Email: calgary@qwikker.com
   - Test Email: ✅ Sent

3. Optional Integrations:
   - WalletPush (later)
   - GHL (later)
   - Stripe (later)

4. Click "Complete Setup"
5. Status changes: setup_required → active
6. Redirected to /admin (main dashboard)
```

#### **5. HQ Monitors**

```
HQ visits: https://hq.qwikker.com/admin

Cities List:
┌──────────────────────────────────────────┐
│ Calgary (CA) • Active ✅                 │
│ Setup Complete                           │
│ Google Places: ✅ Connected              │
│ Resend: ✅ Connected                     │
│ [View] [Edit] [Analytics]                │
└──────────────────────────────────────────┘
```

---

## **🔐 SECURITY CHECKLIST**

### **City Admin Security:**

- [x] ✅ City-scoped authentication (`city_admins` table)
- [x] ✅ Password hashing (bcrypt)
- [x] ✅ Session cookies (HTTP-only)
- [ ] ⚠️ **FIX REQUIRED:** `/api/admin/setup` accepts client city
- [ ] ⚠️ **FIX REQUIRED:** `/api/admin/franchise` has no auth

### **HQ Admin Security:**

- [ ] ⚠️ **CREATE:** `hq_admins` table
- [ ] ⚠️ **CREATE:** HQ auth helper
- [ ] ⚠️ **CREATE:** HQ auth check on all HQ routes

### **Cross-City Protection:**

- [x] ✅ City derived from hostname (most routes)
- [ ] ⚠️ **FIX:** `/api/admin/setup` (accepts client city)
- [ ] ⚠️ **FIX:** `/api/admin/franchise` (no auth)

---

## **🚀 IMMEDIATE ACTION PLAN**

### **Today (3 hours):**

**Priority 1: Fix Security (1 hour) - CRITICAL**

1. ✅ Fix `/api/admin/setup` - derive city from hostname
2. ✅ Create `hq_admins` table
3. ✅ Secure `/api/admin/franchise`

**Priority 2: Test Calgary (30 mins)**

1. ✅ Add Calgary to `franchise_crm_configs`
2. ✅ Create Calgary admin account
3. ✅ Test login: `http://calgary.localhost:3000/admin`
4. ✅ Test setup wizard

**Priority 3: Build HQ Admin (2 hours)**

1. ✅ HQ layout + auth
2. ✅ Cities list
3. ✅ City settings

---

## **📚 RELATED DOCUMENTS:**

1. **`HQ_ADMIN_QUICK_START.md`** - Step-by-step HQ implementation
2. **`CITY_DETECTION_COMPREHENSIVE_AUDIT.md`** - Security audit results
3. **`scripts/add-calgary-city.sql`** - SQL to add Calgary

---

## **🎯 ANSWERS SUMMARY:**

| Question | Answer |
|----------|--------|
| **Will Calgary setup save to right row?** | ⚠️ **NO (currently)** - Needs fix to derive city from hostname |
| **Can HQ admin help franchises?** | ✅ **YES** - Can set non-secret fields + replace API keys (can't read keys) |
| **Should we build HQ admin now?** | ✅ **YES** - Minimal MVP (2-3 hours) to unblock Calgary |
| **How does franchise login work?** | ✅ **Already built!** - `city_admins` table, temp password `Admin123`, change on first login |

---

**Bottom Line:**
1. 🚨 **Fix security FIRST** (1 hour) - derive city from hostname
2. ✅ **Auth system is good** - just needs password change on first login
3. 🏢 **Build HQ admin** (2 hours) - minimal version to unblock scaling
4. 🎉 **Result:** Safe, scalable multi-city platform

**Ready to fix and ship!** 🚀

