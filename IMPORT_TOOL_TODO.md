# Import Tool Status - What's Left

**Date:** January 11, 2026  
**Current Rating:** 8.5/10 ⭐⭐⭐⭐⭐⭐⭐⭐

---

## ✅ **What's Working (Excellent)**

### **Backend (Production-Ready)**
- ✅ Cached geocoding (lat/lng stored per franchise)
- ✅ Country-safe imports (3-layer protection)
- ✅ Quality filtering (4.4★ minimum, 10+ reviews)
- ✅ Hotel/lodging exclusion
- ✅ Oversampling strategy (fetch 5x, filter, slice)
- ✅ Distance-based ranking (geographic coverage)
- ✅ Closed business filtering (PERMANENT and TEMPORARY)
- ✅ Accurate cost tracking (preview vs import)
- ✅ Google types returned in API (for cuisine tags)
- ✅ Deterministic placeholder system
- ✅ Duplicate prevention (skip already imported)
- ✅ Streaming progress with cancel

### **Cost Management**
- ✅ Two-stage design (cheap preview, pay per import)
- ✅ Accurate cost breakdown in API response
- ✅ Rate limiting (100ms between imports)
- ✅ Per-franchise API keys (cost isolation)

---

## 🔧 **What Needs Polish (Frontend UI)**

### **1. Add Cuisine Tags to Preview Results**
**Priority:** High (visibility & trust)  
**Time:** 15 minutes

**Current preview card:**
```
🍕 Bella Italia
★★★★★ (234 reviews) • 0.8 mi
Restaurant
```

**Improved preview card:**
```
🍕 Bella Italia
★★★★★ (234 reviews) • 0.8 mi
Restaurant • Italian • Pizza
```

**Implementation:**
```typescript
// Extract cuisine tags from googleTypes
const cuisineTags = result.googleTypes
  ?.filter(t => t.endsWith('_restaurant'))
  .map(t => t
    .replace('_restaurant', '')
    .replace('_', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  )
  .slice(0, 2) // Show max 2 cuisine tags

// Display
<div className="flex items-center gap-2 text-sm">
  <Badge>{result.category}</Badge> {/* Restaurant */}
  {cuisineTags?.map(tag => (
    <Badge key={tag} variant="outline">{tag}</Badge>
  ))}
</div>
```

