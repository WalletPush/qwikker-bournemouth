# 🌍 MANAGING FRANCHISE CITIES

**How to add and manage cities in QWIKKER**

---

## **THE CONCEPT:**

Cities MUST exist in `franchise_crm_configs` to be valid subdomains.

**Why?** This is your multi-tenant security:
- Only provisioned cities can access the platform
- Prevents `evil.qwikker.com` from working
- Ensures each city has proper configuration

---

## **1. CHECK EXISTING CITIES**

### **SQL Query:**

```sql
-- See all configured cities
SELECT 
  city,
  display_name,
  country_code,
  country_name,
  status,
  created_at
FROM franchise_crm_configs
ORDER BY city;
```

### **Expected Output:**

| city | display_name | country_code | country_name | status |
|------|--------------|--------------|--------------|--------|
| bournemouth | Bournemouth | GB | United Kingdom | active |

---

## **2. CHECK REQUIRED COLUMNS**

### **SQL Query:**

```sql
-- See what columns exist and which are required
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'franchise_crm_configs'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

This tells you what you need to provide when adding a city.

---

## **3. ADD A NEW CITY (SQL)**

### **Basic Insert (Minimum Required):**

```sql
-- Add Calgary as a new franchise city
INSERT INTO franchise_crm_configs (
  city,
  display_name,
  country_code,
  country_name,
  currency_code,
  currency_symbol,
  status,
  created_at,
  updated_at
) VALUES (
  'calgary',                -- MUST be lowercase, no spaces
  'Calgary',                -- Display name
  'CA',                     -- ISO country code
  'Canada',                 -- Full country name
  'CAD',                    -- Currency code
  '$',                      -- Currency symbol
  'active',                 -- Make it immediately available
  NOW(),
  NOW()
);
```

### **Full Insert (With Optional Fields):**

```sql
-- Add London with more details
INSERT INTO franchise_crm_configs (
  city,
  display_name,
  country_code,
  country_name,
  currency_code,
  currency_symbol,
  status,
  
  -- Optional: API keys (can be NULL initially)
  google_places_api_key,
  resend_api_key,
  resend_from_email,
  
  -- Optional: Coordinates (for Google Places imports)
  latitude,
  longitude,
  
  -- Optional: Trial configuration
  trial_length_days,
  founding_member_discount,
  founding_member_until,
  
  created_at,
  updated_at
) VALUES (
  'london',
  'London',
  'GB',
  'United Kingdom',
  'GBP',
  '£',
  'active',
  
  NULL,  -- Add API keys later via admin UI
  NULL,
  'london@qwikker.com',
  
  51.5074,  -- London coordinates
  -0.1278,
  
  90,  -- 90-day trial
  20,  -- 20% founding member discount
  '2026-03-31',  -- Founding member deadline
  
  NOW(),
  NOW()
);
```

---

## **4. VERIFY THE CITY WORKS**

### **Test 1: Check Database**

```sql
SELECT city, display_name, status
FROM franchise_crm_configs
WHERE city = 'calgary';
```

Expected: 1 row returned

### **Test 2: Test Subdomain Detection**

```bash
# In your dev environment:
curl http://calgary.localhost:3000/api/internal/get-city

# Expected:
# {"success":true,"city":"calgary"}
```

### **Test 3: Test Discover Page**

```bash
# Open browser:
http://calgary.localhost:3000/user/discover

# Should:
# - Not error
# - Show Calgary businesses (or empty if none imported yet)
# - Console logs show "Using calgary from calgary.localhost:3000"
```

---

## **5. ADD CONSTRAINT (IMPORTANT)**

Prevent duplicate cities:

```sql
-- Add unique constraint on city column
ALTER TABLE franchise_crm_configs
ADD CONSTRAINT franchise_crm_configs_city_unique UNIQUE (city);
```

---

## **6. THE PROBLEM: Manual SQL is Tedious**

Every time you want to add a city, you'd need to:
1. Connect to Supabase
2. Run SQL
3. Remember all required fields
4. Test manually

**This doesn't scale.**

---

## **7. THE SOLUTION: HQ ADMIN INTERFACE** 🎯

You need a **global admin interface** separate from city admins.

### **Architecture:**

```
┌─────────────────────────────────────────┐
│  HQ ADMIN (Global)                      │
│  hq.qwikker.com/admin                   │
│  ────────────────────────────────────   │
│  • Create new cities                    │
│  • Set API keys per city                │
│  • View all cities' metrics             │
│  • Monitor costs across all cities      │
│  • Emergency controls                   │
└─────────────────────────────────────────┘
           │
           │ Manages
           ▼
┌─────────────────┬─────────────────┬─────────────────┐
│ Bournemouth     │ Calgary         │ London          │
│ (City Admin)    │ (City Admin)    │ (City Admin)    │
│ ───────────     │ ───────────     │ ───────────     │
│ • Import biz    │ • Import biz    │ • Import biz    │
│ • Approve       │ • Approve       │ • Approve       │
│ • Analytics     │ • Analytics     │ • Analytics     │
│ • CRM           │ • CRM           │ • CRM           │
└─────────────────┴─────────────────┴─────────────────┘
```

---

## **8. HQ ADMIN FEATURES (MVP)**

### **Page 1: Cities Dashboard**

```
┌──────────────────────────────────────────────┐
│ QWIKKER HQ • Cities                          │
├──────────────────────────────────────────────┤
│ [+ Create New City]                          │
│                                               │
│ ┌──────────────────────────────────────────┐ │
│ │ Bournemouth (GB) • Active                │ │
│ │ 47 businesses • 12 unclaimed • 3 pending │ │
│ │ [View] [Edit] [Analytics]                │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌──────────────────────────────────────────┐ │
│ │ Calgary (CA) • Draft                     │ │
│ │ 0 businesses • Not yet launched          │ │
│ │ [View] [Edit] [Launch]                   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### **Page 2: Create City Form**

