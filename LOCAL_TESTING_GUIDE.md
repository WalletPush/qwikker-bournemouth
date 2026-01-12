# 🧪 LOCAL MULTI-CITY TESTING GUIDE

**How to test city isolation on your local machine without DNS changes**

---

## **PROBLEM:**

Testing `bournemouth.qwikker.com` and `calgary.qwikker.com` requires DNS, which you don't have yet.

**Solution:** Use `*.localhost` subdomains - they work natively in modern browsers!

---

## **✅ METHOD 1: Use `.localhost` Subdomains (Easiest)**

### **No Configuration Required!**

Modern browsers automatically resolve `*.localhost` to `127.0.0.1`:

```
http://bournemouth.localhost:3000 → Works immediately!
http://calgary.localhost:3000 → Works immediately!
http://london.localhost:3000 → Works immediately!
```

### **How to Test:**

1. **Start your dev server:**
   ```bash
   pnpm dev
   ```

2. **Open multiple browser tabs:**
   ```
   http://bournemouth.localhost:3000/user/discover
   http://calgary.localhost:3000/user/discover
   http://london.localhost:3000/user/discover
   ```

3. **Verify isolation:**
   - Bournemouth tab should only show Bournemouth businesses
   - Calgary tab should only show Calgary businesses
   - Check browser console for city detection logs

### **What to Look For:**

```typescript
// Console logs you should see:
🧪 LOCAL TESTING: Using bournemouth from bournemouth.localhost:3000
🧪 LOCAL TESTING: Using calgary from calgary.localhost:3000
```

---

## **✅ METHOD 2: Edit Hosts File (Alternative)**

If `.localhost` doesn't work on your system:

### **1. Edit Hosts File:**

**Mac/Linux:**
```bash
sudo nano /etc/hosts
```

**Windows:**
```
Open Notepad as Administrator
File → Open → C:\Windows\System32\drivers\etc\hosts
```

### **2. Add These Lines:**

```
127.0.0.1 bournemouth.localhost
127.0.0.1 calgary.localhost
127.0.0.1 london.localhost
127.0.0.1 paris.localhost
```

### **3. Save and Test:**

```bash
# Test DNS resolution (should return 127.0.0.1)
ping bournemouth.localhost

# Visit in browser
http://bournemouth.localhost:3000
```

---

## **🧪 TESTING CHECKLIST**

### **Test 1: Discover Page Isolation**

```bash
# Open three tabs:
1. http://bournemouth.localhost:3000/user/discover
2. http://calgary.localhost:3000/user/discover  
3. http://london.localhost:3000/user/discover

# Expected:
- Each shows only businesses from that city
- Console logs show correct city detection
- No cross-contamination
```

### **Test 2: Claim Search Isolation**

```bash
# Bournemouth claim page
http://bournemouth.localhost:3000/claim

# Search for "coffee"
# API should call: POST /api/claim/search
# Should return only Bournemouth unclaimed businesses

# Calgary claim page
http://calgary.localhost:3000/claim

# Search for "coffee"
# Should return only Calgary unclaimed businesses (or empty)
```

### **Test 3: Admin Dashboard Isolation**

```bash
# Bournemouth admin
http://bournemouth.localhost:3000/admin

# Should show:
- Only Bournemouth businesses
- Only Bournemouth analytics
- Only Bournemouth franchise config

# Calgary admin
http://calgary.localhost:3000/admin

# Should show Calgary data only
```

### **Test 4: City Detection API**

```bash
# Test with curl:
curl http://bournemouth.localhost:3000/api/internal/get-city
# Expected: {"success":true,"city":"bournemouth"}

curl http://calgary.localhost:3000/api/internal/get-city
# Expected: {"success":true,"city":"calgary"}

curl http://unknown.localhost:3000/api/internal/get-city
# Expected: {"success":false,"error":"...Unknown franchise..."}
```

---

## **🚨 COMMON ISSUES & FIXES**

### **Issue 1: "This site can't be reached"**

**Cause:** Browser doesn't support `.localhost` subdomains

**Fix:** Use Method 2 (hosts file) instead

---

### **Issue 2: All subdomains show Bournemouth data**

**Cause:** City detection falling back to default

**Fix:** Check console logs:
```typescript
// Should see:
🧪 LOCAL TESTING: Using calgary from calgary.localhost:3000

// NOT:
🧪 DEV: localhost detected → defaulting to bournemouth
```

**Solution:** Ensure you're using `city.localhost` not just `localhost`

---

### **Issue 3: "Access denied: Unknown franchise"**

**Cause:** City doesn't exist in `franchise_crm_configs` table

**Fix:** Add the city to your database:
```sql
INSERT INTO franchise_crm_configs (city, status, display_name)
VALUES ('calgary', 'active', 'Calgary');
```

