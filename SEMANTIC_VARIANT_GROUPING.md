# Semantic Variant Grouping for Multi-Type Categories

**Date:** January 11, 2026  
**Status:** Implemented for `salon` category

---

## 🎯 **The Problem**

Some `system_category` values encompass multiple distinct business types:

| Category | Includes |
|----------|----------|
| `salon` | Hair salons, nail salons, spas, beauty salons, waxing |
| `retail` | Clothing, gifts, jewelry, home goods, bookshops |
| `venue` | Wedding venues, concert halls, theaters, sports arenas |
| `entertainment` | Arcades, cinemas, bowling, escape rooms |

**Issue:** A single "default" placeholder can misrepresent businesses.

**Example:**
- Hair styling tools as default for `salon` category
- ❌ Misrepresents nail salons (no nails shown)
- ❌ Misrepresents spas (no wellness imagery)
- ❌ Feels inaccurate to users

---

## ✅ **The Solution: Semantic Variant Groups**

Instead of treating all variants as equal, **group them by business type** and control which ones can be auto-assigned.

### **Structure:**
```
Variants 0-N: NEUTRAL GROUP (ultra-safe, auto-assigned)
  - Abstract, environmental, non-specific
  - Safe for ALL business types in this category
  - Used for unclaimed imports

Variants N+1 onward: SPECIFIC GROUPS (admin-only)
  - Clearly labeled by business type
  - Only selected by admin after verification
  - Examples: "HAIR", "NAILS", "SPA", "CLOTHING", "GIFTS"
```

---

## 🔧 **Implementation: Salon / Spa Category**

### **Before (Too Permissive):**
```typescript
'salon': {
  variants: [
    { id: 0, description: 'White towels and spa setting' },
    { id: 1, description: 'Nail polish bottle' }, // ⚠️ Misrepresents hair salons
    { id: 2, description: 'Makeup brush' }, // ⚠️ Misrepresents spas
    { id: 3, description: 'Essential oil' }, // ⚠️ Too spa-specific
    // ... etc
  ],
  unclaimedMaxVariantId: 10, // ❌ Allows nail/makeup/hair imagery for unclaimed
}
```

**Problem:** Unclaimed hair salon could get nail polish placeholder (hash-based selection)

---

### **After (Semantic Groups):**
```typescript
'salon': {
  variants: [
    // ═══════════════════════════════════════════
    // NEUTRAL GROUP (Auto-assigned)
    // ═══════════════════════════════════════════
    { id: 0, filename: 'salon-abstract-00.v1.webp', 
      description: '🔒 NEUTRAL: White towels and spa setting (safe for all)' },
    { id: 1, filename: 'salon-abstract-01.v1.webp', 
      description: '🔒 NEUTRAL: Soft fabric texture (safe for all)' },
    { id: 2, filename: 'salon-abstract-02.v1.webp', 
      description: '🔒 NEUTRAL: Cream/product texture (safe for all)' },
    
    // ═══════════════════════════════════════════
    // BEAUTY / AESTHETICS GROUP (Admin-only)
    // ═══════════════════════════════════════════
    { id: 3, filename: 'salon-abstract-03.v1.webp', 
      description: '✨ BEAUTY: Makeup brush and palette' },
    { id: 4, filename: 'salon-abstract-04.v1.webp', 
      description: '✨ BEAUTY: Beauty products on shelf' },
    { id: 5, filename: 'salon-abstract-05.v1.webp', 
      description: '✨ BEAUTY: Mirror and lighting' },
    
    // ═══════════════════════════════════════════
    // NAILS GROUP (Admin-only)
    // ═══════════════════════════════════════════
    { id: 6, filename: 'salon-abstract-06.v1.webp', 
      description: '💅 NAILS: Nail polish bottles' },
    { id: 7, filename: 'salon-abstract-07.v1.webp', 
      description: '💅 NAILS: Nail tools and files' },
    { id: 8, filename: 'salon-abstract-08.v1.webp', 
      description: '💅 NAILS: Manicure station' },
    
    // ═══════════════════════════════════════════
    // SPA GROUP (Admin-only)
    // ═══════════════════════════════════════════
    { id: 9, filename: 'salon-abstract-09.v1.webp', 
      description: '🧘 SPA: Massage stones and candles' },
    { id: 10, filename: 'salon-abstract-10.v1.webp', 
      description: '🧘 SPA: Essential oils and diffuser' },
  ],
  unclaimedMaxVariantId: 2, // 🔒 CRITICAL: Only 0-2 allowed for unclaimed
  icon: '💅',
  label: 'Salon / Spa',
  accentColor: 'text-rose-400',
  overlayGradient: 'from-black/60 via-black/40 to-transparent'
}
```

