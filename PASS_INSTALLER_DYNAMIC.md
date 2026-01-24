# Pass Installer Page - Dynamic City System

## ✅ What's 100% Dynamic

### 1. City Detection
- **Server-side hostname parsing** (`app/(tenant)/join/page.tsx`)
- `bournemouth.qwikker.com/join` → city = `bournemouth`
- `london.qwikker.com/join` → city = `london`
- Works on production subdomains automatically

### 2. Branding (Per City)
```typescript
// Pulled from franchise_crm_configs:
- display_name: "Bournemouth" / "London" / etc
- currency_symbol: "£" / "$" / "€"
- founding_member_enabled: true/false
- founding_member_copy: Custom text per city
```

### 3. Pass Creation
- **API Route**: `/api/walletpass/create-main-pass`
- **Receives**: `{ firstName, lastName, email, city }`
- **Creates**: City-specific pass with WalletPush
- **Database**: Stores pass in `app_users` with correct city

### 4. Welcome Redirect
```typescript
/welcome?wallet_pass_id=${serialNumber}&name=${firstName} ${lastName}
```
- User sees THEIR name on the dashboard
- City context is preserved (already in `app_users` table)
- Session created with correct city filter

---

## 🔧 How It Works on Production

### Scenario 1: Bournemouth User
1. Visits: `bournemouth.qwikker.com/join`
2. Sees: "Get your **Bournemouth** pass"
3. Submits form
4. Receives: Pass with "Bournemouth" branding
5. Redirected to: `bournemouth.qwikker.com/welcome?...`
6. Dashboard shows: Bournemouth businesses only

### Scenario 2: London User (Future)
1. Visits: `london.qwikker.com/join`
2. Sees: "Get your **London** pass"
3. Submits form
4. Receives: Pass with "London" branding
5. Redirected to: `london.qwikker.com/welcome?...`
6. Dashboard shows: London businesses only

---

## 🛠️ Local Testing

### Problem
`localhost:3000` has no subdomain → city detection fails

### Solution Options

#### Option 1: Use subdomain on localhost
```bash
# Edit /etc/hosts (Mac/Linux):
sudo nano /etc/hosts

# Add:
127.0.0.1 bournemouth.localhost
127.0.0.1 london.localhost

# Then visit:
http://bournemouth.localhost:3000/join
```

#### Option 2: Test on Vercel preview
```bash
git push origin homepage-build
# Visit: your-app-git-homepage-build.vercel.app/join
# (Will use bournemouth fallback for .vercel.app domains)
```

---

## 📊 Database Schema

### Required Columns in `franchise_crm_configs`
```sql
city                        TEXT PRIMARY KEY
display_name                TEXT NOT NULL
currency_symbol             TEXT DEFAULT '£'
status                      TEXT DEFAULT 'pending_setup'
```

No additional migrations needed - these columns already exist!

---

## 🎨 Design Changes (Premium Feel)

### Before → After
- ❌ Green gradient header → ✅ Dark header with subtle border
- ❌ "Get Your VIP Pass" → ✅ "Get your {City} pass"
- ❌ Bold promo copy → ✅ Quiet, confident tone
- ❌ Rounded QR card → ✅ Engineered, inset shadow QR
- ❌ "Create My Pass" (loud) → ✅ "Get your pass" (calm)
- ❌ Green "Powered by" → ✅ Whisper-quiet footer

### Result
- Apple/Dyson aesthetic
- System component feel
- No hype, just function
- Ages well

---

## 🚀 Production Readiness Checklist

- [x] Server-side city detection
- [x] Dynamic branding per city
- [x] Secure API route (no keys exposed)
- [x] Device detection (desktop/iPhone/Android)
- [x] QR code generation
- [x] Welcome page redirect with user context
- [x] Database migration for founding member copy
- [x] Premium, restrained design
- [ ] Run migration: `20260125000002_add_founding_member_copy.sql`
- [ ] Test on production subdomain (bournemouth.qwikker.com)
- [ ] Verify pass creation flow end-to-end

---

## 🔐 Security Notes

### ✅ What's Secure
- City detection happens **server-side**
- Service role client used safely (read-only, specific fields)
- No secrets exposed to browser
- API route validates city against database
- Client never sees full `franchise_crm_configs` table

### ⚠️ Important
- `createServiceRoleClient()` is safe here because:
  1. Server component only
  2. Only reads safe fields (no secrets)
  3. City already validated
  4. No user input in query
