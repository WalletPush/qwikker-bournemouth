# 🌍 Fully Dynamic Multi-Tenant System

## ✅ What's 100% Dynamic Now

### 1. Pass Installer Page (`/join`)
```
User visits: bournemouth.qwikker.com/join
↓
Server detects city from hostname
↓
Fetches city branding from franchise_crm_configs
↓
Renders page with "Get your Bournemouth pass"
↓
User submits form
↓
Calls /api/walletpass/create-main-pass with city
```

---

### 2. API Route (`/api/walletpass/create-main-pass`)

#### ✅ Dynamic Host Detection
```typescript
const host = request.headers.get('host') // bournemouth.qwikker.com
const citySubdomain = city?.toLowerCase() // bournemouth
const cityBaseUrl = `https://${citySubdomain}.qwikker.com`
```

#### ✅ Dynamic Pass URLs
All pass links use the **correct subdomain**:

```typescript
'Offers_Url': `${cityBaseUrl}/user/offers?wallet_pass_id=${serialNumber}`
// ✅ bournemouth.qwikker.com/user/offers?wallet_pass_id=QWIK-BOURNE-JOHN-1234567890

'AI_Url': `${cityBaseUrl}/s/${serialNumber.slice(-8)}/chat`
// ✅ bournemouth.qwikker.com/s/1234567890/chat

'Dashboard_Url': `${cityBaseUrl}/s/${serialNumber.slice(-8)}`
// ✅ bournemouth.qwikker.com/s/1234567890

'barcode_value': `${cityBaseUrl}/s/${serialNumber.slice(-8)}`
// ✅ QR code on pass scans to bournemouth.qwikker.com/s/...
```

---

### 3. Welcome Page Redirect

#### ✅ Client-Side (Relative Path)
```typescript
window.location.href = `/welcome?wallet_pass_id=${serialNumber}&name=${firstName} ${lastName}`
```

**Result:**
- Bournemouth user: `bournemouth.qwikker.com/welcome?...`
- London user: `london.qwikker.com/welcome?...`
- Paris user: `paris.qwikker.com/welcome?...`

**No hardcoding. Stays on same subdomain automatically.**

---

### 4. WalletPush Credentials

#### ✅ Per-City API Keys
```typescript
// From franchise_crm_configs:
walletpush_api_key: "city-specific-key"
walletpush_template_id: "city-specific-template"
```

Each franchise can have:
- Different WalletPush accounts
- Different pass designs
- Different branding

**Fallback:** Uses global env vars if city doesn't have custom keys.

---

### 5. Database Records

#### ✅ City-Specific User Records
When pass is created, `app_users` table gets:

```sql
INSERT INTO app_users (
  city,                    -- ✅ Dynamic (bournemouth/london/paris)
  wallet_pass_id,         -- ✅ Unique per pass
  first_name,
  last_name,
  email
)
```

---

## 🔄 Full Flow Example

### Scenario 1: Bournemouth User

1. **Visit:** `https://bournemouth.qwikker.com/join`
2. **Server detects:** `city = 'bournemouth'`
3. **Page shows:** "Get your Bournemouth pass"
4. **User submits form**
5. **API creates pass with:**
   - WalletPush key from Bournemouth's `franchise_crm_configs`
   - Pass URLs: `bournemouth.qwikker.com/user/offers`, etc.
   - Database record: `city = 'bournemouth'`
6. **User redirected to:** `bournemouth.qwikker.com/welcome?wallet_pass_id=...`
7. **Welcome page shows:** "Welcome, John!" with Bournemouth businesses

---

### Scenario 2: London User (Future)

1. **Visit:** `https://london.qwikker.com/join`
2. **Server detects:** `city = 'london'`
3. **Page shows:** "Get your London pass"
4. **User submits form**
5. **API creates pass with:**
   - WalletPush key from London's `franchise_crm_configs`
   - Pass URLs: `london.qwikker.com/user/offers`, etc.
   - Database record: `city = 'london'`
6. **User redirected to:** `london.qwikker.com/welcome?wallet_pass_id=...`
7. **Welcome page shows:** "Welcome, Jane!" with London businesses