**Result:**
- ✅ Imported/unclaimed businesses always get variants 0-2 (neutral)
- ✅ Admin can manually select beauty/nails/spa variants after verification
- ✅ No misrepresentation
- ✅ Business feels accurately represented

**⚠️ IMPORTANT:** HAIR variants were intentionally excluded because:
- Hair salons map to `barber` category (NOT `salon`)
- Hair imagery belongs in `barber` placeholders only
- Including hair variants in `salon` would create confusion and duplication

---

## 🎛️ **Admin UI Implications**

### **Current Placeholder Selector:**
```
[Dropdown]
Variant 0 - White towels and spa setting
Variant 1 - Nail polish bottle
Variant 2 - Makeup brush bristles
...
```

### **Improved Placeholder Selector (Grouped):**
```
[Dropdown]
━━━━━━ NEUTRAL (Safe for All) ━━━━━━
🔒 Variant 0 - White towels and spa setting
🔒 Variant 1 - Soft fabric texture
🔒 Variant 2 - Cream/product texture

━━━━━━ HAIR SALON SPECIFIC ━━━━━━
💇 Variant 3 - Scissors and styling tools
💇 Variant 4 - Brushes and combs
💇 Variant 5 - Hair product bottles

━━━━━━ NAIL SALON SPECIFIC ━━━━━━
💅 Variant 6 - Nail polish bottles
💅 Variant 7 - Nail tools and files
💅 Variant 8 - Manicure station

━━━━━━ SPA / WELLNESS SPECIFIC ━━━━━━
🧘 Variant 9 - Massage stones and candles
🧘 Variant 10 - Essential oils and diffuser
```

**Additional UI polish (optional):**
- Show thumbnail previews
- Add confirmation when selecting specific variants
- Disable specific variants for unclaimed businesses (enforce `unclaimedMaxVariantId`)

---

## 📋 **Other Categories That Might Need This**

| Category | Current Scope | Potential Groups |
|----------|---------------|------------------|
| `retail` | All retail | CLOTHING / GIFTS / JEWELRY / HOME / BOOKS |
| `venue` | All event spaces | WEDDING / CONCERT / THEATER / SPORTS |
| `entertainment` | All entertainment | ARCADE / CINEMA / BOWLING / ESCAPE ROOM |
| `restaurant` | All restaurants | Already handled with food-safety rules |
| `bar` | All bars/pubs | COCKTAILS / WINE / BEER / PUB (maybe?) |

**Recommendation:** Review these categories if users report misrepresentation or if you want more precise admin control.

---

## 🔒 **Safety Enforcement**

### **1. Database Schema**
```sql
-- business_profiles.placeholder_variant is just an integer
-- Enforcement happens at application level
placeholder_variant INTEGER DEFAULT 0
```

