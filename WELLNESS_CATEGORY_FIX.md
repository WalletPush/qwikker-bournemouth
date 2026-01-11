# Wellness Category Fix - Semantic Grouping Applied

**Date:** January 11, 2026  
**Triggered by:** ChatGPT feedback - "wellness is NOT automatically safe"

---

## 🚨 **The Problem**

**Initial assessment:** "wellness doesn't need semantic grouping"  
**Reality check:** `wellness` includes VERY different business types:

```
wellness category includes:
✅ massage_spa (uses stones, oils, diffuser)
✅ physiotherapist (uses treatment table, equipment, NO spa imagery)
✅ chiropractor (uses adjustment table, equipment, NO spa imagery)
✅ acupuncture (uses needles, herbs, NO spa imagery)
✅ osteopath (uses treatment table, equipment, NO spa imagery)
✅ wellness_center (holistic, varies widely)
```

**Problem identified:**
```
Initial placeholders: massage stones, diffuser, spa imagery at variants 1-10 ❌
Result: Physiotherapist imports → gets massage stones placeholder → MISREPRESENTATION
```

---

## ✅ **The Fix**

Applied the same semantic grouping pattern as `salon`:

### **Before (Unsafe):**
```typescript
'wellness': {
  variants: [
    { id: 0, description: '🔒 NEUTRAL: Calm therapy room' },
    { id: 1, description: 'Massage stones' }, // ❌ Misrepresents physio
    { id: 2, description: 'White towel roll' },
    { id: 3, description: 'Plant leaves natural light' },
    { id: 4, description: 'Acupuncture needles case' },
    { id: 5, description: 'Diffuser mist' }, // ❌ Misrepresents chiro
    // ...
  ],
  unclaimedMaxVariantId: 10, // ❌ Allows spa imagery for physio
}
```

**Problem:** Hash-based selection could assign massage stones to a physio clinic.

---

### **After (Safe with Semantic Groups):**
```typescript
'wellness': {
  variants: [
    // ═══════════════════════════════════════════
    // NEUTRAL GROUP (Variants 0-2, auto-assigned)
    // ═══════════════════════════════════════════
    { id: 0, description: '🔒 NEUTRAL: Calm therapy room (safe for all)' },
    { id: 1, description: '🔒 NEUTRAL: White towel roll (safe for all)' },
    { id: 2, description: '🔒 NEUTRAL: Plant leaves natural light (safe for all)' },
    
    // ═══════════════════════════════════════════
    // MASSAGE / SPA GROUP (Variants 3-5, admin-only)
    // ═══════════════════════════════════════════
    { id: 3, description: '💆 MASSAGE: Hot stones and candles' },
    { id: 4, description: '💆 MASSAGE: Essential oils and diffuser' },
    { id: 5, description: '💆 MASSAGE: Massage table with towels' },
    
    // ═══════════════════════════════════════════
    // PHYSICAL THERAPY GROUP (Variants 6-8, admin-only)
    // ═══════════════════════════════════════════
    { id: 6, description: '🦴 PHYSIO: Therapy equipment and tools' },
    { id: 7, description: '🦴 PHYSIO: Treatment table clinical' },
    { id: 8, description: '🦴 PHYSIO: Exercise bands and weights' },
    
    // ═══════════════════════════════════════════
    // ALTERNATIVE THERAPY GROUP (Variants 9-10, admin-only)
    // ═══════════════════════════════════════════
    { id: 9, description: '🌿 ALTERNATIVE: Acupuncture needles case' },
    { id: 10, description: '🌿 ALTERNATIVE: Herbal medicine and herbs' },
  ],
  unclaimedMaxVariantId: 2, // 🔒 CRITICAL: Only 0-2 allowed for unclaimed
}
```

**Result:**
- ✅ All imported businesses get neutral variants (0-2)
- ✅ Admin can manually select massage/physio/alternative variants after verification
- ✅ Physiotherapist never shows massage stones
- ✅ Massage therapist never shows clinical equipment

---

## 📊 **Google Places Types Mapping**

**From `lib/constants/system-categories.ts`:**
```typescript
if (t.has("physiotherapist") || t.has("massage_spa") || t.has("wellness_center") || 
    t.has("acupuncture") || t.has("osteopath") || t.has("chiropractor")) 
  return "wellness";
```

**What this means:**
| Google Type | Maps to | Appropriate Placeholder Group |
|-------------|---------|-------------------------------|
| `massage_spa` | `wellness` | MASSAGE/SPA (stones, oils) |
| `physiotherapist` | `wellness` | PHYSIO (equipment, table) |
| `chiropractor` | `wellness` | PHYSIO (equipment, table) |
| `osteopath` | `wellness` | PHYSIO (equipment, table) |
| `acupuncture` | `wellness` | ALTERNATIVE (needles, herbs) |
| `wellness_center` | `wellness` | NEUTRAL (too broad to assume) |

