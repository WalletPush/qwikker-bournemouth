# 🏢 HQ ADMIN ARCHITECTURE

**Global oversight for multi-city QWIKKER platform**

---

## **THE PROBLEM**

As you scale to multiple cities, you need:
- ✅ Way to provision new cities (not manual SQL)
- ✅ Central dashboard to see all cities' health
- ✅ Ability to set API keys per city
- ✅ Monitor costs across all franchises
- ✅ Emergency controls (disable imports, read-only mode)

**City admins can't do this** - they're isolated to their city.

**You need HQ admin.** 🎯

---

## **THE ARCHITECTURE**

### **Two Types of Admin:**

```
┌────────────────────────────────────────────────┐
│  HQ ADMIN (Global)                             │
│  URL: hq.qwikker.com/admin                     │
│  ──────────────────────────────────────────    │
│  Role: Platform Owner                          │
│  Access: ALL cities                            │
│  Actions:                                      │
│    • Create/provision new cities               │
│    • Set API keys per city                     │
│    • View cross-city analytics                 │
│    • Monitor costs (Google, Resend, SMS)       │
│    • Emergency controls                        │
│    • Impersonate city admin (read-only)        │
└────────────────────────────────────────────────┘
                  │
                  │ Manages
                  ▼
┌──────────────────────────────────────────────────┐
│  CITY ADMIN (Tenant-Scoped)                      │
│  URLs:                                           │
│    bournemouth.qwikker.com/admin                 │
│    calgary.qwikker.com/admin                     │
│    london.qwikker.com/admin                      │
│  ──────────────────────────────────────────      │
│  Role: Franchise Manager                         │
│  Access: ONLY their city                         │
│  Actions:                                        │
│    • Import businesses                           │
│    • Approve claims                              │
│    • Manage discover layout                      │
│    • View analytics (their city only)            │
│    • Manage CRM                                  │
└──────────────────────────────────────────────────┘
```

---

## **URL STRUCTURE**

### **Recommended:**

| URL | Purpose | Who |
|-----|---------|-----|
| `qwikker.com` | Marketing homepage | Public |
| `hq.qwikker.com` | HQ admin portal | You only |
| `bournemouth.qwikker.com` | Bournemouth franchise | Public + City Admin |
| `calgary.qwikker.com` | Calgary franchise | Public + City Admin |

**Why `hq.qwikker.com`?**
- ✅ Clearly separate from city subdomains
- ✅ Doesn't conflict with city detection logic
- ✅ Can't accidentally be treated as a "city"
- ✅ Professional and obvious

**Alternative:**
- `qwikker.com/hq` (if you want to keep everything under main domain)

---

## **HQ ADMIN FEATURES (MVP)**

### **Page 1: Cities Dashboard**

**Purpose:** Overview of all franchises

**Features:**
- List all cities (active, draft, paused)
- Quick stats per city:
  - Business count
  - Unclaimed count
  - Claim requests pending
  - Active offers
  - Last import date
- Status indicators (healthy, needs attention, offline)
- Quick actions (view, edit, analytics)

**UI Sketch:**

