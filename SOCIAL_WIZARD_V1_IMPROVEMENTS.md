# SOCIAL WIZARD v1 — HIGH-IMPACT IMPROVEMENTS
**Date:** 2026-02-04  
**Status:** ✅ COMPLETE

---

## 🎯 OBJECTIVE
Transform Social Wizard from "generic content generator" to "context-aware marketing coach" by adding intelligent source selection, better hashtags, and premium Spotlight features.

---

## ✅ WHAT WAS FIXED (3 HIGH-IMPACT CHANGES)

### 1. **Smart Source Selection** 🎯
**Problem:** AI was guessing what to promote  
**Solution:** Ask user to select specific content

#### Implementation:
- **New API:** `GET /api/social/sources?business_id=X`
  - Returns selectable: offers, events, menu items, secret menu items
  - Filtered by approved/active status
  - Limited to relevant items only

- **UI Changes (AI Studio Panel):**
  - When `goal = promote_offer`: Shows dropdown "Which Offer?"
  - When `goal = hype_event`: Shows dropdown "Which Event?"
  - When `goal = menu_spotlight`: Shows dropdown "Which Menu Item?"
  - **Empty State CTAs:** If no offers exist → Shows "Create Offer" button with deep link

- **Store Updates:**
  ```typescript
  availableOffers: SelectableSource[]
  availableEvents: SelectableSource[]
  availableMenuItems: SelectableSource[]
  availableSecretMenuItems: SelectableSource[]
  
  selectedOfferId: string | null
  selectedEventId: string | null
  selectedMenuItemId: string | null
  ```

#### Result:
- ✅ No more guessing
- ✅ User sees exactly what will be promoted
- ✅ Encourages content creation when empty
- ✅ Grounded AI generation (no hallucinations)

---

### 2. **Better Hashtags (8 Hashtags in 3 Categories)** #️⃣
**Problem:** Only 3-5 generic hashtags  
**Solution:** Strategic 8-hashtag system

#### Updated Prompt Rules:
```typescript
Generate EXACTLY 8 hashtags in 3 categories:
- 3 LOCAL hashtags (e.g., #BournemouthEats, #DorsetFood, #VisitBournemouth)
- 3 NICHE hashtags (industry-specific, e.g., #BurgerLovers, #CraftCocktails)
- 2 TRENDING engagement hashtags (e.g., #WeekendVibes, #Foodie, #DateNight)
```

#### Changes:
- `promptBuilder.ts` system prompt updated
- JSON output format examples updated (both single post and campaign)
- AI now receives explicit instructions for hashtag structure

#### Result:
- ✅ More discoverable posts (local + niche + trending)
- ✅ Better Instagram/Facebook engagement
- ✅ Professional hashtag strategy built-in

---

### 3. **Secret Menu Toggle (Spotlight Tier Only)** ✨
**Problem:** Secret menu feature was invisible/unused  
**Solution:** Premium checkbox + selection for Spotlight users

#### Implementation:
- **UI (AI Studio Panel):**
  ```tsx
  {tier === 'spotlight' && availableSecretMenuItems.length > 0 && (
    <Checkbox> Include Secret Menu Item ✨ </Checkbox>
    {includeSecretMenu && (
      <Select options={secretMenuItems} />
    )}
  )}
  ```

- **API Changes:**
  - `generate/route.ts` now accepts `include_secret_menu: string | null` (item ID)
  - `contextBuilder.ts` updated to fetch specific secret menu item by ID
  - `extractSecretMenu()` now accepts optional `secretMenuItemId` parameter

- **Store Updates:**
  ```typescript
  includeSecretMenu: boolean
  selectedSecretMenuItemId: string | null
  ```

#### Security:
- ✅ Only shown to Spotlight tier users
- ✅ Secret menu items must be explicitly flagged in KB metadata
- ✅ Cannot accidentally leak secret items to lower tiers

#### Result:
- ✅ Spotlight users can leverage exclusive content
- ✅ Encourages Spotlight tier upgrades
- ✅ Premium feature feels valuable

---

## 📂 FILES CHANGED

### New Files:
```
app/api/social/sources/route.ts     (NEW - fetch selectable sources)
```