### **2. Application Logic (Current)**
```typescript
// lib/constants/category-placeholders.ts
export function getPlaceholder(
  systemCategory: SystemCategory,
  googlePlaceId: string,
  manualVariantId?: number | null,
  businessStatus?: string
) {
  const categoryData = PLACEHOLDER_LIBRARY[systemCategory] || PLACEHOLDER_LIBRARY['other']

  // Determine requested variant ID (hash for unclaimed, manual for others)
  const requestedId = manualVariantId !== null && manualVariantId !== undefined
    ? manualVariantId
    : hashString(googlePlaceId) % (categoryData.unclaimedMaxVariantId + 1)

  // 🔒 GUARDRAIL: Clamp to unclaimed max for unclaimed businesses
  const safeId = businessStatus === 'unclaimed'
    ? Math.min(requestedId, categoryData.unclaimedMaxVariantId)
    : requestedId

  // Find variant by ID (not array index)
  const chosenVariant = categoryData.variants.find(v => v.id === safeId)
    ?? categoryData.variants.find(v => v.id === 0)
    ?? categoryData.variants[0] // Final fallback

  // ... rest of function
}
```

**Key points:**
- ✅ `unclaimedMaxVariantId` enforces neutral-only for unclaimed
- ✅ Hash-based selection stays within safe range (0-2 for salon)
- ✅ Admin can select any variant for claimed/approved businesses
- ✅ Runtime guardrail clamps variants for unclaimed businesses

---

## ✅ **Validation Checklist**

Before deploying semantic variant grouping:

- [x] Update `PLACEHOLDER_LIBRARY` with semantic groups
- [x] Set `unclaimedMaxVariantId` to last neutral variant ID
- [x] Add emoji/label prefixes to variant descriptions (e.g., 🔒 NEUTRAL, 💇 HAIR)
- [x] Document in `IMPORT_TOOL_IMAGE_SYSTEM.md`
- [ ] Update admin UI to show grouped variants (optional, nice-to-have)
- [ ] Generate actual placeholder images matching the new structure
- [ ] Test: Import business → should get neutral variant (0-2)
- [ ] Test: Admin manually select hair variant (3-5) → should work
- [ ] Test: Try to assign hair variant to unclaimed → should clamp to 2

---

## 🎯 **Benefits**

### **1. Safety**
- ✅ No misrepresentation (hair salon never shows nail imagery on import)
- ✅ Neutral defaults protect against edge cases

### **2. Flexibility**
- ✅ Admin can customize after verification
- ✅ Business feels accurately represented
- ✅ No need to split categories (keep `salon` unified)

### **3. Scalability**
- ✅ Works for any multi-type category
- ✅ Easy to add new groups (just add variants + update `unclaimedMaxVariantId`)
- ✅ No database schema changes needed

### **4. UX**
- ✅ Users see appropriate imagery for each business type
- ✅ Admins have clear control
- ✅ Businesses feel individually represented (even with placeholders)

---

## 📊 **Comparison: Before vs After**

| Scenario | Before | After |
|----------|--------|-------|
| **Import hair salon** | Could get nail polish placeholder (hash) | Always gets neutral towels/fabric (0-2) |
| **Import nail salon** | Could get makeup brush placeholder (hash) | Always gets neutral towels/fabric (0-2) |
| **Import spa** | Could get hair tools placeholder (hash) | Always gets neutral towels/fabric (0-2) |
| **Admin verifies hair salon** | Can manually pick any variant | Can pick hair-specific variants (3-5) |
| **Admin verifies nail salon** | Can manually pick any variant | Can pick nail-specific variants (6-8) |
| **Admin verifies spa** | Can manually pick any variant | Can pick spa-specific variants (9-10) |
| **Business claims listing** | Must upload real images | Must upload real images (unchanged) |

---

**Status:** Implemented for `salon` category. Ready to apply to other multi-type categories if needed.

**Files modified:**
- `lib/constants/category-placeholders.ts` - Updated `salon` placeholder library
- `IMPORT_TOOL_IMAGE_SYSTEM.md` - Added semantic grouping documentation
- `SEMANTIC_VARIANT_GROUPING.md` - This document (new)

