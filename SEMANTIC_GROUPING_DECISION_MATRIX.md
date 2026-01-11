# Semantic Grouping Decision Matrix

**Date:** January 11, 2026  
**Question:** "Do we need semantic grouping for ALL categories?"  
**Answer:** NO. Only where Google types collapse multiple distinct experiences into one category.

---

## 🎯 **The Rule**

Apply semantic grouping ONLY when:
1. ✅ Multiple **distinct business types** map to the same `system_category`
2. ✅ A default placeholder would **misrepresent** some of those types
3. ✅ Users would notice/care about the difference

---

## 📊 **Category-by-Category Analysis**

| Category | Subtypes | Needs Semantic Grouping? | Reason |
|----------|----------|--------------------------|--------|
| **`salon`** | Nail salons, spas, beauty salons, waxing, aesthetics | ✅ **YES** | Nail polish doesn't represent a spa. Massage stones don't represent a nail salon. |
| `barber` | Hair salons, barbershops | ❌ No | All hair-focused. One visual style works for all. |
| `restaurant` | Fine dining, casual, ethnic cuisines | ❌ No | Food-safety rules already prevent misrepresentation (no identifiable food). |
| `cafe` | Coffee shops, brunch cafes, bakery-cafes | ❌ No | Coffee/pastry imagery works for all. |
| `bar` | Cocktail bars, wine bars, pubs | ❌ No | Bar/drink imagery works for all. |
| `pub` | Traditional pubs, gastropubs | ❌ No | Pub imagery is consistent. |
| `takeaway` | Pizza delivery, Chinese takeout, kebab shops | ❌ No | Generic food boxes/packaging works for all. |
| `fast_food` | Burgers, fried chicken, sandwiches | ❌ No | Food-safety rules apply (no identifiable items). |
| `dessert` | Ice cream, cakes, pastries | ❌ No | Abstract dessert imagery works for all. |
| `bakery` | Bread bakeries, patisseries | ❌ No | Baked goods imagery is consistent. |
| `tattoo` | Tattoo studios, piercing studios | ❌ No | Ink/needle imagery works for both. |
| **`wellness`** | Massage, physio, acupuncture, chiropractor, osteopath | ✅ **YES** | Massage stones misrepresent physiotherapy. Treatment table misrepresents massage therapy. **CRITICAL FIX APPLIED** |
| **`retail`** | Clothing, gifts, jewelry, home goods, bookshops | 🤔 **MAYBE** | Clothing shop vs bookshop feels distinct, but "shopping" imagery might work for all. **Wait for feedback.** |
| `fitness` | Gyms, yoga studios, CrossFit | ❌ No | Fitness equipment/space imagery works for all. |
| `sports` | Sports facilities, outdoor activities | ❌ No | Sports/activity imagery is consistent. |
| `hotel` | Hotels, B&Bs, hostels | ❌ No | Accommodation imagery is consistent. |
| **`venue`** | Wedding venues, concert halls, theaters, sports arenas | 🤔 **MAYBE** | Wedding venue vs concert hall feels distinct, but "empty venue/lighting" might work for all. **Wait for feedback.** |
| **`entertainment`** | Arcades, cinemas, bowling, escape rooms | 🤔 **MAYBE** | Cinema vs arcade feels distinct, but "entertainment/neon" imagery might work for all. **Wait for feedback.** |
| `professional` | Lawyers, accountants, consultants | ❌ No | Office/professional imagery is consistent. |
| `other` | Fallback for uncategorized | ❌ No | Already a catch-all. |

---

## ✅ **Final Decision: `salon` and `wellness` Need It Right Now**

**Rationale:**
- **`salon`** has a clear split (nails ≠ spa ≠ beauty) where users would notice misrepresentation
- **`wellness`** has a clear split (massage ≠ physio ≠ acupuncture) where users would notice misrepresentation
- **`retail`**, **`venue`**, **`entertainment`** *might* need it, but:
  - We can use generic imagery (shopping bag, empty stage, neon lights)
  - Wait for user complaints before adding complexity

---