```
┌─────────────────────────────────────────────────────┐
│ QWIKKER HQ                                          │
│ ─────────────────────────────────────────────────   │
│ [+ Create New City]               [View Costs]      │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ ✅ Bournemouth (GB) • Active                  │  │
│ │ 47 businesses • 12 unclaimed • 3 pending      │  │
│ │ Last import: 2 hours ago                      │  │
│ │ [View] [Edit] [Analytics] [Impersonate]      │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ ⚠️ Calgary (CA) • Draft                       │  │
│ │ 0 businesses • Not launched                   │  │
│ │ Missing: Google Places API key                │  │
│ │ [View] [Complete Setup] [Launch]              │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ┌───────────────────────────────────────────────┐  │
│ │ 🔄 London (GB) • Active                       │  │
│ │ 23 businesses • 8 unclaimed • 1 pending       │  │
│ │ Last import: 3 days ago                       │  │
│ │ [View] [Edit] [Analytics]                     │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

### **Page 2: Create City**

**Purpose:** Provision a new franchise

**Fields:**
- City slug (calgary) - validated unique
- Display name (Calgary)
- Country (dropdown or autocomplete)
- Currency (inferred from country)
- Coordinates (optional - for imports)
- Trial length (days)
- Founding member discount (%)
- Founding member deadline (date)
- Initial status (draft/active)

**Validation:**
- ✅ City slug must be lowercase, no spaces
- ✅ City slug must be unique
- ✅ Must not conflict with reserved subdomains (www, app, api, hq)

**On Submit:**
- Creates row in `franchise_crm_configs`
- Redirects to city settings page
- Shows success message: "Calgary created! Add API keys to complete setup."

---

### **Page 3: City Settings**

**Purpose:** Configure a specific city

**Tabs:**

#### **Tab 1: General**
- Display name
- Status (draft/active/paused)
- Timezone
- Coordinates (for imports)

#### **Tab 2: API Keys**
- Google Places API key (with test button)
- Resend API key (with verify button)
- SMS provider key (future)

#### **Tab 3: Email Config**
- From email (calgary@qwikker.com)
- Admin notification email
- Support email
- Email templates (future)

#### **Tab 4: Trial & Pricing**
- Trial length
- Founding member discount
- Founding member deadline
- Tier pricing (override defaults)

#### **Tab 5: Features**
- ☑ Allow imports
- ☑ Allow claims
- ☑ AI chat (per-city toggle)
- ☐ SMS notifications (future)

---

### **Page 4: Cross-City Analytics**

**Purpose:** See platform-wide metrics

**Metrics:**
- Total businesses across all cities
- Businesses by city (chart)
- Claims processed (last 7 days)
- Offers created (last 7 days)
- User engagement (by city)

**Filters:**
- Date range
- City (multi-select)
- Business status

---

### **Page 5: Cost Monitoring**

**Purpose:** Track API usage and costs

**Sections:**

#### **Google Places API**
- Requests by city (last 30 days)
- Estimated cost (based on pricing)
- Breakdown: Nearby Search, Place Details, Photos

#### **Resend Email**
- Emails sent by city
- Estimated cost
- Breakdown: Verification, Welcome, Approval

#### **SMS (Future)**
- Messages sent by city
- Estimated cost

**Budget Alerts:**
- Set monthly budget per API
- Alert when 80% used
- Auto-pause at 100% (optional)

---

## **DATABASE SCHEMA**

### **Option 1: Add Role to Existing Admin Table**

```sql
-- Add role column
ALTER TABLE city_admins
ADD COLUMN role TEXT CHECK (role IN ('city_admin', 'hq_admin')) DEFAULT 'city_admin';

-- Add city NULL constraint (HQ admins not tied to a city)
ALTER TABLE city_admins
ALTER COLUMN city DROP NOT NULL;

-- Make your account HQ admin
UPDATE city_admins
SET role = 'hq_admin',
    city = NULL
WHERE email = 'admin@qwikker.com';
```

### **Option 2: Separate HQ Admins Table (Recommended)**

```sql
-- Create HQ admins table
CREATE TABLE hq_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT, -- If using password auth
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE hq_admins ENABLE ROW LEVEL SECURITY;

-- Only HQ admins can read HQ admins table
CREATE POLICY "HQ admins can read HQ admins"
ON hq_admins FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM hq_admins WHERE id = auth.uid())
);

-- Add your account
INSERT INTO hq_admins (email, name)
VALUES ('admin@qwikker.com', 'Your Name');
```

---

## **AUTHENTICATION**

### **HQ Admin Login:**

```typescript
// app/hq/admin/login/page.tsx

// ✅ Separate login from city admin login
// ✅ Check hq_admins table (not city_admins)
// ✅ Set separate cookie (hq_admin_session)
```

### **HQ Admin Middleware:**

```typescript
// app/hq/admin/middleware.ts (or in main middleware)