---

## 🎯 **Key Insights**

### **"Wellness" is NOT synonymous with "Spa"**

```
❌ WRONG: wellness = massage stones + candles + oils
✅ RIGHT: wellness = broad category including spa AND clinical therapy
```

### **Clinical vs. Holistic Distinction Matters**

```
CLINICAL (physio/chiro/osteo):
- Treatment tables (not massage tables)
- Equipment, bands, weights
- Medical/functional vibe
- NO candles, stones, oils

HOLISTIC (massage/spa):
- Massage tables
- Stones, oils, candles
- Relaxation/pampering vibe
- NO clinical equipment

ALTERNATIVE (acupuncture):
- Needles, herbs, traditional tools
- Cultural/traditional medicine vibe
- Different from both clinical and spa
```

### **Neutral Defaults Must Work for ALL**

```
✅ SAFE NEUTRAL:
- Calm empty room
- Clean towels
- Natural elements (plants)
- Soft lighting
- NO specific tools or treatments

❌ NOT NEUTRAL:
- Massage stones (too spa-specific)
- Treatment table (too clinical)
- Acupuncture needles (too specific)
```

---

## 📋 **Updated Implementation Checklist**

### **`salon` Category**
- [x] Semantic grouping implemented
- [x] Removed HAIR variants
- [x] `unclaimedMaxVariantId: 2`
- [x] Groups: NEUTRAL / BEAUTY / NAILS / SPA
- [ ] Generate placeholder images
- [ ] Update admin UI with grouped dropdown (optional)

### **`wellness` Category** ✨ NEW
- [x] Semantic grouping implemented
- [x] Restricted spa imagery to admin-only variants
- [x] `unclaimedMaxVariantId: 2`
- [x] Groups: NEUTRAL / MASSAGE / PHYSIO / ALTERNATIVE
- [ ] Generate placeholder images
- [ ] Update admin UI with grouped dropdown (optional)

### **Other Categories**
- [ ] Monitor user feedback for `retail`, `venue`, `entertainment`
- [ ] Apply semantic grouping only if misrepresentation reported

---

## 🧠 **What This Teaches Us**

### **1. Never Assume Based on Category Name**

```
"wellness" sounds calm/spa-like → assumption = spa imagery works
Reality: includes clinical therapy → assumption = WRONG
```

**Always check:** What Google types actually map to this category?

### **2. Test the Extremes**

```
Think: "What's the most different business that could map here?"
- wellness: massage spa vs. chiropractor (VERY different)
- salon: nail salon vs. spa (moderately different)
- bar: cocktail bar vs. pub (similar enough)
```

If the extremes feel misrepresented by the same imagery → needs semantic grouping.

### **3. "Neutral" Means "Says Nothing Specific"**

```
❌ "Neutral wellness" ≠ "massage-lite"
✅ "Neutral wellness" = "calm professional space, no treatment assumptions"
```

---

## ✅ **Final Status**

**Categories requiring semantic grouping:** 2
1. ✅ `salon` (NEUTRAL / BEAUTY / NAILS / SPA)
2. ✅ `wellness` (NEUTRAL / MASSAGE / PHYSIO / ALTERNATIVE)

**Why only these two:**
- Both have Google types that collapse **clinically distinct** business types
- Wrong imagery = obvious misrepresentation
- Other categories have overlapping "visual vocabulary" that works broadly

---

## 📸 **Next Steps: Image Generation**

When generating `wellness` placeholders:

### **Neutral (0-2):**
- Empty calm room with soft lighting
- Clean white towels (NOT on massage table)
- Plants/natural light
- NO equipment, NO stones, NO needles

### **Massage/Spa (3-5):**
- Hot stones arrangement
- Essential oil bottles/diffuser
- Massage table with towels/candles

### **Physio (6-8):**
- Clinical treatment table
- Therapy equipment (not branded)
- Exercise bands/weights
- Clean/professional vibe

### **Alternative (9-10):**
- Acupuncture needle case (closed)
- Herbal medicine/herbs (dried)
- Traditional therapy elements

---

**Status:** Critical fix applied. `wellness` now safe from misrepresentation. 🎉

**Files modified:**
- `lib/constants/category-placeholders.ts` - Updated wellness variants with semantic grouping
- `SEMANTIC_GROUPING_DECISION_MATRIX.md` - Updated decision matrix
- `WELLNESS_CATEGORY_FIX.md` - This document (NEW)

