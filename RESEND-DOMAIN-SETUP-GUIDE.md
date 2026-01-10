# Resend Email Setup Guide for Franchise Admins

## 📧 Overview
Each franchise location needs its own Resend account to send claim verification emails and business notifications. This is **quick and simple** to set up.

---

## ✅ Step 1: Sign Up for Resend (2 minutes)

1. Go to **[resend.com](https://resend.com)**
2. Click **"Sign Up"** (free tier = 3,000 emails/month, 100/day)
3. Verify your email address

---

## 🔑 Step 2: Get Your API Key (1 minute)

1. Go to **[https://resend.com/api-keys](https://resend.com/api-keys)**
2. Click **"Create API Key"**
3. Name it: `Qwikker Production`
4. Select permission: **"Sending access"**
5. Click **"Create"**
6. **Copy the key** (starts with `re_...`) - you'll need this!

---

## 🌐 Step 3: Verify Your Domain (5-10 minutes)

### **Option A: Use Your Own Domain (Recommended)**
Best for professional emails like `hello@bournemouth.qwikker.com`

1. Go to **[https://resend.com/domains](https://resend.com/domains)**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `bournemouth.qwikker.com` or `yourdomain.com`)
4. Resend will show you **3 DNS records** to add:
   - **SPF** (TXT record)
   - **DKIM** (TXT record)
   - **DMARC** (TXT record)

5. **Add these records to your domain's DNS settings:**
   - If using **Cloudflare**: Go to DNS → Add Records
   - If using **GoDaddy/Namecheap**: Go to DNS Management
   - Copy/paste each record exactly as shown

6. Wait **5-15 minutes** for DNS to propagate
7. Click **"Verify"** in Resend dashboard
8. You'll see a **green checkmark** ✅ when verified

### **Option B: Use Resend's Test Email (For Testing Only)**
**⚠️ NOT RECOMMENDED for production** - use for testing only

- From Email: `onboarding@resend.dev`
- No verification needed, works immediately
- **Limitations:** Only 100 emails/day, not your brand

---

## ⚙️ Step 4: Add to Qwikker Admin Dashboard

1. Log into your **Qwikker Admin Dashboard**
2. Go to **Settings** → **Franchise Setup**
3. Enter:
   - **Resend API Key:** `re_...` (from Step 2)
   - **From Email Address:** `hello@yourdomain.com` (verified in Step 3)
   - **From Name:** `QWIKKER Bournemouth` (or your city name)
4. Click **"Save"**

---

## ✅ Step 5: Test It (1 minute)

1. Go to `/claim` on your site
2. Search for an unclaimed business
3. Enter your email and request verification code
4. Check your inbox - you should receive the code within seconds!

---

## 💰 Pricing (as of 2025)

| Plan | Emails/Month | Emails/Day | Price |
|------|--------------|------------|-------|
| **Free** | 3,000 | 100 | $0 |
| **Pro** | 50,000 | 1,000 | $20/mo |
| **Business** | Unlimited | Unlimited | $85/mo |

**💡 Recommendation:** Start with the **Free plan**. If you're sending 100+ verification emails per day (very unlikely), upgrade to Pro.

---

## 🔒 Security Notes

- **Never share your API key** publicly
- Store it securely in your database (it's encrypted in Qwikker)
- You can revoke/regenerate keys anytime in Resend dashboard

---

## ❓ Common Issues

### "Domain not verified"
- **Solution:** Wait 15 minutes after adding DNS records, then click "Verify" again
- Check your DNS records are added correctly (no typos)

### "From email must be verified"
- **Solution:** Make sure the email domain matches your verified domain
- Example: If you verified `yourdomain.com`, use `hello@yourdomain.com`

### "API key invalid"
- **Solution:** Double-check you copied the full key (starts with `re_`)
- Try regenerating a new key in Resend dashboard

---

## 📚 More Help

- **Resend Docs:** [resend.com/docs](https://resend.com/docs)
- **DNS Help:** [resend.com/docs/dashboard/domains/introduction](https://resend.com/docs/dashboard/domains/introduction)
- **Support:** [resend.com/support](https://resend.com/support)

---

## ✨ Summary

1. Sign up at resend.com (2 min)
2. Get API key (1 min)
3. Verify domain (10 min)
4. Add to Qwikker admin (1 min)
5. Test! (1 min)

**Total Time: ~15 minutes** ⚡

