# 📧 HQ Email Configuration Setup Guide

## 🎯 Purpose

HQ needs its own email configuration to send platform-wide emails such as:
- **Franchise invitations** (when creating new franchises)
- **System announcements** (maintenance, updates)
- **Password reset emails** (for HQ/franchise admins)
- **Important notifications** (security alerts, billing)

This is **separate** from franchise-specific Resend keys stored in `franchise_crm_configs`.

---

## 📦 What Was Created

### **1. Database Table: `hq_config`**
Stores platform-level configuration:
- Email settings (Resend API key, from address, etc.)
- Future: Slack webhooks, global feature flags, etc.

### **2. Migration: `20260123000000_hq_config_table.sql`**
- Creates `hq_config` table
- Adds default email configuration template
- Creates helper functions: `get_hq_email_config()`, `update_hq_email_config()`
- Sets up RLS (HQ admins only)

### **3. Helper Library: `lib/email/hq-email-config.ts`**
- TypeScript functions to get/update HQ email config
- Fallback to environment variables (for migration)

---

## 🚀 Setup Steps

### **Step 1: Get Resend API Key**

1. Go to [Resend.com](https://resend.com)
2. Sign up/login with HQ email (e.g., `hq@qwikker.com`)
3. Go to **API Keys** → **Create API Key**
4. Name it: `Qwikker HQ`
5. Select permissions: `Sending access`
6. Copy the API key (starts with `re_...`)

---

### **Step 2: Verify Domain in Resend**

1. In Resend dashboard → **Domains** → **Add Domain**
2. Add: `qwikker.com`
3. Add the DNS records they provide to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (usually 5-30 minutes)
5. Test by sending an email from `hq@qwikker.com` in Resend UI

---

### **Step 3: Configure in Database**

**Option A: Via SQL (Supabase Dashboard)**

```sql
-- Update HQ email configuration
SELECT update_hq_email_config(
  p_resend_api_key := 're_ABC123...',  -- Your Resend API key
  p_from_email := 'hq@qwikker.com',
  p_from_name := 'Qwikker HQ',
  p_reply_to := 'support@qwikker.com',
  p_enabled := true
);

-- Verify it worked
SELECT * FROM hq_config WHERE config_key = 'email_settings';
```

**Option B: Via Environment Variables (Temporary Fallback)**

Add to `.env.local`:
```bash
# HQ Email Configuration (fallback)
RESEND_API_KEY=re_ABC123...
HQ_FROM_EMAIL=hq@qwikker.com
HQ_FROM_NAME=Qwikker HQ
HQ_REPLY_TO=support@qwikker.com
```

⚠️ **Note:** Database configuration takes precedence. Env vars are only used as fallback.

---

### **Step 4: Test HQ Email**

Create a test script:

```typescript
// scripts/test-hq-email.ts
import { getHQEmailConfigWithFallback } from '@/lib/email/hq-email-config'
import { Resend } from 'resend'

async function testHQEmail() {
  const config = await getHQEmailConfigWithFallback()
  
  if (!config.enabled || !config.resend_api_key) {
    console.error('❌ HQ email not configured')
    return
  }
  
  const resend = new Resend(config.resend_api_key)
  
  const result = await resend.emails.send({
    from: `${config.from_name} <${config.from_email}>`,
    to: 'your-test-email@example.com', // Change this
    subject: 'Test Email from Qwikker HQ',
    html: '<p>If you receive this, HQ email is configured correctly! ✅</p>'
  })
  
  console.log('✅ Test email sent:', result)
}

testHQEmail()
```

Run it:
```bash
npx tsx scripts/test-hq-email.ts
```

---

## 🏗️ **Future: HQ Admin UI**

Eventually, you'll want a UI for this instead of SQL.

**Suggested page: `/hqadmin/settings/email`**

```typescript
// app/hqadmin/settings/email/page.tsx
'use client'

export default function HQEmailSettingsPage() {
  const [config, setConfig] = useState<HQEmailConfig | null>(null)
  const [loading, setLoading] = useState(false)
  
  const handleSave = async () => {
    await fetch('/api/hq/config/email', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
  }
  
  return (
    <div>
      <h1>HQ Email Configuration</h1>
      
      <form onSubmit={handleSave}>
        <input
          type="text"
          placeholder="Resend API Key"
          value={config?.resend_api_key || ''}
          onChange={(e) => setConfig({ ...config, resend_api_key: e.target.value })}
        />
        
        <input
          type="email"
          placeholder="From Email"
          value={config?.from_email || ''}
          onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
        />
        
        <button type="submit">Save Configuration</button>
      </form>
    </div>
  )
}
```

**Corresponding API route: `/api/hq/config/email/route.ts`**

```typescript
export async function GET(request: NextRequest) {
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response
  
  const config = await getHQEmailConfig()
  return NextResponse.json({ config })
}

export async function PUT(request: NextRequest) {
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response
  
  const updates = await request.json()
  const config = await updateHQEmailConfig(updates)
  
  return NextResponse.json({ config })
}
```

---

## 🔒 Security Considerations

### **Storing API Keys**

✅ **Good:** Database (`hq_config` table with RLS)
- Only HQ admins can read/write
- Encrypted at rest by Supabase
- Can be rotated without code changes
- Audit trail in `hq_audit_logs`

⚠️ **Acceptable (temporary):** Environment variables
- Okay for MVP/testing
- Requires redeployment to rotate
- No audit trail

❌ **Bad:** Hardcoded in code
- Never do this

### **Resend API Key Permissions**

Only grant **Sending access**, not:
- ❌ Domain management
- ❌ API key management
- ❌ Billing access

### **Email Security**

1. ✅ **SPF, DKIM, DMARC:** Required for deliverability
2. ✅ **Verified domain:** Don't send from unverified domains
3. ✅ **Reply-to address:** Set to monitored support email
4. ✅ **Rate limiting:** Resend has built-in limits (100/day on free tier)

---

## 📊 Monitoring

### **Check Email Config Status**

```sql
-- View current configuration
SELECT 
  config_value->>'from_email' as from_email,
  config_value->>'enabled' as enabled,
  CASE 
    WHEN config_value->>'resend_api_key' IS NOT NULL THEN '✅ Configured'
    ELSE '❌ Missing'
  END as api_key_status,
  updated_at
FROM hq_config
WHERE config_key = 'email_settings';
```

### **Check Email Send Logs**

```sql
-- View audit logs for email-related actions
SELECT 
  actor_email,
  action,
  resource_type,
  metadata,
  created_at
FROM hq_audit_logs
WHERE action LIKE '%email%'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### **Problem: "HQ email not configured"**

**Check:**
1. Is the migration applied? `SELECT * FROM hq_config;`
2. Is API key set? `SELECT config_value->>'resend_api_key' FROM hq_config WHERE config_key = 'email_settings';`
3. Is `enabled = true`? `SELECT config_value->>'enabled' FROM hq_config WHERE config_key = 'email_settings';`

### **Problem: "Email not delivered"**

**Check:**
1. Domain verified in Resend?
2. SPF/DKIM records correct?
3. Check Resend logs: https://resend.com/logs
4. Check spam folder
5. Try sending to different email provider

### **Problem: "Permission denied to update hq_config"**

**Check:**
- Are you logged in as HQ admin?
- Is your HQ admin active? `SELECT * FROM hq_admins WHERE email = 'your-email@example.com';`

---

## ✅ Post-Setup Checklist

- [ ] Resend API key created
- [ ] Domain verified in Resend
- [ ] DNS records (SPF, DKIM, DMARC) added
- [ ] HQ config updated in database (or env vars)
- [ ] Test email sent successfully
- [ ] Franchise invitation email template created
- [ ] Password reset email template created

---

## 📝 Next Steps

Once HQ email is configured, you can:

1. ✅ Implement franchise invitation emails
2. ✅ Implement password reset flow
3. ✅ Send system announcements
4. ✅ Create email templates in Resend (optional)

---

**END OF GUIDE**
