# ATLAS FIX PLAN - Map Won't Move Issue

## THE PROBLEM
- Map canvas is only 338px tall (should be fullscreen ~1678px)
- Map responds to manual dragging but ignores ALL programmatic commands
- `setCenter()`, `setZoom()`, `jumpTo()`, `flyTo()` all silently fail
- Problem persists even after full restart (NOT Fast Refresh issue)

## ROOT CAUSE (HYPOTHESIS)
The map container is being **constrained by CSS layout** to 338px height. When a Mapbox map is initialized in a tiny container, it enters a broken state where programmatic commands are ignored.

**Evidence:**
- Canvas size: 1470x338 (wrong - should be 1470x1678)
- Business card carousel at bottom is ~338px tall
- Map container might be sharing space with the carousel

## THE FIX (Step-by-step for tomorrow)

### Step 1: Verify the Layout Issue
**File:** `components/atlas/AtlasMode.tsx` (line ~1165)

Current structure:
```jsx
<div className="fixed inset-0 z-50 bg-black">
  <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  {/* Other UI components */}
</div>
```

**Check if something is overriding the height.**

Run in console tomorrow:
```javascript
const mapDiv = document.querySelector('.mapboxgl-map')
const parent = mapDiv?.parentElement
const grandparent = parent?.parentElement

console.log('Map div height:', mapDiv?.offsetHeight)
console.log('Parent height:', parent?.offsetHeight)
console.log('Grandparent height:', grandparent?.offsetHeight)
console.log('Parent class:', parent?.className)
console.log('Grandparent class:', grandparent?.className)
```

### Step 2: Force Container to Full Height
**File:** `components/atlas/AtlasMode.tsx` (line ~1167)

Change:
```jsx
<div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ minHeight: '100vh' }} />
```

To:
```jsx
<div 
  ref={mapContainer} 
  className="absolute inset-0 w-full h-full" 
  style={{ 
    minHeight: '100vh',
    height: '100vh',
    width: '100vw',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 0
  }} 
/>
```

**Force it to take full viewport.**

### Step 3: Move Business Card Above Map
**Issue:** The business carousel might be pushing the map up.

**Check:** Is `BusinessCarousel` component inside the map container or outside?

**Fix:** Ensure carousel is rendered ABOVE the map with `position: absolute` and `z-index: 10`:
```jsx
<div className="fixed inset-0 z-50 bg-black">
  {/* Map layer (z-index 0) */}
  <div ref={mapContainer} className="absolute inset-0" style={{ zIndex: 0 }} />
  
  {/* UI layer (z-index 10+) */}
  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
    {/* All UI components here */}
  </div>
</div>
```

### Step 4: Reinitialize Map After Container is Full Height
**File:** `components/atlas/AtlasMode.tsx` (line ~175)

Add a forced resize AFTER map loads:
```typescript
mapInstance.on('load', () => {
  // ... existing code ...
  
  // Force container to recalculate
  setTimeout(() => {
    if (mapInstance && mapContainer.current) {
      const rect = mapContainer.current.getBoundingClientRect()
      console.log('[Atlas] Container size on load:', rect.width, 'x', rect.height)
      
      if (rect.height < 500) {
        console.error('[Atlas] ❌ CONTAINER TOO SMALL!', rect.height, 'px')
        // Force resize
        mapContainer.current.style.height = '100vh'
        mapInstance.resize()
      }
    }
  }, 500)
})
```

### Step 5: Nuclear Option - Destroy and Recreate Map
If the above doesn't work, add a "reset map" mechanism:

```typescript
const resetMap = useCallback(() => {
  if (map.current) {
    map.current.remove()
    map.current = null
  }
  setMapLoaded(false)
  // Trigger re-initialization
  setTimeout(() => {
    // Map will reinitialize via useEffect
  }, 100)
}, [])
```

## TESTING CHECKLIST (Tomorrow)

1. ✅ Check console for container height on load
2. ✅ Verify map div is full height (1678px, not 338px)
3. ✅ Test `window.__atlasMap.setCenter()` in console
4. ✅ Test clicking "Show on Atlas" from chat
5. ✅ Verify pins appear
6. ✅ Verify map flies to business location

## IF STILL BROKEN

**Last resort:** The issue might be in `user-chat-page.tsx` - check how AtlasMode is being rendered. It might be inside a flex container that's constraining it.

**File:** `components/user/user-chat-page.tsx`

Look for where `<AtlasMode />` is rendered and ensure its parent is NOT constraining height:
```jsx
{view === 'atlas' && (
  <div className="fixed inset-0 z-50"> {/* Must be fixed, not absolute within flex */}
    <AtlasMode ... />
  </div>
)}
```

---

## TOMORROW'S ACTION PLAN

1. **Start with Step 1** - verify container height
2. **Apply Step 2 & 3** - force full height and fix z-index
3. **Test** - should work at this point
4. **If not, Step 4** - add resize detection
5. **If still not, Step 5** - nuclear reset option

**Expected time:** 30 minutes if it's just CSS, 2 hours if we need to refactor layout.

## COMMIT MESSAGE (when fixed)
```
fix: Atlas map container height constraint

The map was initializing in a 338px tall container instead of fullscreen,
causing Mapbox to enter a broken state where programmatic movement commands
were ignored. Fixed by forcing absolute positioning and full viewport height
for the map container, and ensuring UI layers are rendered above with proper
z-index stacking.
```

---

Get some rest. We'll nail this tomorrow. 🛌
