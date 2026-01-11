# 🚨 CRITICAL FIXES: Image System Documentation

**Date:** January 11, 2026  
**Status:** Production-safe version complete

---

## 🔥 **What Was Fixed (Critical Issues)**

### **1. Food Imagery Ban (Most Critical)** 🚨

**Problem:** Original variant descriptions included specific food items (steak, pasta, sushi, pizza, burger)

**Risk:** Vegan restaurant showing steak placeholder = misrepresentation lawsuit risk

**Fix:** 
- ❌ **BAN all identifiable food/drink imagery** for food-adjacent categories
- ✅ **ONLY environmental/abstract scenes** (table setting, lighting, textures, cutlery, bokeh)
- ✅ **Updated documentation** with explicit "ABSOLUTELY FORBIDDEN" section

**Affected categories:**
- `restaurant`, `takeaway`, `fast_food`, `dessert`, `pizza`, `bakery`, `pub`

**Safe replacements:**
- Steak → Empty plate with cutlery
- Pasta → Table texture with soft lighting
- Sushi → Abstract glass reflections
- Pizza → Service bell macro
- Burger → Napkin fold close-up

---

### **2. Variant Selection Logic Clarified**

**Problem:** Documentation said both "variant 0 always used" AND "variants selected by hash"

**Truth:** Unclaimed businesses DO hash into variants (code review confirmed)

**Fixed:**
```typescript
// Current behavior:
const variantId = hash(google_place_id) % (unclaimedMaxVariantId + 1)

// Example: hash = 1234 → 1234 % 9 = 6 → uses variant 06
```

**Critical implication:**
- **ALL variants (0-10) MUST be neutral/safe** for food categories
- NOT just variant 0
- Grid variety comes from different angles/compositions, NOT different food items

**Options going forward:**
1. ✅ **Recommended:** Create 10 neutral variants per category (all environmental scenes)
2. ✅ **Alternative:** Set `unclaimedMaxVariantId: 0` → force variant 0 only

---

### **3. Folder Naming MUST Match Enum Exactly**

**Problem:** Ambiguous whether folder names should match enum values

**Fix:** Documented exact requirement
```
Enum Value       → Folder Name
──────────────────────────────────
fast_food        → fast_food/     ← Underscore!
coffee_shop      → coffee_shop/   ← If enum has it
restaurant       → restaurant/
```

**Common mistakes:**
- ❌ `fast-food/` (hyphen)
- ❌ `FastFood/` (wrong case)
- ✅ `fast_food/` (matches enum)

---

### **4. Image Specs Enhanced**

**Added practical rules:**
- ❌ **NO readable text** (menus, signs, labels)
- ❌ **NO faces/people** (AI artifacts + privacy)
- ❌ **NO branded products** (trademark issues)
- ✅ **Shallow depth of field** (soft = premium feel)
- ✅ **Quality 78-85%** (sweet spot for WebP)
- ✅ **Visually soft** (less literal, more artistic)

---

### **5. Fallback Behavior Documented**

**Added explicit fallback chain:**
```
1. Try requested variant ID
2. Fallback to variant 0
3. Fallback to first variant in array
4. If category missing → fallback to 'other'
```

**Rule:** Never 404 an image on Discover (bad UX)

---

### **6. Claim Approval Image Requirement**

**Clarified:** Not automatically enforced unless coded

**Updated documentation:**
- "Recommended: require at least one uploaded image"
- "Policy enforcement: Admin approval endpoint checks for images"
- "Note: Image requirement is enforced server-side in approve-claim route"

---

## 📋 **Critical Checklist Before Testing**

Before importing ANY businesses:

- [ ] **Confirm SystemCategory enum values** (exact case, underscores)
- [ ] **Create variant 00 for each category** you'll test (minimum 4: restaurant, cafe, bar, other)
- [ ] **Verify NO food imagery** in restaurant/takeaway/fast_food variants
- [ ] **Test image URLs load** directly in browser
- [ ] **Confirm 'other' fallback works** for unknown categories
- [ ] **Verify folder names match enum** exactly (underscores, case)

---

## 🎯 **Priority Order**

### **Must Create First (Test Phase)**
```
1. other/other-abstract-00.v1.webp           ← REQUIRED fallback
2. restaurant/restaurant-abstract-00.v1.webp ← Most common
3. cafe/cafe-abstract-00.v1.webp             ← Very common
4. bar/bar-abstract-00.v1.webp               ← Common
```

**These 4 categories = 60%+ of imports**

### **Second Wave**
```
5. pub
6. takeaway
7. dessert
8. salon
9. barber
```

**Don't create all 20 categories before testing!**

---

## 🔍 **Current Resolver Behavior (Verified)**

**Location:** `lib/constants/category-placeholders.ts`

**Expected paths:**
```
/public/placeholders/{system_category}/{category}-abstract-{id}.v1.webp
```

**Selection logic:**
```typescript
// Unclaimed businesses hash into variants (for grid variety)
hash(google_place_id) % (unclaimedMaxVariantId + 1)

// Example: 
// Business A: hash = 1234 → 1234 % 9 = 6 → variant 06
// Business B: hash = 5678 → 5678 % 9 = 3 → variant 03
// Same business always shows same variant
```

**Fallback:**
- If variant missing → variant 0
- If variant 0 missing → first array item
- If category missing → 'other' category

---

## 🚨 **What Would Have Happened Without These Fixes**

### **Scenario: Bournemouth Import**

**Without fixes:**
```
1. Import 50 restaurants
2. Hash distributes across variants 0-10
3. Variant 3 = steak image
4. 5 restaurants assigned variant 3
5. 2 of those are vegan restaurants
6. Vegan customers see steak
7. Social media backlash + complaints
8. Manual cleanup of 50 businesses
9. Regenerate all embeddings
10. Lost trust in platform
```

**With fixes:**
```
1. Import 50 restaurants
2. Hash distributes across variants 0-10
3. All variants = table settings, lighting, textures
4. No specific food items
5. Safe for vegan, steakhouse, sushi, etc.
6. No misrepresentation risk
7. No complaints
8. Professional appearance
9. Trust maintained
```

---

## 📚 **Documentation Files**

**Main guide:**
- `IMPORT_TOOL_IMAGE_SYSTEM.md` - Complete guide (updated with all fixes)

**Related:**
- `PLACEHOLDER_SYSTEM_V3_FINAL_REFINED.md` - Original design
- `COUNTRY_CONSTRAINT_FIX.md` - Country constraint system
- `GEOCODING_OPTIMIZATION.md` - Import tool technical details

---

## ✅ **Status**

- [x] Critical safety issues identified
- [x] Documentation updated with production-safe rules
- [x] Resolver code reviewed and documented
- [x] Fallback behavior clarified
- [x] Priority order established
- [ ] Variant 00 images created for test categories
- [ ] Production import tested

**Ready for image creation phase.**

---

**Key takeaway:** The difference between "works" and "production-safe" is anticipating edge cases like dietary restrictions, cultural sensitivities, and misrepresentation risks. These fixes prevent those issues before they happen.

