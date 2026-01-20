# MAINTENANCE MODE - QUICK REFERENCE

**Date:** 2026-01-20  
**Status:** ✅ CONFIGURED

---

## 🎯 HOW TO USE

### Enable Maintenance Mode

**1. Add to `.env.local`:**
```bash
MAINTENANCE_MODE=true
MAINTENANCE_BYPASS_TOKEN=your-secret-token-here
```

**2. Restart your dev server:**
```bash
pnpm dev
```

**3. Visit site:**
- Regular users see: "QWIKKER is coming soon" page
- You see the same UNLESS you use the bypass token

---

### Bypass Maintenance Mode (Admin Access)

**Visit with bypass token in URL:**
```
http://localhost:3000?bypass=your-secret-token-here
```

**Once accessed:**
- Cookie is set for 7 days
- No need to add `?bypass=` again
- Works across all pages

---

### Disable Maintenance Mode

**Option 1: Remove from `.env.local`**
```bash
# Just delete or comment out:
# MAINTENANCE_MODE=true
```

**Option 2: Set to false**
```bash
MAINTENANCE_MODE=false
```

**Then restart:**
```bash
pnpm dev
```

---

## 🔧 CONFIGURATION

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAINTENANCE_MODE` | No | `false` | Set to `true` to enable maintenance mode |
| `MAINTENANCE_BYPASS_TOKEN` | No | `''` | Secret token to bypass maintenance mode |

---

### What's Blocked vs Allowed

**✅ ALWAYS ALLOWED (even in maintenance mode):**
- Static files: `/_next/*`, `/favicon.ico`
- Robots & sitemap: `/robots.txt`, `/sitemap.xml`
- Images: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`

**❌ BLOCKED (unless bypassed):**
- All page routes: `/`, `/about`, `/dashboard`, etc.
- API routes: `/api/*` (blocked by default - see below to change)

---

### Block API Routes Too (Optional)

**Current config:** API routes are ALLOWED even in maintenance mode.

**To also block API routes:**

Edit `/Users/qwikker/qwikkerdashboard/middleware.ts`:

```typescript
export const config = {
  matcher: [
    // Remove the (?!api) exclusion to block API too:
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 🧪 TESTING

### Test 1: Verify Maintenance Page Shows
1. Set `MAINTENANCE_MODE=true` in `.env.local`
2. Restart server
3. Visit `http://localhost:3000`
4. **Expected:** See "QWIKKER is coming soon" page

---

### Test 2: Verify Bypass Works
1. With maintenance mode enabled
2. Visit `http://localhost:3000?bypass=your-secret-token-here`
3. **Expected:** See normal site
4. Check cookies: Should have `qwikker_bypass` cookie
5. Visit `http://localhost:3000` (without `?bypass=`)
6. **Expected:** Still see normal site (cookie works)

---

### Test 3: Verify Cookie Expires
1. Clear cookies in browser
2. Visit `http://localhost:3000`
3. **Expected:** See maintenance page again

---

## 🚀 PRODUCTION DEPLOYMENT

### Vercel

**1. Set environment variables in Vercel dashboard:**
- Go to: Project Settings → Environment Variables
- Add:
  - `MAINTENANCE_MODE` = `true`
  - `MAINTENANCE_BYPASS_TOKEN` = `your-production-secret-token`

**2. Redeploy:**
```bash
git push origin main
```

**3. Bypass in production:**
```
https://qwikker.com?bypass=your-production-secret-token
```

**4. Disable later:**
- Go to Vercel dashboard
- Remove or set `MAINTENANCE_MODE=false`
- Redeploy

---

### Other Platforms

**Railway / Render / Fly.io:**
- Add environment variables in their respective dashboards
- Same variables as above
- Redeploy/restart

**Self-hosted:**
- Add to `.env.production.local` or system environment
- Restart Node.js process

---

## 🔒 SECURITY

### Best Practices

**1. Use a strong bypass token:**
```bash
# Good:
MAINTENANCE_BYPASS_TOKEN=a8f3d9c2e1b4f7a6d5c8e9b2a1f3d9c2

# Bad:
MAINTENANCE_BYPASS_TOKEN=admin
```

**2. Generate a random token:**
```bash
# On macOS/Linux:
openssl rand -hex 32

# Or use this:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Rotate tokens after maintenance:**
- Change token after each maintenance window
- Prevents old tokens from working

**4. Don't commit `.env.local`:**
- Already in `.gitignore`
- Never commit actual tokens to repo

---

## 🎨 CUSTOMIZATION

### Change Maintenance Page Design

Edit the HTML in `/Users/qwikker/qwikkerdashboard/middleware.ts`:

```typescript
return new NextResponse(
  `<!doctype html>
<html lang="en">
<head>
  <!-- Change title, add your logo, etc. -->
</head>
<body>
  <!-- Your custom HTML here -->
</body>
</html>`,
  { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
)
```

---

### Change Cookie Duration

Default: 7 days

```typescript
maxAge: 60 * 60 * 24 * 7,  // 7 days

// Change to 1 day:
maxAge: 60 * 60 * 24,

// Change to 30 days:
maxAge: 60 * 60 * 24 * 30,
```

---

## 📋 TROUBLESHOOTING

### Issue: Maintenance page not showing

**Check:**
1. Is `MAINTENANCE_MODE=true` in `.env.local`?
2. Did you restart the dev server?
3. Check console logs for errors

---

### Issue: Bypass token not working

**Check:**
1. Is `MAINTENANCE_BYPASS_TOKEN` set in `.env.local`?
2. Did you use the correct token in URL?
3. Check browser cookies: Is `qwikker_bypass` set?
4. Try clearing cookies and re-accessing with `?bypass=`

---

### Issue: Still see normal site (not maintenance)

**Check:**
1. Is `MAINTENANCE_MODE` exactly `"true"` (string)?
2. Clear your cookies (you might have bypass cookie from earlier)
3. Try incognito window
4. Check server logs

---

### Issue: Static files not loading

**Check:**
1. Is your file path in the allowed list?
2. Check middleware `matcher` config
3. Add your file path to the allow list if needed

---

## 📞 SUPPORT

**To enable for production:**
1. Set env vars in hosting dashboard
2. Redeploy
3. Visit with bypass token to access

**To disable:**
1. Remove or set `MAINTENANCE_MODE=false`
2. Redeploy
3. Everyone can access normally

**Quick toggle (emergency):**
- Just change env var in hosting dashboard
- No code deploy needed (for Vercel/Railway/etc.)