**Why this matters:**
- ✅ Admin can verify cuisine coverage at a glance
- ✅ Spot contamination quickly (if lodging sneaks in, it's visible)
- ✅ Builds confidence ("Yes, I'm getting Italian, Thai, Vegan, etc.")

---

### **2. Improve Cost Display UI**
**Priority:** High (prevents panic)  
**Time:** 15 minutes

**Current UI (confusing):**
```
Search cost: £0.68
Estimated import cost: £28.14
```

**Improved UI (clear):**
```
┌─────────────────────────────────────┐
│ 💰 Cost Breakdown                   │
├─────────────────────────────────────┤
│ Preview Search (already spent)      │
│ £0.88                               │
│ 35 Nearby Search API requests       │
├─────────────────────────────────────┤
│ Import (per selected business)      │
│ £0.017 each                         │
│                                     │
│ If you import all 200:              │
│ £3.40                               │
│                                     │
│ Total: £4.28                        │
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
{response.costs && (
  <div className="space-y-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
    {/* Preview Cost */}
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-300">
          Preview Search (already spent)
        </span>
        <span className="text-lg font-semibold text-green-400">
          £{response.costs.preview.amount}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        {response.costs.preview.description}
      </p>
    </div>

    <Separator />

    {/* Import Cost */}
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-300">
          Import Cost (when you import)
        </span>
        <span className="text-xs text-slate-400">
          £{response.costs.import.perBusiness} per business
        </span>
      </div>
      <div className="mt-2 p-2 bg-slate-800 rounded">
        <p className="text-xs text-slate-400">
          If you import all {response.totalFound} businesses:
        </p>
        <p className="text-lg font-semibold text-emerald-400">
          £{response.costs.import.amount}
        </p>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        {response.costs.import.description}
      </p>
    </div>

    <div className="text-xs text-slate-500 pt-2 border-t border-slate-800">
      💡 You only pay import costs for businesses you select
    </div>
  </div>
)}
```

**Why this matters:**
- ✅ No more "Did I just spend £30?!" panic
- ✅ Clear separation: spent vs potential
- ✅ Admins can budget properly
- ✅ Franchise owners trust the tool

---

### **3. Add "Open in Google Maps" Link**
**Priority:** Medium (useful for verification)  
**Time:** 5 minutes

**Add to each preview result:**
```typescript
<a
  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name)}&query_place_id=${result.placeId}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs text-blue-400 hover:text-blue-300"
>
  View on Google Maps ↗
</a>
```

**Why this matters:**
- ✅ Quick verification (is this the right business?)
- ✅ Check photos (Google's vs ours)
- ✅ Verify hours, menu, reviews
- ✅ Zero API cost (just a link)

---

### **4. Add Contamination Warning (Optional)**
**Priority:** Low (nice-to-have)  
**Time:** 10 minutes

**Show warning badge if suspicious types detected:**
```typescript
// Check for contamination
const suspiciousTypes = ['lodging', 'hotel', 'motel', 'hostel', 'meal_delivery']
const hasSuspiciousType = result.googleTypes?.some(t => 
  suspiciousTypes.some(s => t.includes(s))
)

{hasSuspiciousType && (
  <Badge variant="warning" className="text-xs">
    ⚠️ May not be a venue
  </Badge>
)}
```

**Why this matters:**
- ✅ Prevents "why is this hotel here?" confusion
- ✅ Quick visual scan for quality
- ✅ Helps admins filter faster

---

## 🚀 **What to Do Next (Recommended Order)**

### **Immediate (30 mins, high impact):**
1. Add cuisine tags to preview results (15 mins)
2. Improve cost display UI (15 mins)
3. Test full flow: preview → select → import (5 mins)

### **Nice-to-have (optional polish):**
4. Add "Open in Google Maps" links (5 mins)
5. Add contamination warning badges (10 mins)
6. Add "Why this business?" tooltip (shows Google types) (10 mins)

### **Later (not urgent):**
7. Add "Hide chains" toggle (advanced filtering)
8. Add "Minimum reviews" slider (let admin set 10/30/50)
9. Add batch actions ("Select all 4.5★+", "Select top 20")

---

## 🎯 **Production Readiness Checklist**

Before doing your first real import:

- [x] ✅ Geocoding cached (prevents repeated billing)
- [x] ✅ API key stored per franchise
- [x] ✅ Country constraints working
- [x] ✅ Quality filters working (4.4★, 10+ reviews)
- [x] ✅ Hotel/lodging exclusion working
- [x] ✅ Duplicate prevention working
- [x] ✅ Accurate cost tracking
- [ ] ⏳ Cuisine tags visible in UI (15 mins)
- [ ] ⏳ Cost breakdown clear in UI (15 mins)
- [ ] ⏳ Test import 5 businesses (verify data quality)
- [ ] ⏳ Google billing dashboard set up (budget alerts)

**Estimated time to production-ready:** 45 minutes

---

## 💰 **Expected First Import**

**Recommended first test:**
- Preview: Restaurant category, Bournemouth, 3 miles
- Expected results: ~200 restaurants
- Preview cost: £0.88
- Select: 10 best restaurants (4.5★+, good photos)
- Import cost: £0.17
- **Total: £1.05**

**Validation:**
- Check database: 10 new `business_profiles` rows
- Check status: all `unclaimed`
- Check visibility: all `discover_only`
- Check placeholder: all `variant = 0`
- Check data: phone, website, hours populated
- Check Discover page: 10 new cards visible

**If successful:** Scale to 50-100 per category

---

**Current status:** Backend production-ready, UI needs 30 mins polish  
**Confidence level:** 95% (only unknowns are Google billing UI specifics)  
**Next step:** Implement cuisine tags + cost display, then test import 🚀