## 🚨 **Critical Fixes Applied**

### **1. Removed HAIR Variants from `salon`**

**Problem identified by GPT:**
```
Your mapping: hair_salon → "barber" category ✅
Your placeholders: salon includes HAIR variants ❌
Contradiction!
```

**Fixed:**
```
salon variants now include:
- NEUTRAL (towels, fabric, cream)
- BEAUTY (makeup, mirrors, products)
- NAILS (polish, tools, station)
- SPA (stones, candles, oils)

❌ NO HAIR variants (hair imagery belongs in "barber" category only)
```

---

## 📋 **Implementation Checklist**

### **`salon` Category (DONE)**
- [x] Semantic grouping implemented
- [x] Removed HAIR variants (hair salons use `barber` category)
- [x] `unclaimedMaxVariantId: 2` (neutral only)
- [x] Variants grouped: NEUTRAL / BEAUTY / NAILS / SPA
- [ ] Generate actual placeholder images
- [ ] Update admin UI with grouped dropdown (optional)

### **`retail` Category (WAIT)**
- [ ] Monitor user feedback
- [ ] If users complain about clothing vs gifts imagery → add semantic grouping
- [ ] Otherwise, keep simple

### **`venue` Category (WAIT)**
- [ ] Monitor user feedback
- [ ] If users complain about wedding vs concert imagery → add semantic grouping
- [ ] Otherwise, keep simple

### **`entertainment` Category (WAIT)**
- [ ] Monitor user feedback
- [ ] If users complain about cinema vs arcade imagery → add semantic grouping
- [ ] Otherwise, keep simple

---

## 🎨 **What "Neutral Default" Means Per Category**

| Category | Neutral Default Vibe | Examples |
|----------|---------------------|----------|
| `salon` | Premium self-care (abstract) | White towels, soft fabric, cream texture |
| `retail` | Shopping (abstract) | Shopping bag, wrapped package, boutique shelves |
| `venue` | Empty space + lighting | Stage lights, empty hall, curtains |
| `entertainment` | Fun + neon (abstract) | Neon glow, bokeh lights, tickets |
| `restaurant` | Dining atmosphere (NO food) | Table setting, cutlery, ambient lighting |
| `cafe` | Coffee/cozy atmosphere | Coffee cup, espresso machine, cafe interior |
| `bar` | Drinks atmosphere (abstract) | Backlit bottles, glassware, bar counter |

**Key principle:** Neutral = represents the **category vibe** without declaring the **specific subtype**

---

## 💡 **GPT's Improved Structure (For Future Implementation)**

Instead of just comments, structure variants with explicit groups:

```typescript
'salon': {
  defaultVariantId: 0,
  unclaimedAllowedVariantIds: [0, 1, 2],
  
  groups: {
    neutral: {
      label: "🔒 Neutral (Safe for All)",
      variants: [0, 1, 2],
    },
    beauty: {
      label: "✨ Beauty / Aesthetics (Admin Only)",
      variants: [3, 4, 5],
    },
    nails: {
      label: "💅 Nails (Admin Only)",
      variants: [6, 7, 8],
    },
    spa: {
      label: "🧘 Spa / Wellness (Admin Only)",
      variants: [9, 10],
    },
  },
  
  variants: [
    { id: 0, filename: "...", description: "..." },
    // ...
  ],
}
```

**Benefits:**
- Admin UI can render groups automatically
- Can reorder variants without breaking group logic
- Import logic can safely pick from `unclaimedAllowedVariantIds`

**Status:** Documented for future, not yet implemented (current structure with comments is fine for now)

---

## ✅ **Final Answer**

**Question:** "Do we need semantic grouping for ALL categories?"

**Answer:** **NO. Only `salon` needs it right now.**

**Why:**
- `salon` has the clearest split (nails ≠ spa ≠ beauty)
- Other categories can use generic "vibe" imagery
- Wait for user feedback before over-engineering

**Action:** Generate placeholder images for `salon` with the corrected structure (NO HAIR variants)

---

**Status:** Decision matrix complete. Only `salon` requires semantic grouping currently.