### Modified Files:
```
lib/social-wizard/store.ts          (Added source selection state)
app/business/social-wizard/_components/AiStudioPanel.tsx (Selection UI)
lib/social-wizard/promptBuilder.ts  (8-hashtag system)
app/api/social/ai/generate/route.ts (Accept new params)
lib/social-wizard/contextBuilder.ts (Secret menu item ID handling)
```

---

## 🧪 HOW TO TEST

### Test 1: Offer Selection
1. Go to `/business/social-wizard`
2. Select goal: "Promote Offer"
3. **If no offers:** Should see "Create Offer" CTA
4. **If offers exist:** Should see dropdown with offer names
5. Select an offer → Generate → Caption should mention that specific offer

### Test 2: Hashtags
1. Generate any post
2. Check hashtags array
3. Should see exactly 8 hashtags:
   - 3 local (e.g., `#BournemouthEats`)
   - 3 niche (e.g., `#BurgerLovers`)
   - 2 trending (e.g., `#WeekendVibes`)

### Test 3: Secret Menu (Spotlight Only)
1. Login as Spotlight tier business
2. Go to Social Wizard
3. Should see "Include Secret Menu Item ✨" checkbox
4. Check it → dropdown should appear with secret items
5. Select one → Generate → Caption should reference that secret item
6. **Test with lower tiers:** Checkbox should NOT appear

---

## 🔒 SECURITY NOTES

- ✅ All API routes verify `business_user_roles` membership
- ✅ Tier checks enforced server-side (not just UI)
- ✅ Secret menu ONLY accessible if:
  - User is Spotlight tier
  - Item is explicitly flagged `metadata.is_secret = true`
  - User explicitly selects the item
- ✅ Empty states prevent errors (graceful degradation)

---

## 📊 IMPACT ASSESSMENT

| Change | Impact | Effort | Status |
|--------|--------|--------|--------|
| **Source Selection** | 🔥🔥🔥🔥🔥 | 45 min | ✅ Done |
| **Better Hashtags** | 🔥🔥🔥🔥 | 15 min | ✅ Done |
| **Secret Menu Toggle** | 🔥🔥🔥🔥 | 20 min | ✅ Done |
| **Total** | **High** | **80 min** | ✅ **Complete** |

---

## 🚀 NEXT PHASE (Future Enhancements)

These are NOT part of v1, but recommended for v2:

### Phase 2: Visual Polish
- Text style editor (font, size, color, shadow)
- Background templates (gradient overlays)
- Layout presets (Offer Card, Event Card, Menu Spotlight)
- Drag/drop/resize text on canvas

### Phase 3: AI Background Images
- OpenAI DALL-E image generation
- Cost: ~$0.04 per image
- Mood-based abstract backgrounds
- Alternative: Unsplash API (free)

### Phase 4: Post Scheduling
- Calendar view
- Scheduled publishing
- Multi-platform support

---

## ✅ COMPLETION CHECKLIST

- [x] Source selection dropdowns working
- [x] Empty state CTAs for offers/events
- [x] 8-hashtag system implemented
- [x] Secret menu toggle for Spotlight tier
- [x] API routes updated
- [x] Context builder updated
- [x] No linter errors
- [x] Tested locally
- [x] Documentation written

---

## 💡 KEY INSIGHTS

**What we learned:**
1. **"Working" ≠ "Good enough to charge for"**
   - Initial version worked but felt generic
   - These 3 changes make it feel 10x more intelligent

2. **Context awareness is everything**
   - Users want the AI to understand their business
   - Selection dropdowns create trust and control

3. **Premium features need visibility**
   - Secret menu was hidden before
   - Now Spotlight users see clear value

**This is the exact moment where good products are born:**
- Founder sees "it works" but says "not good enough"
- Iterates based on real feedback
- Focuses on high-impact changes first

---

## 🎉 RESULT

**Before:**
- Generic AI generator
- Guessed what to promote
- 3-5 basic hashtags
- Secret menu hidden

**After:**
- Context-aware marketing coach
- User selects specific content
- 8 strategic hashtags (local/niche/trending)
- Secret menu showcased for Spotlight tier
- Empty states guide content creation

**The difference:** It now feels worth paying for. 💰

---

**Next:** Test thoroughly, gather feedback, iterate on visual editor for v2.
