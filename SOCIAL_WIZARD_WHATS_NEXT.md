# SOCIAL WIZARD — WHAT'S NEXT
**Date:** 2026-02-04  
**Status:** ✅ Core Features Working

---

## ✅ WHAT WE JUST FIXED (Session Summary)

### 1. **Smart Source Selection** 🎯
- ✅ Offer/Event/Menu dropdowns
- ✅ "Create Offer" CTA when empty
- ✅ No more AI guessing what to promote

### 2. **8-Hashtag System** #️⃣
- ✅ 3 Local + 3 Niche + 2 Trending
- ✅ Strategic hashtag generation

### 3. **Secret Menu Detection** ✨
- ✅ Works like chat system (title/content patterns)
- ✅ No strict metadata requirements
- ✅ Spotlight tier toggle

### 4. **Technical Fixes** 🔧
- ✅ Fixed Fabric.js v6 loading
- ✅ Fixed Zod validation (nullish values)
- ✅ Fixed KB schema (removed entry_type)
- ✅ Cleaned up debug logs

---

## 📊 CURRENT STATE

**What Works:**
- ✅ AI content generation (caption + 8 hashtags)
- ✅ Source selection (offers/events/menu items)
- ✅ Secret menu (Spotlight tier)
- ✅ Draft save/load
- ✅ Copy caption
- ✅ Basic canvas rendering
- ✅ Tier gating (Starter locked, Featured limited, Spotlight full)

**What's Basic:**
- ⚠️ Visual editor (plain text on dark background)
- ⚠️ No text styling controls (font, color, size, shadow)
- ⚠️ No template variety (all look the same)
- ⚠️ No background image uploads
- ⚠️ Canvas feels placeholder-level

---

## 🎯 NEXT PRIORITIES (In Order)

### **Phase 1: Visual Polish** 🎨
**Goal:** Make posts look professional, not placeholder  
**Impact:** HIGH — This is what makes it "worth paying for"

#### 1A. Text Styling Controls (2-3 hours)
Add controls to the Post Editor:
```tsx
<TextStylePanel>
  - Font Style: Bold | Elegant | Modern | Playful
  - Text Size: slider (24px - 72px)
  - Text Color: picker (with presets)
  - Text Shadow: toggle (on/off)
  - Text Alignment: left | center | right
  - Text Stroke: optional outline
</TextStylePanel>
```

**Files to modify:**
- `PostEditorPanel.tsx` — Add style controls UI
- `VisualCanvas.tsx` — Apply styles to Fabric text objects
- `store.ts` — Add text style state

#### 1B. Template Visual Presets (2-3 hours)
Make each template look distinct:
- **Offer Card:** Bold headline + discount badge + CTA box
- **Event Card:** Date badge + time + RSVP callout
- **Menu Spotlight:** Food name focus + price tag + appetite appeal
- **General:** Clean minimal + brand emphasis

**Implementation:**
- Gradient overlays
- Positioned text blocks
- Background tints
- Layout presets

#### 1C. Background Image Upload (1-2 hours)
Allow uploading custom backgrounds:
- Upload button in Post Editor
- Store in Supabase Storage or Cloudinary
- Set as canvas background
- Preview before applying

---

### **Phase 2: Template System Upgrade** 🖼️
**Goal:** Each template looks unique and professional

#### 2A. Visual Template Library
Create 3-5 preset layouts per template type:
- Dark + moody
- Bright + clean
- Gradient + modern
- Textured + premium

#### 2B. Smart Template Matching
Auto-select best template based on:
- Goal (offer/event/menu)
- Tone (premium/bold/friendly)
- Business category (restaurant/cafe/bar)

---

### **Phase 3: AI Background Generator** (Optional, $$$)
**Goal:** Generate abstract backgrounds via AI  
**Cost:** ~$0.04 per image (OpenAI DALL-E)

**Pros:**
- Unique, branded backgrounds
- Mood-based generation
- No stock photo licensing

**Cons:**
- Costs money per generation
- Takes 3-5 seconds
- May not always match vision

**Alternative:** Use Unsplash API (free, high-quality stock photos)

---

### **Phase 4: Content Intelligence** 🧠
**Goal:** Make AI smarter about what to suggest