export async function middleware(request: NextRequest) {
  // Check if route is /hq/*
  if (request.nextUrl.pathname.startsWith('/hq')) {
    // Verify HQ admin cookie
    const cookie = request.cookies.get('hq_admin_session')
    if (!cookie) {
      return NextResponse.redirect('/hq/login')
    }
    
    // Validate HQ admin
    const admin = await getHQAdminFromSession(cookie.value)
    if (!admin) {
      return NextResponse.redirect('/hq/login')
    }
  }
  
  return NextResponse.next()
}
```

---

## **SECURITY RULES FOR HQ ADMIN**

### **✅ DO:**

1. **HQ routes NEVER use city detection**
   ```typescript
   // app/hq/admin/cities/page.tsx
   // ❌ DON'T:
   const city = await getCityFromHostname(...)
   
   // ✅ DO:
   // HQ is global - list ALL cities
   const cities = await supabase
     .from('franchise_crm_configs')
     .select('*')
     .order('city')
   ```

2. **HQ queries are explicit about city**
   ```typescript
   // When querying business data:
   .eq('city', selectedCity) // Explicit
   
   // Or intentionally cross-city:
   .select('city, COUNT(*) as count')
   .groupBy('city')
   ```

3. **HQ authentication is separate**
   ```typescript
   // Use hq_admins table (not city_admins)
   // Separate session cookie
   // Different middleware checks
   ```

### **❌ DON'T:**

1. **Don't put HQ at `app.qwikker.com/admin`**
   - Too easy to confuse with city admin
   - City detection logic might interfere

2. **Don't let HQ admin use city admin routes**
   - Keep them separate
   - If you want "impersonate", make it read-only

3. **Don't query without explicit city filter**
   - Always `.eq('city', selectedCity)`
   - Or intentionally cross-city with GROUP BY

---

## **IMPLEMENTATION PHASES**

### **Phase 1: Manual SQL (This Week)** ✅
- Add cities via SQL scripts
- Test with `*.localhost` subdomains
- Launch Bournemouth only

### **Phase 2: Basic HQ Admin (Weeks 2-3)**
- [ ] Create `/hq` routes structure
- [ ] HQ admin authentication
- [ ] Cities list dashboard
- [ ] Create city form
- [ ] City settings (basic)

### **Phase 3: Advanced Features (Month 2)**
- [ ] Cross-city analytics
- [ ] Cost monitoring
- [ ] API key management UI
- [ ] Feature toggles per city
- [ ] Impersonate city admin (read-only)

### **Phase 4: Automation (Month 3+)**
- [ ] Auto-import scheduler
- [ ] Budget alerts
- [ ] Health checks
- [ ] Audit logs

---

## **QUICK START (This Week)**

### **1. Add Calgary (5 mins):**

```bash
# Run the script:
psql < scripts/add-calgary-city.sql
# Or paste in Supabase SQL Editor
```

### **2. Test Calgary (2 mins):**

```bash
http://calgary.localhost:3000/user/discover
```

### **3. Plan HQ Admin (30 mins):**

- Sketch cities dashboard on paper
- List must-have features for MVP
- Decide on URL (hq.qwikker.com vs /hq)

### **4. Build HQ Admin (2 weeks):**

- Week 1: Auth + Cities list
- Week 2: Create form + Settings

---

## **WHY THIS MATTERS**

### **Without HQ Admin:**
- ❌ Manual SQL for every new city
- ❌ No visibility into platform health
- ❌ Can't monitor costs
- ❌ Painful to scale to 10+ cities

### **With HQ Admin:**
- ✅ Add city in 2 minutes via UI
- ✅ See all cities' health at a glance
- ✅ Monitor costs per city
- ✅ Scale to 100+ cities easily

---

## **FILES TO CREATE**

1. `/app/hq/admin/page.tsx` - Cities dashboard
2. `/app/hq/admin/cities/new/page.tsx` - Create city form
3. `/app/hq/admin/cities/[city]/settings/page.tsx` - City settings
4. `/app/hq/admin/analytics/page.tsx` - Cross-city analytics
5. `/app/hq/admin/costs/page.tsx` - Cost monitoring
6. `/app/hq/login/page.tsx` - HQ admin login

---

**Bottom Line:** You need HQ admin. Start with cities list + create form. Build the rest as you scale. 🚀