---

## 🚫 What's NOT Hardcoded Anymore

### ❌ OLD System (GHL Funnel)
```javascript
// ❌ Hardcoded redirect
window.location.href = 'https://qwikkerdashboard-theta.vercel.app/welcome?...'

// ❌ Hardcoded webhook
const HIGHLEVEL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/...'

// ❌ Exposed secrets
const MOBILE_WALLET_APP_KEY = 'xIwpMeyEfuoAtvyCeLsNkQOuCYhOWahJYDHpQzlLfJbFWhptwLhArihcLcBCfpmF'
```

### ✅ NEW System
```typescript
// ✅ Dynamic redirect (stays on subdomain)
window.location.href = `/welcome?wallet_pass_id=${serialNumber}&...`

// ✅ No webhook needed (direct to database)
// ✅ Secrets on server only
const credentials = await getWalletPushCredentials(city)
```

---

## 🔐 Security

### ✅ What's Secure
- City detection: Server-side only
- WalletPush keys: Never exposed to browser
- API keys per city: Stored in `franchise_crm_configs` (service role access only)
- Pass URLs: Built dynamically on server
- Database writes: Server-side with validation

### ⚠️ Important Notes
- Each franchise can have their own WalletPush account
- Global fallback keys in `.env` for new franchises
- All city config reads use service role client (safe)

---

## 🧪 Testing

### Local Development
```bash
# Option 1: Edit /etc/hosts
sudo nano /etc/hosts
# Add: 127.0.0.1 bournemouth.localhost

# Visit: http://bournemouth.localhost:3000/join
```

### Production Testing
```bash
# Deploy to Vercel
git push origin homepage-build

# Test with real subdomain:
https://bournemouth.qwikker.com/join
```

---

## 📊 Database Requirements

### Required Columns in `franchise_crm_configs`
```sql
city                        TEXT PRIMARY KEY
display_name                TEXT NOT NULL
subdomain                   TEXT NOT NULL
walletpush_api_key          TEXT
walletpush_template_id      TEXT
walletpush_endpoint_url     TEXT
founding_member_enabled     BOOLEAN DEFAULT true
founding_member_copy        TEXT
status                      TEXT DEFAULT 'pending_setup'
```

### Migrations to Run
1. `20260125000002_add_founding_member_copy.sql` ← Run this!

---

## 🎯 Comparison: OLD vs NEW

| Feature | OLD (GHL Funnel) | NEW (Next.js System) |
|---------|------------------|----------------------|
| City detection | ❌ Hardcoded | ✅ From subdomain |
| Redirect URL | ❌ Hardcoded Vercel URL | ✅ Dynamic subdomain |
| Pass URLs | ❌ Hardcoded | ✅ City-specific subdomain |
| WalletPush keys | ❌ Exposed in JS | ✅ Server-side only |
| Webhook | ❌ GHL webhook needed | ✅ Direct to database |
| Branding | ❌ Same for all cities | ✅ Per-city customization |
| Security | ❌ Secrets in client JS | ✅ Server-only secrets |

---

## 🚀 Production Checklist

- [x] Server-side city detection from hostname
- [x] Dynamic pass URL generation
- [x] City-specific WalletPush credentials
- [x] Relative welcome redirect
- [x] Database user creation with city
- [x] Premium design (no emojis, restrained)
- [ ] Run migration: `20260125000002_add_founding_member_copy.sql`
- [ ] Test on real subdomain (bournemouth.qwikker.com)
- [ ] Verify full pass creation flow
- [ ] Test London subdomain when franchise created
- [ ] Verify RLS policies filter by city

---

## 💡 Key Takeaway

**EVERYTHING is now city-aware and subdomain-dynamic.**

No more hardcoded URLs. No more exposed secrets. No more GHL webhooks.

Just:
1. User visits `{city}.qwikker.com/join`
2. Gets pass with `{city}` branding
3. Redirects to `{city}.qwikker.com/welcome`
4. Sees `{city}` businesses only

**Pure, clean, scalable multi-tenancy.** 🎯