---

### **Issue 4: Port `:3000` causing issues**

**Cause:** Some code not stripping port from hostname

**Fix:** Already handled in updated `getCityFromHostname()`:
```typescript
const cleanHostname = hostname.split(':')[0] // Strips port
```

---

## **📊 VERIFICATION QUERIES**

### **Check City Isolation in Database:**

```sql
-- See what cities have data
SELECT city, COUNT(*) as business_count
FROM business_profiles
GROUP BY city;

-- Test query as if from Bournemouth
SELECT COUNT(*) FROM business_profiles
WHERE city = 'bournemouth'
  AND status IN ('approved','unclaimed','claimed_free');

-- Test query as if from Calgary
SELECT COUNT(*) FROM business_profiles
WHERE city = 'calgary'
  AND status IN ('approved','unclaimed','claimed_free');
```

---

## **🎯 WHAT ABOUT PLAIN `localhost:3000`?**

### **Development Mode (Current Behavior):**

```
http://localhost:3000 → Defaults to Bournemouth ✅
```

**Why:** Convenient for quick testing without thinking about cities

### **Production Mode (After Deploy):**

```
http://qwikker.com → Error / Redirect to marketing site ✅
http://app.qwikker.com → Error (must use city subdomain) ✅
```

**Why:** Prevents accidental "silent Bournemouth" in production

---

## **👨‍👦 TESTING WITH YOUR DAD**

### **If He's Testing Locally (Same Machine):**

1. He can use `bournemouth.localhost:3000`
2. No special setup needed (works in any modern browser)

### **If He's Testing Your Deployed Site:**

**Option A:** Wait for DNS setup
```
Wait until you have *.qwikker.com DNS configured
Then: bournemouth.qwikker.com will work
```

**Option B:** Use staging with single city
```
Deploy to Vercel preview URL
Set it up to only show Bournemouth
He uses the preview URL (e.g., qwikker-git-main-yourproject.vercel.app)
```

**Option C:** Temporary subdomain
```
Create a temporary CNAME:
demo.qwikker.com → your-vercel-app.vercel.app

Your code detects "demo" and defaults to Bournemouth for now
```

---

## **🚀 PRODUCTION READINESS**

### **Current State (DEV):**

| Hostname | City | Why |
|----------|------|-----|
| `localhost:3000` | `bournemouth` | Dev fallback ✅ |
| `bournemouth.localhost:3000` | `bournemouth` | Local testing ✅ |
| `calgary.localhost:3000` | `calgary` | Local testing ✅ |
| `unknown.localhost:3000` | ERROR | Blocks unknown ✅ |

### **Future State (PROD):**

| Hostname | City | Why |
|----------|------|-----|
| `qwikker.com` | ERROR | Must use subdomain 🔒 |
| `app.qwikker.com` | ERROR | Must use subdomain 🔒 |
| `bournemouth.qwikker.com` | `bournemouth` | Valid franchise ✅ |
| `calgary.qwikker.com` | `calgary` | Valid franchise ✅ |
| `evil.qwikker.com` | ERROR | Not in DB 🔒 |

---

## **📋 TESTING SESSION TEMPLATE**

Copy this and run through it:

```bash
# 1. Start dev server
pnpm dev

# 2. Open browser tabs:
Tab 1: http://bournemouth.localhost:3000/user/discover
Tab 2: http://calgary.localhost:3000/user/discover
Tab 3: http://bournemouth.localhost:3000/admin

# 3. In each tab, open DevTools Console

# 4. Verify in console:
# Tab 1: Should see "Using bournemouth from bournemouth.localhost"
# Tab 2: Should see "Using calgary from calgary.localhost"
# Tab 3: Should see "Using bournemouth from bournemouth.localhost"

# 5. Test claim search:
# Go to: http://bournemouth.localhost:3000/claim
# Search for "coffee"
# Check Network tab → /api/claim/search
# Response should only have Bournemouth businesses

# 6. Test API directly:
curl http://bournemouth.localhost:3000/api/internal/get-city | jq '.'
curl http://calgary.localhost:3000/api/internal/get-city | jq '.'

# 7. Test unknown subdomain:
curl http://unknown.localhost:3000/api/internal/get-city | jq '.'
# Should return error

# 8. ✅ If all pass, you're ready for production!
```

---

## **🎉 NEXT STEPS**

Once local testing confirms isolation works:

1. ✅ Deploy to Vercel staging
2. ✅ Set up wildcard DNS (`*.qwikker.com`)
3. ✅ Test on real subdomains
4. ✅ Launch! 🚀

---

**Questions?** Check console logs - they tell you exactly which city was detected and why! 🔍

