# Quick Start: Localhost Onboarding with Google Places

Get onboarding working on localhost in **30 seconds**.

---

## Step 1: Add Environment Variable

Edit `.env.local` (create if it doesn't exist):

```bash
# Add this single line:
DEV_DEFAULT_CITY=bournemouth
```

That's it. No `?city=` needed anymore.

---

## Step 2: Start Dev Server

```bash
pnpm dev
```

---

## Step 3: Navigate to Onboarding

```
http://localhost:3000/onboarding
```

✅ **Google Places will load automatically!**

---

## What You Should See

### Browser Console (Dev Mode)
```
[Tenant Config] city=bournemouth source=env fallback=true
[GooglePlaces] Google Maps API loaded successfully
[GooglePlaces] Services initialized
```

### DOM (Open DevTools → Elements → Search)
```html
<!-- Only ONE script tag: -->
<script id="qwikker-google-maps" 
        src="https://maps.googleapis.com/maps/api/js?key=AIza...&libraries=places">
</script>
```

### User Interface
- "Search for your business on Google" autocomplete field
- Dropdown appears as you type
- Clean, premium design
- No error messages

---

## Troubleshooting

### "No city detected"
**Problem**: Forgot to add `DEV_DEFAULT_CITY` to `.env.local`  
**Fix**: Add `DEV_DEFAULT_CITY=bournemouth` to `.env.local` and restart server

### "No config found for city: bournemouth"
**Problem**: Database doesn't have bournemouth row in `franchise_crm_configs`  
**Fix**: Run migration or insert row with API keys

### Google Places not loading
**Problem**: Missing API key in DB  
**Fix**: Add `google_places_public_key` to bournemouth franchise config

### "Included multiple times" warning
**Problem**: Old browser cache  
**Fix**: Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Alternative: Use Query Parameter

If you don't want to use `DEV_DEFAULT_CITY`, you can still use query params:

```
http://localhost:3000/onboarding?city=bournemouth
```

But with `DEV_DEFAULT_CITY` set, you don't need the `?city=` anymore!

---

## Vercel Preview

Same approach works on Vercel preview URLs:

```bash
# Add to Vercel project settings → Environment Variables:
DEV_DEFAULT_CITY=bournemouth

# Then just:
https://qwikkerdashboard-theta.vercel.app/onboarding
# Works without ?city=
```

Or use query param:
```
https://qwikkerdashboard-theta.vercel.app/onboarding?city=bournemouth
```

---

## Production Subdomains

On production, city comes from subdomain automatically:

```
https://bournemouth.qwikker.com/onboarding
# City = bournemouth (from subdomain)
# No env var or query param needed
# Query params are BLOCKED for security (403)
```

---

## That's It! 🚀

You now have a **clean, premium, multi-tenant Google Places integration** that:
- ✅ Works on localhost without `?city=`
- ✅ Only loads Google Maps once (no duplicate scripts)
- ✅ Shows friendly error messages (no tech jargon)
- ✅ Is secure (server keys never exposed)
- ✅ Scales to production

**Developer happiness**: 📈📈📈
