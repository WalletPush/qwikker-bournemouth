# Email Logo Fix - Quick Guide

**Problem:** Emails show a placeholder icon instead of the QWIKKER logo because email clients need **publicly accessible** absolute URLs.

**Current State:** Logo URL was set to `${baseUrl}/qwikker-logo-web.svg`, but:
- `NEXT_PUBLIC_BASE_URL` is not set
- Falls back to `https://bournemouth.qwikker.com/qwikker-logo-web.svg`
- Domain isn't live yet, so email clients can't load it

---

## **✅ Permanent Fix: Upload Logo to Cloudinary**

### **Step 1: Upload Logo**

1. Go to your Cloudinary dashboard: https://console.cloudinary.com/
2. Navigate to "Media Library"
3. Upload `public/qwikker-logo-web.svg`
4. Once uploaded, click on the file
5. Copy the **Public URL** (should look like):
   ```
   https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/qwikker-logo-web.svg
   ```

### **Step 2: Add to Environment Variables**

Add to `.env.local` (and Vercel):
```bash
CLOUDINARY_LOGO_URL=https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/qwikker-logo-web.svg
```

### **Step 3: Add to Vercel**

1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add:
   - **Key:** `CLOUDINARY_LOGO_URL`
   - **Value:** Your Cloudinary logo URL
   - **Environments:** Production, Preview, Development

### **Step 4: Redeploy**

```bash
# Restart local dev server
pnpm dev

# Or trigger Vercel redeploy
git push
```

---

## **🧪 Testing**

After setting `CLOUDINARY_LOGO_URL`:

1. Visit `http://localhost:3000/claim`
2. Search for a business (or use mock with `?mock=1`)
3. Start claim flow and request verification email
4. Check email → logo should now display correctly

---

## **📝 What Was Changed**

Updated 3 email templates to use `CLOUDINARY_LOGO_URL`:

1. **Verification Email** - `app/api/claim/send-verification/route.ts`
2. **Claim Submitted Email** - `app/api/claim/submit/route.ts`
3. **Claim Approved Email** - `app/api/admin/approve-claim/route.ts`

**Before:**
```typescript
const logoUrl = `${baseUrl}/qwikker-logo-web.svg`
```

**After:**
```typescript
const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                `https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg` // Placeholder
```

---

## **⚠️ Current Placeholder**

The code currently uses a demo Cloudinary URL as fallback:
```
https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg
```

**This won't work** - it's just a placeholder. You MUST upload your actual logo and set `CLOUDINARY_LOGO_URL`.

---

## **🎯 Quick Cloudinary Upload (CLI Method)**

If you have Cloudinary CLI installed:

```bash
# Upload logo
cloudinary upload public/qwikker-logo-web.svg --public-id qwikker-logo-web --resource-type image

# Get the URL (copy output)
```

---

## **Alternative: Use a CDN or Public GitHub URL**

If you don't want to use Cloudinary:

### **Option A: GitHub Raw URL**
1. Commit logo to a **public** GitHub repo
2. Use GitHub raw URL:
   ```
   https://raw.githubusercontent.com/yourusername/yourrepo/main/public/qwikker-logo-web.svg
   ```

### **Option B: Vercel Static URL (once live)**
Once your domain is live:
```bash
CLOUDINARY_LOGO_URL=https://bournemouth.qwikker.com/qwikker-logo-web.svg
```

---

## **Environment Variables Summary**

Add to `.env.local`:
```bash
# Logo for emails (must be publicly accessible)
CLOUDINARY_LOGO_URL=https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/qwikker-logo-web.svg
```

Add to `docs/ENVIRONMENT_VARIABLES.md` if not already listed.

---

## **✅ Verification Checklist**

- [ ] Logo uploaded to Cloudinary
- [ ] `CLOUDINARY_LOGO_URL` added to `.env.local`
- [ ] `CLOUDINARY_LOGO_URL` added to Vercel environment variables
- [ ] Local dev server restarted
- [ ] Test email sent and logo displays correctly
- [ ] Changes committed and pushed to production

---

**Status:** Ready to upload logo and configure environment variable.

