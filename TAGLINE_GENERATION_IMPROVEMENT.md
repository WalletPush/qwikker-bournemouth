# Tagline Generation Improvement - Cuisine-Specific for Restaurants ✅

## 🔴 Problem

**Generic taglines for restaurants** don't reflect their cuisine:

**Example:**
- Business: **El Murrino** (Italian Restaurant, 4.6★)
- Generated: **"Comfort food, done right"** ❌
- Issue: Generic, not Italian-specific, feels off-brand

---

## 🎯 User Feedback Summary

### **What "Comfort food, done right" implies:**
- ❌ Hearty / indulgent (American/British/pub food)
- ❌ Not specifically Italian
- ❌ Generic placeholder that could apply to any restaurant

### **What an Italian restaurant should communicate:**
- ✅ Italian cuisine
- ✅ Location-based (where it is)
- ✅ Factual and safe (not marketing hype)
- ✅ Clearly AI-generated placeholder

### **Design Principle:**
> "AI-generated placeholder copy" — descriptive, factual, cuisine-led, clearly replaceable once claimed

---

## ✅ The Fix

### **New Restaurant-Specific Pattern:**

**File:** `lib/import/tagline-generator.ts`

For restaurants only, use: **`{Cuisine} + {Location}` pattern**

```typescript
if (systemCategory === 'restaurant' && displayCategory && city) {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
  
  // Extract cuisine from display_category (e.g., "Italian Restaurant" -> "Italian")
  const cuisineMatch = displayCategory.match(/^(.+?)\s+(restaurant|dining|cuisine)/i)
  const cuisine = cuisineMatch ? cuisineMatch[1] : displayCategory
  
  // Deterministic variant selection (3 options per cuisine)
  const variants = [
    `${cuisine} dining in ${cityName}`,
    `${cuisine} cuisine in ${cityName}`,
    `${displayCategory} in ${cityName}`,
  ]
  
  return variants[hash % variants.length]
}
```

---

## 📊 Before vs. After

### **El Murrino (Italian Restaurant)**

| Before | After |
|--------|-------|
| "Comfort food, done right" ❌ | **"Italian dining in Bournemouth"** ✅ |
| Generic, off-brand | Cuisine-specific, factual, location-based |

### **Wagamama (Japanese Restaurant)**

| Before | After |
|--------|-------|
| "Great food, welcoming atmosphere" ❌ | **"Japanese cuisine in Bournemouth"** ✅ |

### **The Spice Garden (Indian Restaurant)**

| Before | After |
|--------|-------|
| "Local favourites, made fresh" ❌ | **"Indian Restaurant in Bournemouth"** ✅ |

### **Pizza Express**

| Before | After |
|--------|-------|
| "Comfort food, done right" ❌ | **"Pizza Restaurant in Bournemouth"** ✅ |

---

## 🎯 Why This Is Better

### **✅ Factual & Safe**
- Derives from Google data (cuisine type + location)
- No subjective claims ("best", "authentic", "award-winning")
- Owner won't feel misrepresented

### **✅ Cuisine-Specific**
- Italian → "Italian dining"
- Chinese → "Chinese cuisine"
- Indian → "Indian Restaurant"
- Reflects actual business type

### **✅ Location-Based**
- "in Bournemouth" / "in Calgary"
- Helps users understand context
- Feels like a factual listing

### **✅ Clearly AI-Generated**
- Formulaic pattern signals "placeholder"
- Not trying to sound like marketing copy
- Sets expectation: "Updated when claimed"

### **✅ Scales Globally**
- Works for any cuisine + any city
- No need to maintain cuisine-specific templates
- Future-proof for new cuisine types

---

## 🔒 What's Still Safe

### **Avoided (correctly):**
❌ "Authentic Italian flavours"  
❌ "Family-run Italian restaurant"  
❌ "Award-winning"  
❌ "Best pizza in Bournemouth"  

These should **only** appear after claim.

### **Used (correctly):**
✅ "Italian dining in Bournemouth"  
✅ "Classic Italian cuisine"  
✅ "Japanese restaurant in Calgary"  

These are factual, location-based, and clearly placeholder.

---

## 📝 Implementation Details

### **1. Updated Function Signature**

**File:** `lib/import/tagline-generator.ts`

```typescript
export function generateTagline(
  stableId: string,
  businessName: string,
  systemCategory: SystemCategory,
  city?: string,
  displayCategory?: string // ✅ NEW: Cuisine-specific label
): string
```

### **2. Updated Import Route**

**File:** `app/api/admin/import-businesses/import/route.ts`

```typescript
const generatedTagline = generateTagline(
  placeId,
  place.displayName?.text || '',
  systemCategory,              // e.g., "restaurant"
  city,                        // e.g., "bournemouth"
  displayCategory              // ✅ NEW: e.g., "Italian Restaurant"
)
```

### **3. Deterministic Variants**

Each restaurant gets **one of 3 variants** (deterministic based on business ID):

1. `"Italian dining in Bournemouth"`
2. `"Italian cuisine in Bournemouth"`
3. `"Italian Restaurant in Bournemouth"`

**Why 3 variants?**
- Adds variety to Discover listings
- Still deterministic (same business = same tagline)
- All variants are factual and safe

---

## 🧪 Testing

### **Test 1: Import Italian Restaurant**

**Expected:**
```
Business: El Murrino
Tagline: "Italian dining in Bournemouth" ✅
```

### **Test 2: Import Chinese Restaurant**

**Expected:**
```
Business: China Palace
Tagline: "Chinese cuisine in Bournemouth" ✅
```

### **Test 3: Import Generic Restaurant (no cuisine)**

**Expected:**
```
Business: The Local Eatery
Tagline: "Restaurant in Bournemouth" ✅
```

### **Test 4: Import Non-Restaurant (Cafe)**

**Expected:**
```
Business: Cozy Corner Cafe
Tagline: "Great coffee, cozy vibes" ✅
(Uses existing BASE_TEMPLATES, unchanged)
```

---

## 🎯 Product Maturity Milestone

This change represents a key product quality milestone:

✅ **System works** (import, claim, display)  
✅ **Data flows correctly** (Google → DB → UI)  
✅ **Now refining quality** (tone, trust, brand fit)

This is exactly where a platform like QWIKKER starts to feel **premium and trustworthy**.

---

## 🚀 Future Enhancements

### **Admin "Regenerate Tagline" Button**
Allow admins to manually trigger tagline regeneration for unclaimed businesses.

### **Claim-Time Replacement Logic**
When a business is claimed, prompt owner:
> "Your current tagline: 'Italian dining in Bournemouth'  
> This was auto-generated. Want to customize it?"

### **`tagline_source` Tracking**
Already in place! Ensure proper usage:
- `tagline_source: 'generated'` → Can be overwritten on re-import
- `tagline_source: 'owner'` → Never overwrite

---

## ✅ Result

**Before:**
```
El Murrino: "Comfort food, done right" ❌
(Generic, off-brand, could be any restaurant)
```

**After:**
```
El Murrino: "Italian dining in Bournemouth" ✅
(Cuisine-specific, factual, location-based, clearly AI placeholder)
```

---

**Try importing a restaurant now - taglines should be cuisine-specific! 🎉**

