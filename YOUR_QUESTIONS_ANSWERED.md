# YOUR QUESTIONS - ANSWERED

---

## **Q1: Should we build the HQ admin quickly? Or is it a big task?**

### **✅ Build a QUICK MVP (2-3 hours)**

**What to Build NOW:**
- Cities list page
- City settings (API keys only)
- Simple auth check

**Build Time Breakdown:**
- 30 mins: Security (create `hq_admins` table, auth helper)
- 30 mins: HQ layout + auth check
- 30 mins: Cities list
- 60 mins: City settings form

**Total: ~2.5 hours**

### **Why Build It:**
✅ Calgary is blocked by missing API keys  
✅ Adds cities without SQL  
✅ Foundation for future features  
✅ Much safer than open API endpoints  

### **What NOT to Build (Yet):**
⏸️ Dashboard with metrics  
⏸️ Import analytics  
⏸️ Audit logs  
⏸️ Global templates  

**Bottom Line:** Build the minimal version NOW to unblock Calgary. Add fancy features after launch.

---

## **Q2: Can I test domain detection locally yet?**

### **✅ YES! Test it right now:**

### **Method 1: `*.localhost` Subdomains (Easiest)**

Works on most systems without any setup:

```bash
# 1. Start your server
pnpm dev

# 2. Test in terminal
curl http://bournemouth.localhost:3000/api/internal/get-city
# Expected: {"success":true,"city":"bournemouth"}

# 3. Test in browser
http://bournemouth.localhost:3000/user/discover
# Should work if Bournemouth is in franchise_crm_configs

# 4. Test Calgary (will fail - not in DB yet)
http://calgary.localhost:3000/user/discover
# Expected: Error - Unknown franchise subdomain
```

### **Why `*.localhost` Works:**

Most browsers and systems automatically resolve `*.localhost` to `127.0.0.1` without needing `/etc/hosts` entries!

### **Method 2: Edit `/etc/hosts` (Alternative)**

If `*.localhost` doesn't work on your system:

```bash
# Add to /etc/hosts:
127.0.0.1 bournemouth.local
127.0.0.1 calgary.local
127.0.0.1 london.local

# Then test:
http://bournemouth.local:3000/user/discover
```

### **Quick Test Commands:**

```bash
# Test city detection API
curl http://bournemouth.localhost:3000/api/internal/get-city
curl http://calgary.localhost:3000/api/internal/get-city

# Test user pages
open http://bournemouth.localhost:3000/user/discover
open http://calgary.localhost:3000/user/discover
```

**Bottom Line:** Yes, you can test NOW using `*.localhost` subdomains!

---

## **Q3: Can we check the admin franchise setup form sends the right data to the right rows?**

### **🚨 CRITICAL SECURITY ISSUE FOUND!**

The `/api/admin/franchise` endpoint has **NO AUTHENTICATION**.

### **Current Problems:**

1. ❌ **Anyone can list all franchises:**
   ```bash
   curl http://localhost:3000/api/admin/franchise
   # Returns ALL cities + API keys!
   ```

2. ❌ **Anyone can create new cities:**
   ```bash
   curl -X POST http://localhost:3000/api/admin/franchise \
     -H "Content-Type: application/json" \
     -d '{"city":"evil","display_name":"Evil City",...}'
   ```

3. ❌ **Anyone can update API keys:**
   ```bash
   curl -X PUT http://localhost:3000/api/admin/franchise \
     -H "Content-Type: application/json" \
     -d '{"id":"abc-123","google_places_api_key":"stolen"}'
   ```

### **The Form is Fine, But the API is NOT!**

**Form (`franchise-setup-form.tsx`):**
- ✅ Sends correct data structure
- ✅ Validates required fields
- ✅ POSTs to `/api/admin/franchise`

**API (`app/api/admin/franchise/route.ts`):**
- ❌ No authentication check
- ❌ No authorization check
- ❌ Anyone can call it

### **Fix Required:**

1. **Create `hq_admins` table** (controls who can access HQ)
2. **Add auth check to API** (verify caller is HQ admin)
3. **Add `x-admin-email` header** (identify who's making request)

**See:** `HQ_ADMIN_QUICK_START.md` for complete fix

---

## **🎯 RECOMMENDED ACTION PLAN**

### **Today (2-3 hours):**

1. **Test Domain Detection (5 mins)**
   ```bash
   pnpm dev
   curl http://bournemouth.localhost:3000/api/internal/get-city
   ```

2. **Add Calgary to Database (2 mins)**
   ```sql
   -- Run: scripts/add-calgary-city.sql in Supabase
   ```

3. **Fix Security (30 mins)**
   - Create `hq_admins` table
   - Add yourself as HQ admin
   - Create `lib/auth/hq-admin.ts` helper

4. **Build HQ Admin (2 hours)**
   - HQ layout with auth check
   - Cities list page
   - City settings page

5. **Test (10 mins)**
   - Access `http://localhost:3000/hq/admin`
   - Click Calgary
   - Add API keys
   - Verify saved in DB

### **Result:**
✅ Calgary unblocked  
✅ Safe city management  
✅ Foundation for scaling  

---

## **📋 FILES TO READ:**

1. **`HQ_ADMIN_QUICK_START.md`** - Complete implementation guide
2. **`CITY_DETECTION_COMPREHENSIVE_AUDIT.md`** - Security audit results
3. **`MANAGING_FRANCHISE_CITIES.md`** - How to add/manage cities
4. **`scripts/add-calgary-city.sql`** - Ready-to-run SQL

---

## **🚀 QUICK START:**

```bash
# 1. Test domain detection
pnpm dev
curl http://bournemouth.localhost:3000/api/internal/get-city

# 2. Add Calgary (in Supabase SQL Editor)
# Run: scripts/add-calgary-city.sql

# 3. Create HQ admins table (in Supabase SQL Editor)
CREATE TABLE hq_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO hq_admins (email, name)
VALUES ('your-email@example.com', 'Your Name');

# 4. Build HQ Admin (follow HQ_ADMIN_QUICK_START.md)

# 5. Test Calgary
curl http://calgary.localhost:3000/api/internal/get-city
```

---

**Bottom Line:**
1. ✅ **Test domain detection:** Works NOW with `*.localhost`
2. ⚠️ **Fix security:** Required before building HQ
3. ✅ **Build HQ admin:** 2-3 hours for MVP
4. 🚀 **Result:** Calgary unblocked, safe scaling

**Ready to start?** 🚀