#### 4A. Post Ideas Panel
Replace generic "Generate" with smart suggestions:
```tsx
<PostIdeas>
  - "15% Off Cocktails ends in 3 days" [Generate]
  - "Weekend BBQ Special" [Generate]
  - "New Menu Item: Loaded Fries" [Generate]
  - "Share your latest 5★ review" [Generate]
</PostIdeas>
```

#### 4B. Caption Refinement
Add "Improve" buttons:
- Make shorter
- Add urgency
- More premium tone
- Add local hook

---

### **Phase 5: Campaign Packs Enhancement** 📦
**Goal:** Make Spotlight tier feel premium

#### 5A. Campaign Templates
Pre-built 5-post series:
- Offer Countdown (5 days before → day of)
- Event Hype (1 week before → day after)
- Menu Launch (teaser → reveal → reviews)
- Seasonal Series (Christmas, Summer, etc.)

#### 5B. Posting Schedule Suggestions
"Based on your audience, post at:"
- Monday 6pm
- Wednesday 12pm
- Friday 8pm

---

## 🚫 WHAT TO SKIP (For Now)

### ❌ Don't Build Yet:
1. **Publishing to Social Media**
   - OAuth flows (Meta, Google)
   - Token management
   - Scheduler/cron jobs
   - → This is v2, not v1

2. **Calendar View**
   - Drag/drop scheduling
   - Multi-post planning
   - → Not needed for "Creation + Export" mode

3. **Analytics**
   - Post performance tracking
   - Engagement metrics
   - → Can't track without publishing

4. **Multi-Image Posts**
   - IG carousels
   - Before/after comparisons
   - → Single image is enough for v1

---

## 🎯 RECOMMENDED NEXT STEP

**Start with 1A: Text Styling Controls**

Why this first:
- ✅ High impact (makes posts look professional immediately)
- ✅ Quick win (2-3 hours)
- ✅ Users will notice the difference
- ✅ Builds momentum for visual polish

**After text controls work:**
→ Move to templates (1B)  
→ Then backgrounds (1C)  
→ Then reassess based on feedback

---

## 📝 HOW TO APPROACH NEXT FEATURES

### For Text Styling (1A):
1. Add state to Zustand store:
   ```ts
   textStyle: {
     fontWeight: 'bold' | 'normal',
     fontSize: 48,
     color: '#FFFFFF',
     hasShadow: true,
     align: 'center'
   }
   ```

2. Add UI controls in `PostEditorPanel.tsx`:
   - Font weight button group
   - Size slider
   - Color picker (with presets)
   - Shadow toggle

3. Update `VisualCanvas.tsx` to apply styles:
   ```ts
   text.set({
     fontWeight: textStyle.fontWeight,
     fontSize: textStyle.fontSize,
     fill: textStyle.color,
     shadow: textStyle.hasShadow ? new fabric.Shadow({...}) : null
   })
   ```

### For Template Visuals (1B):
1. Define preset configurations:
   ```ts
   const TEMPLATE_PRESETS = {
     offer_card: {
       background: 'linear-gradient(...)',
       textLayout: 'center-bold',
       badge: { position: 'top-right', style: 'discount' }
     }
   }
   ```

2. Apply preset when template changes
3. Add visual preview in template selector

---

## 💡 SUCCESS METRICS

**How to know it's ready:**
1. ✅ Generated posts look professional (not placeholder)
2. ✅ Users can customize text appearance easily
3. ✅ Templates are visually distinct
4. ✅ Backgrounds add polish (not distraction)
5. ✅ Total time: generate → customize → export < 2 minutes

**The bar:** Compare to Canva's social post templates (that's the competition)

---

## 🎉 WHAT YOU'VE ACCOMPLISHED TODAY

**Before:**
- Generic AI generator
- No source selection
- Weak hashtags
- Hidden secret menu feature
- Broken validation
- Fabric.js not loading

**After:**
- Context-aware content engine
- Smart dropdowns
- Strategic 8-hashtag system
- Visible Spotlight features
- Clean, working codebase
- Production-ready foundation

**This is massive progress.** The foundation is solid. Now it's about making it beautiful. 🚀

---

**Pick a feature from Phase 1 and let me know what you want to tackle next!**