```
┌──────────────────────────────────────────────┐
│ Create New City                              │
├──────────────────────────────────────────────┤
│ City Slug*         [calgary          ]       │
│ Display Name*      [Calgary          ]       │
│ Country*           [Canada (CA)     ▼]       │
│ Currency*          [CAD ($)         ▼]       │
│                                               │
│ Coordinates (for Google Places imports)     │
│ Latitude          [51.0447           ]       │
│ Longitude         [-114.0719         ]       │
│                                               │
│ Trial Settings                              │
│ Trial Length      [90] days                 │
│ Founding Discount [20] %                    │
│ Deadline          [2026-03-31        ]       │
│                                               │
│ Status            ○ Draft  ● Active          │
│                                               │
│ [Cancel]                    [Create City]    │
└──────────────────────────────────────────────┘
```

### **Page 3: City Settings**

```
┌──────────────────────────────────────────────┐
│ Calgary Settings                             │
├──────────────────────────────────────────────┤
│ API Keys                                     │
│ Google Places  [••••••••••••] [Rotate]       │
│ Resend         [Not Set     ] [Add]          │
│                                               │
│ Email Configuration                          │
│ From Email     [calgary@qwikker.com    ]     │
│ Admin Email    [admin@calgary.qwikker  ]     │
│                                               │
│ Features                                     │
│ ☑ Allow imports                              │
│ ☑ Allow claims                               │
│ ☐ AI chat (not yet)                          │
│                                               │
│ [Save Changes]                               │
└──────────────────────────────────────────────┘
```

---

## **9. DATABASE SCHEMA FOR HQ ADMIN**

### **Option A: Role-Based (Simplest)**

Add a column to your admin users table:

```sql
-- Add role column to city_admins
ALTER TABLE city_admins
ADD COLUMN role TEXT CHECK (role IN ('city_admin', 'hq_admin')) DEFAULT 'city_admin';

-- Make your account an HQ admin
UPDATE city_admins
SET role = 'hq_admin'
WHERE email = 'admin@qwikker.com';
```

### **Option B: Separate Table (Cleaner)**

```sql
-- Create HQ admins table
CREATE TABLE hq_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add your account
INSERT INTO hq_admins (email, name)
VALUES ('admin@qwikker.com', 'Your Name');
```

---

## **10. SECURITY FOR HQ ADMIN**

### **Critical Rules:**

1. ✅ **HQ routes MUST NOT use city detection**
   ```typescript
   // app/hq/admin/page.tsx
   // ❌ DON'T DO THIS:
   const city = await getCityFromHostname(...)
   
   // ✅ DO THIS:
   // HQ routes are global - no city scoping
   ```

2. ✅ **HQ queries MUST be explicit about city**
   ```typescript
   // When querying businesses:
   .eq('city', selectedCity) // Explicit filter
   
   // Or intentionally cross-city:
   .select('city, COUNT(*)').groupBy('city')
   ```

3. ✅ **HQ authentication separate from city admin**
   ```typescript
   // Check HQ admin status
   const isHQ = await isHQAdmin(user.email)
   if (!isHQ) return redirect('/unauthorized')
   ```

---

## **11. IMPLEMENTATION PLAN**

### **Phase 1: Manual SQL (This Week)**
- ✅ Add cities via SQL as needed
- ✅ Test with `*.localhost` subdomains
- ✅ Launch Bournemouth

### **Phase 2: Basic HQ Admin (Next 2 Weeks)**
- [ ] Create `/hq/admin` routes
- [ ] Cities dashboard (list, status)
- [ ] Create city form
- [ ] Edit city settings

### **Phase 3: Advanced HQ Features (Month 2)**
- [ ] Cross-city analytics
- [ ] Cost monitoring
- [ ] API key rotation
- [ ] Feature toggles per city

---

## **12. QUICK REFERENCE**

### **Add a City (SQL):**
```sql
INSERT INTO franchise_crm_configs (
  city, display_name, country_code, country_name,
  currency_code, currency_symbol, status,
  created_at, updated_at
) VALUES (
  'cityname', 'City Name', 'GB', 'United Kingdom',
  'GBP', '£', 'active',
  NOW(), NOW()
);
```

### **Check if City Exists:**
```sql
SELECT city FROM franchise_crm_configs WHERE city = 'calgary';
```

### **Test Subdomain:**
```bash
curl http://cityname.localhost:3000/api/internal/get-city
```

---

## **13. NEXT STEPS FOR YOU**

1. **Add Calgary Now (5 mins):**
   ```sql
   -- Run the SQL above with calgary details
   ```

2. **Test Calgary Subdomain (2 mins):**
   ```bash
   http://calgary.localhost:3000/user/discover
   ```

3. **Plan HQ Admin (30 mins):**
   - Sketch out what you need
   - Decide on URL (`hq.qwikker.com` or `qwikker.com/hq`)
   - List must-have features

4. **Build HQ Admin (1-2 weeks):**
   - Start with cities list
   - Add create form
   - Add settings page

---

**Bottom Line:** For now, SQL is fine. But as you scale to 10+ cities, you'll want HQ admin UI. Plan for it now. 🚀

