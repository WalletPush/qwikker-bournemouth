# ATLAS DEBUG GUIDE

## Test This NOW:

1. Open Atlas
2. Open browser console (F12)
3. Look for these logs:

### On Atlas Open:
```
[Atlas] 🔍 User location effect: {mapLoaded: true/false, hasUserLocation: true/false, ...}
[Atlas] Initializing map at: {lat, lng}
[Atlas] Map loaded successfully
```

### When You Click Recenter:
```
[Atlas] 🔘 RECENTER BUTTON CLICKED
[Atlas] userLocation: {lat: X, lng: Y} or null
[Atlas] locationStatus: "granted" or "denied" or...
```

## What to Look For:

**If userLocation is NULL:**
- Location permission was denied OR
- Location request failed OR
- You're passing null from the parent

**If map.current is null:**
- Map failed to initialize
- Check for Mapbox token errors in console
- Check network tab for failed style/tile requests

**If both exist but nothing happens:**
- Check canvas size (should NOT be 0x0)
- Check if isStyleLoaded is true
- Check if flyTo is actually being called

## Quick Fixes to Try:

1. **Grant location permission explicitly**
2. **Reload page after granting**
3. **Check browser console for Mapbox errors**
4. **Verify Mapbox token is valid** (check franchise_crm_configs table)

---

# TIER BRANDING FIX - CRITICAL

This is a LEGAL/TRUST issue - businesses paying for Spotlight expect priority.

## Problem:
- AI is calling non-Pick businesses "Qwikker Picks"
- Featured businesses appearing above Spotlight
- No tier-based sorting in AI responses

## Fix Required:
1. **Server-side tier sorting** (Spotlight > Featured > Pick > Standard)
2. **Conditional closing copy** (only say "Qwikker Picks" if ALL are picks)
3. **Per-item tier callouts** in AI descriptions

Need to see:
- Where businessCarousel is built (API route or hybrid-chat)
- Where tier/isQwikkerPick is assigned
- Where the closing copy is generated
