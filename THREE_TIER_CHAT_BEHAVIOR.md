# Three-Tier Chat System: Exact User Experience

**Status:** Implementation Ready  
**Date:** 2026-01-27  
**Branch:** `ai-eligible-toggle`

---

## 🎯 Overview

The AI chat now operates on a **three-tier hierarchy** that protects monetization while preventing empty search results:

| Tier | Business Type | Display Format | Monetization Goal |
|------|--------------|----------------|-------------------|
| **1️⃣ Paid/Trial** | Paying businesses (Spotlight/Featured/Starter) + Active trials | ✨ Carousel cards (swipeable) | Premium AI visibility |
| **2️⃣ Lite** | Claimed-free businesses with ≥1 featured item or offer | 📝 Text-only mentions | Upsell to paid plans |
| **3️⃣ Fallback** | Admin-approved imported businesses (unclaimed) | 📝 Text-only mentions with disclaimer | Prevent "no results" |

---

## 🔥 Tier 1: Paid/Trial Businesses (Carousel Cards)

### Trigger Conditions:
- User asks: *"Best pizza near me"*, *"Cocktails in Bournemouth"*, *"Vegan brunch spots"*
- System finds ≥1 business in `business_profiles_chat_eligible` view

### Display Format:
**Carousel Cards** (swipeable, interactive, rich data)

### AI Response Example:

```
🍕 I found 3 great pizza spots near you:

[Carousel Card 1: Primo Wood Fired Pizza]
- Photo: Hero image
- Rating: ⭐ 4.8 (124 reviews) - Highly rated
- Distance: 0.3 miles away
- Status: Open until 11pm
- Offers: "2-for-1 pizzas after 9pm"
- Secret Menu: ✅ Available
- CTA: "View Menu" | "Get Directions"

[Carousel Card 2: Luigi's Italian Kitchen]
- Rating: ⭐ 4.6 (89 reviews)
...

[Carousel Card 3: Napoli Express]
- Rating: ⭐ 4.7 (156 reviews) - Very popular
...

💡 Swipe to see all options. Tap a card to view their full menu, offers, and secret items.

---
_Ratings and reviews data provided by Google_
```

### Data Included:
✅ Full menu via AI inference  
✅ Secret menu items  
✅ Live offers with expiry dates  
✅ Real-time hours & status  
✅ Photos, ratings, contact info  
✅ Distance & walking time  
✅ Direct booking/navigation links  

### Google Attribution:
**CRITICAL:** If displaying ANY Google-derived data (rating, review count, hours), MUST include attribution footer:
```
_Ratings and reviews data provided by Google_
```

This applies even for paid businesses if the rating/review count is from Google Places.

---

## 🍃 Tier 2: Claimed-Free Lite Businesses (Text Mentions)

### Trigger Conditions:
- User asks: *"Any good coffee shops nearby?"*
- **Tier 1 returns 0 results** (no paying businesses match)
- BUT ≥1 business in `business_profiles_lite_eligible` exists

### Display Format:
**Text-only mentions** (no carousel, no cards)

### AI Response Example:

```
☕ I don't have their full menus yet, but here are some highly-rated coffee shops with featured items:

📍 **live on cafe & bakery**
   • Category: Coffee Shop
   • Location: 0.4 miles away • Open now
   • ⭐ 4.7 (92 reviews) - Highly rated
   • Featured items: Artisan sourdough, specialty lattes, house-made pastries
   • Contact: 01202 123456 | [View on map]
   
📍 **The Grind Coffee House**
   • Category: Coffee & Brunch
   • Location: 0.8 miles away • Open until 5pm
   • ⭐ 4.5 (67 reviews) - Well-reviewed
   • Offer: 10% off all drinks before 10am (expires Feb 15)
   • Featured items: Single-origin espresso, vegan breakfast wrap
   • Contact: 01202 789012 | [View on map]

💡 **Want deeper recommendations?** Businesses on our Featured tier get full AI menu analysis, secret menu access, and priority visibility. [Tell them to upgrade →]

📞 You can call ahead to confirm additional menu items beyond what's shown here.

---
_Ratings and reviews data provided by Google_
```

### Data Included:
✅ Featured items (max 5) from `menu_preview`  
✅ Approved offers (with expiry info)  
✅ Location, hours, contact info  
✅ Distance & status  
❌ No full menu AI inference  
❌ No secret menu  
❌ No carousel cards  

### Upsell Message:
Every Tier 2 response includes a gentle upsell:
> "Want deeper recommendations? Businesses on our Featured tier get full AI menu analysis, secret menu access, and priority visibility."

### Google Attribution:
**CRITICAL:** If displaying Google-derived rating/review count, MUST include attribution footer:
```
_Ratings and reviews data provided by Google_
```

Claimed status doesn't matter - source of data matters.

---

## 🆘 Tier 3: Fallback Directory (Admin-Approved Imports)

### Trigger Conditions:
- User asks: *"Mediterranean food near me"*
- **Tier 1 returns 0 results** (no paying businesses)
- **Tier 2 returns 0 results** (no claimed-free businesses with features)
- BUT ≥1 business in `business_profiles_ai_fallback_pool` exists

### Display Format:
**Text-only mentions with clear disclaimer** (no carousel, limited data)

### AI Response Example:

```
🍽️ I don't have confirmed menu information yet, but these Mediterranean restaurants may match what you're looking for:

⚠️ **Limited Info Available:** These businesses haven't claimed their Qwikker listing yet, so I can't provide detailed menu recommendations.

📍 **Hinar Kitchen**
   • Category: Mediterranean Restaurant
   • Location: 1.2 miles away
   • Google Rating: ⭐ 4.6 (89 reviews)
   • Phone: 01202 555123
   • [Visit their website] | [View on Google Maps]
   
📍 **L'ANGOLO**
   • Category: Italian Restaurant
   • Location: 0.6 miles away
   • Google Rating: ⭐ 4.8 (156 reviews)
   • Phone: 01202 555789
   • [Visit their website] | [View on Google Maps]

📞 **I recommend calling ahead** to confirm they serve what you need and to check current availability.

---
⚡ **Want full AI menu search?** Check out our Featured businesses who have complete profiles:
[Search Featured tier →]

---
_Ratings and reviews data provided by Google_
```

### Data Included:
✅ Basic contact info (phone, website, address)  
✅ Google ratings & review count ONLY (no review text)  
✅ Location & distance  
✅ Hours (if Google-sourced, requires attribution)  
❌ No menu data whatsoever  
❌ No review text or snippets  
❌ No offers  
❌ No secret menu  
❌ No carousel cards  
❌ No AI recommendations about food/drinks  

### Required Disclaimers:

**1. Top-Level Warning:**
> "⚠️ **Limited Info Available:** These businesses haven't claimed their Qwikker listing yet, so I can't provide detailed menu recommendations."

**2. Call-Ahead Recommendation:**
> "📞 **I recommend calling ahead** to confirm they serve what you need and to check current availability."

**3. Google Attribution (Footer):**
> "_Ratings and reviews data provided by Google_"

### Upsell Message:
Every Tier 3 response includes a prominent upsell:
> "⚡ **Want full AI menu search?** Check out our Featured businesses who have complete profiles: [Search Featured tier →]"

### Google Attribution Rules:
**CRITICAL:** Always include Google attribution when displaying ANY of:
- Ratings (e.g., "⭐ 4.6")
- Review counts (e.g., "(89 reviews)")
- Opening hours from Google Places
- Any Google Places-derived data

**Footer Format:**
```
_Ratings and reviews data provided by Google_
```

**DO NOT display:**
- Review text snippets (too risky legally)
- AI-generated review summaries from single reviews
- Any content that could be interpreted as recreating user content

**SAFE (Optional):**
- Theme/highlight tags from multiple reviews: "People mention: atmosphere, value, service"
- Generic aggregations: "Customers praise the cocktails and ambiance"

---

## 🔒 Strict Response Contract (Prevents Carousel Leaks)

### API Response Shape:
```typescript
interface ChatResponse {
  // CRITICAL: Explicit tier indicator
  tierUsed: 1 | 2 | 3 | 0  // 0 = no results
  
  // ONLY populated when tierUsed === 1
  businessCarousel: Business[]  // Rich card data
  
  // ONLY populated when tierUsed === 2 or 3
  textMentions: Business[]  // Limited data for text display
  
  // AI-generated response text
  aiResponse: string
  
  // Rendering flags (explicit, not inferred)
  showGoogleAttribution: boolean
  showTier3Disclaimer: boolean
  showUpsell: boolean
  
  // Metadata
  query: string
  location: string
}
```

### UI Rendering Logic:
```typescript
// NEVER render carousel based on "array is not empty"
// ALWAYS check tierUsed explicitly

if (response.tierUsed === 1) {
  return <CarouselCards businesses={response.businessCarousel} />
}

if (response.tierUsed === 2 || response.tierUsed === 3) {
  return (
    <>
      <TextMentions businesses={response.textMentions} />
      {response.showUpsell && <UpsellBanner />}
      {response.showTier3Disclaimer && <DisclaimerBox />}
      {response.showGoogleAttribution && <GoogleAttributionFooter />}
    </>
  )
}

if (response.tierUsed === 0) {
  return <EmptyState />
}
```

### Why This Matters:
- **Prevents accidental carousel leaks:** UI can't render Tier 2/3 as cards even if data structure allows it
- **Explicit flags prevent bugs:** No "if rating exists show attribution" logic that could fail
- **Type safety:** TypeScript enforces the contract
- **Audit trail:** Logs show exactly which tier was used for each query

---

## 🎯 Tier Selection Logic (Query Waterfall)

### Step 1: Try Tier 1 (Paid/Trial)
```typescript
const paidResults = await supabase
  .from('business_profiles_chat_eligible')
  .select('*')
  .eq('city', userCity)
  .textSearch('fts', searchQuery)
  .limit(10)
```

✅ **If results > 0:** Return carousel cards + AI response  
❌ **If results = 0:** Continue to Step 2

---

### Step 2: Try Tier 2 (Lite)
```typescript
const liteResults = await supabase
  .from('business_profiles_lite_eligible')
  .select('*')
  .eq('city', userCity)
  .textSearch('fts', searchQuery)
  .limit(5)
```

✅ **If results > 0:** Return text mentions + upsell  
❌ **If results = 0:** Continue to Step 3

---

### Step 3: Try Tier 3 (Fallback)
```typescript
const fallbackResults = await supabase
  .from('business_profiles_ai_fallback_pool')
  .select('*')
  .eq('city', userCity)
  .textSearch('fts', searchQuery)
  .limit(5)
```

✅ **If results > 0:** Return text mentions + disclaimers + Google attribution  
❌ **If results = 0:** Continue to Step 4

---

### Step 4: No Results (Empty State)
```
😔 I couldn't find any businesses matching your request in [City].

💡 **Try:**
- Broadening your search (e.g., "restaurants" instead of "vegan restaurants")
- Searching nearby towns
- Checking our full directory: [Browse all businesses →]

📢 **Know a business that should be here?** We're always adding new listings. [Suggest a business →]
```

---

## 📅 Hours Source Tracking (Google Attribution Rules)

### The Rule:
Google attribution is required based on **data source**, not business tier or claim status.

### Implementation:
Add a field to track hours source:
```typescript
interface Business {
  hours_source: 'qwikker' | 'google'
  // ... other fields
}
```

### Attribution Logic:
```typescript
const needsGoogleAttribution = 
  business.hours_source === 'google' ||
  business.rating_source === 'google' ||
  business.review_count_source === 'google'

if (needsGoogleAttribution) {
  showGoogleAttributionFooter = true
}
```

### Examples:

**Scenario 1: Imported business (unclaimed)**
- Hours: Google Places ✅
- Rating: Google Places ✅
- Review count: Google Places ✅
- **Attribution:** Required

**Scenario 2: Claimed-free business (edited hours)**
- Hours: Owner-entered via dashboard ❌
- Rating: Google Places ✅
- Review count: Google Places ✅
- **Attribution:** Required (because of rating/reviews)

**Scenario 3: Paid business (fully custom)**
- Hours: Owner-entered ❌
- Rating: Qwikker reviews ❌
- Review count: Qwikker reviews ❌
- **Attribution:** Not required

**Scenario 4: Paid business (hybrid)**
- Hours: Owner-entered ❌
- Rating: Google Places ✅
- Review count: Google Places ✅
- **Attribution:** Required (because of rating/reviews)

### Safe Pattern:
Show attribution footer for **entire response** if ANY Google-sourced field is displayed for ANY business in that response.

```typescript
// In chat response builder
let responseNeedsGoogleAttribution = false

for (const business of allBusinessesInResponse) {
  if (business.rating_source === 'google' || 
      business.review_count_source === 'google' ||
      business.hours_source === 'google') {
    responseNeedsGoogleAttribution = true
    break
  }
}

return {
  // ...
  showGoogleAttribution: responseNeedsGoogleAttribution
}
```

---

## 🚫 What AI Will NEVER Do for Tier 2 & 3

### ❌ No Menu Speculation:
**Bad:** "They probably serve gluten-free pasta"  
**Good:** "Contact them to confirm dietary options"

### ❌ No Invented Details:
**Bad:** "Known for their truffle fries"  
**Good:** "Check their menu online or call for specialties"

### ❌ No Review Text Snippets:
**Bad:** "One customer said 'best pizza in town!'"  
**Good:** "⭐ 4.8 (124 reviews)" + Google attribution footer

**Optional Safe Alternative:**  
"People mention: great atmosphere, creative cocktails, high prices" (theme tags from multiple reviews)

### ❌ No Single-Review Summaries:
**Bad:** "A reviewer loved the friendly service but found prices steep"  
**Good:** Show rating + review count only

### ❌ No Fake Urgency:
**Bad:** "Popular spot, book now!"  
**Good:** "Call ahead for availability"

### ❌ No Hidden Tier Mixing:
- Tier 2/3 businesses NEVER appear in carousels
- Carousels are exclusively Tier 1 (paid)
- Visual distinction is the monetization strategy

---

## 📊 Response Limits

| Tier | Max Results | Format | Carousel? |
|------|------------|--------|-----------|
| Tier 1 | 10 businesses | Rich cards | ✅ Yes |
| Tier 2 | 5 businesses | Text bullets | ❌ No |
| Tier 3 | 5 businesses | Text bullets + disclaimers | ❌ No |

---

## 🎨 Visual Hierarchy (User Perspective)

### What Users See:

**Tier 1 Response:**
```
┌─────────────────────────────────────┐
│  🎠 [Swipeable Carousel Cards]      │
│  ┌───────┐ ┌───────┐ ┌───────┐    │
│  │ Card 1│ │ Card 2│ │ Card 3│    │
│  │ Photo │ │ Photo │ │ Photo │    │
│  │ Menu  │ │ Menu  │ │ Menu  │    │
│  └───────┘ └───────┘ └───────┘    │
└─────────────────────────────────────┘
   ✨ Premium AI experience
```

**Tier 2 Response:**
```
┌─────────────────────────────────────┐
│  📝 Text-only mentions              │
│                                      │
│  📍 Business Name                   │
│     • Featured items listed         │
│     • Contact info                  │
│                                      │
│  📍 Business Name                   │
│     • Offer: 10% off drinks         │
│     • Contact info                  │
│                                      │
│  💡 Upsell: Upgrade for full AI     │
└─────────────────────────────────────┘
   🍃 Basic AI experience
```

**Tier 3 Response:**
```
┌─────────────────────────────────────┐
│  ⚠️ LIMITED INFO AVAILABLE          │
│                                      │
│  📍 Business Name                   │
│     • ⭐ Google rating              │
│     • Phone only                    │
│                                      │
│  📞 Call ahead to confirm           │
│  💡 Upsell: Search Featured tier    │
│                                      │
│  _Google attribution footer_        │
└─────────────────────────────────────┘
   🆘 Safety net experience
```

---

## 🔒 Business Lifecycle & Tier Movement

### Imported → Claims → Tier 1
```
1. Business imported (auto_imported = true, status = unclaimed)
   → Lives in Tier 3 pool (if admin approves)
   
2. Owner claims listing
   → status changes to 'claimed_free'
   → Automatically REMOVED from Tier 3
   → Starts 90-day Featured trial
   → MOVES TO TIER 1 immediately
   
3. Trial expires
   → If they don't pay: drops to Tier 2 (if has featured items)
   → If they pay: stays in Tier 1
```

### Claimed-Free → Featured Items → Tier 2
```
1. Claimed-free business adds ≥1 featured item
   → Enters Tier 2 pool automatically
   → Gets text mentions (no carousel)
   
2. Business upgrades to Starter/Featured/Spotlight
   → MOVES TO TIER 1 immediately
   → Gets carousel cards
```

---

## 🎯 Success Metrics

### What This Achieves:

✅ **Never shows empty results** (Tier 3 safety net)  
✅ **Protects paid visibility** (carousels = paid only)  
✅ **Clear upgrade path** (text → carousel = paid)  
✅ **Legal compliance** (Google attribution on reviews)  
✅ **Honest AI** (no menu speculation for Tier 2/3)  
✅ **Upsell on every free interaction** (monetization prompts)

---

## 📝 Implementation Checklist

### Phase 1: Chat Logic
- [ ] Modify `lib/ai/hybrid-chat.ts` to query three views
- [ ] Implement waterfall logic (Tier 1 → 2 → 3)
- [ ] Remove carousel generation for Tier 2 & 3
- [ ] Add disclaimers for Tier 3 responses
- [ ] Add upsell messaging for Tier 2 & 3
- [ ] Include Google attribution for Tier 3

### Phase 2: UI/UX
- [ ] Ensure carousel only renders for `paidCarousel` array
- [ ] Style text-only responses distinctly
- [ ] Add warning icons for Tier 3
- [ ] Make upsell CTAs prominent
- [ ] Add "Browse Featured" links

### Phase 3: Admin Controls
- [ ] Add toggle for `admin_chat_fallback_approved` in unclaimed table
- [ ] Bulk approve/disapprove imported businesses
- [ ] Show tier assignment in business list

### Phase 4: Testing
- [ ] Test with 0 Tier 1 results → should show Tier 2
- [ ] Test with 0 Tier 1+2 results → should show Tier 3
- [ ] Test with 0 results across all tiers → empty state
- [ ] Verify Google attribution appears on all Tier 3 responses
- [ ] Verify carousel never appears for Tier 2/3

---

## ⚠️ Critical Rules (DO NOT BREAK)

1. **Carousels = Paid Only**  
   If a business appears in a carousel card, it MUST be Tier 1 (paid/trial).  
   Enforce via `tierUsed` flag, not array emptiness checks.

2. **No Menu Speculation**  
   Tier 2/3 businesses NEVER get AI menu inference. Only show confirmed data.  
   Tier 2 can show `menu_preview` featured items explicitly.

3. **Always Attribute Google (All Tiers)**  
   If displaying Google-derived data (rating, review count, hours) for ANY business in the response, MUST include attribution footer.  
   **Source matters, not claim status or tier.**

4. **Google Review TEXT = Off Limits for AI**  
   - ✅ USE: Rating + count as NUMERICAL data (math-based social proof)
   - ✅ SAFE: "Highly rated" (if rating >= 4.5), "Popular" (if count > 100)
   - ❌ NEVER: Derive themes/insights from `google_reviews_highlights.text`
   - ❌ NEVER: "Customers mention...", "Known for..." (IF from Google review text)
   - ❌ NEVER: AI transformation of Google review content

5. **Themes Must Come From Non-Google Sources**  
   - ✅ `business_highlights` (owner-selected during onboarding)
   - ✅ Menu-derived themes (IF menu data confirms: "Known for wood-fired pizzas")
   - ✅ Offer-derived themes (IF offers confirm: "Great for brunch")
   - ✅ Future: Qwikker-native reviews
   - ❌ Google review text

6. **Waterfall MUST Be Sequential**  
   Always try Tier 1 first. Only move to Tier 2 if Tier 1 = empty. Only move to Tier 3 if Tier 1+2 = empty.

7. **Upsell Is Mandatory**  
   Every Tier 2/3 response MUST include upgrade messaging.

8. **Use Safe Social Proof Utility**  
   Use `lib/utils/social-proof.ts` functions for compliant rating/count usage.  
   Never implement custom review text parsing.

9. **Reviews Tab = Rating Summary Only**  
   Business detail page reviews tab shows:
   - Rating + count display
   - Optional: Business-provided highlights (NOT from Google reviews)
   - "Read all reviews on Google" CTA
   - Google attribution footer
   - NO full review text display

---

## 🎯 **Strategic Positioning: Discovery Engine, Not Review Platform**

**Qwikker is:**
- ✅ AI-guided venue discovery powered by business intelligence
- ✅ Menu-first recommendations (not crowd noise)
- ✅ Structured data over generic reviews

**Qwikker is NOT:**
- ❌ A review aggregator
- ❌ A review curation platform  
- ❌ Competing with Google/Yelp on reviews

---

## 📊 **Final Model: When To Show Google Reviews**

| Business State | Chat Uses | UI Shows |
|----------------|-----------|----------|
| **Unclaimed** (Tier 3) | Rating + generic themes | ✅ Google reviews (verbatim + attribution) |
| **Claimed Free** (Tier 2) | Description + menu_preview | ❌ NO Google review text |
| **Paid** (Tier 1) | Description + menu + offers + secret | ❌ NO Google review text |

### Why This Works:

**Unclaimed Businesses:**
- Only have third-party info (Google data)
- Reviews = social proof that the place exists and is credible
- Clear framing: "Customer reviews (via Google)"

**Claimed Businesses (Free & Paid):**
- Have direct, verified information from the business
- Win through structured intelligence, not crowd noise
- Framing: "About this venue (provided by the business)"

### Strategic Benefits:

✅ **Legal:** Nothing illegal about only showing reviews for some listings  
✅ **Premium Positioning:** Claimed = more official, not less reviewed  
✅ **No Refresh Hell:** No 30-day rule, no 5-review limits, no moderation  
✅ **Monetization:** Paid businesses win through AI intelligence, not reviews  
✅ **Differentiation:** "Your value is structured intelligence" (not commodity reviews)  

---

## 📊 Google Review Data: Technical Details

### What We Currently Import from Google Places:
```typescript
google_reviews_highlights: [
  {
    author: string,
    rating: number,
    text: string,           // ⚠️ STORED BUT NOT FOR AI USE
    time: string,
    profile_photo: string
  }
]
```

**Max imported:** 10 reviews per business  
**Storage:** `business_profiles.google_reviews_highlights` (JSONB)

### ⚠️ Critical Distinction:

**Google review TEXT = Content owned by Google**  
Using it for AI transformation/themes = ToS violation

**Google rating + count = Numerical data = Safe for math-based social proof**

---

### ✅ What Chat/AI CAN Use:

**From Google (with attribution):**
- ✅ Rating number: `4.8`
- ✅ Review count: `124`
- ✅ Math-based social proof: "Highly rated" (if rating >= 4.5)
- ✅ Math-based social proof: "Popular" (if review_count > 100)
- ✅ Comparative: "One of the top-rated [category] nearby" (computed from ratings)

**From Non-Google Sources:**
- ✅ `business_highlights` (business owner chooses tags during onboarding)
- ✅ Menu-derived themes: "Known for wood-fired pizzas" (IF menu data confirms)
- ✅ Offer-derived themes: "Great for brunch" (IF offers/menu/hours confirm)
- ✅ Future: Qwikker-native reviews

---

### ❌ What Chat/AI CANNOT Use:

**Never derive from Google review text:**
- ❌ "Customers mention..." (implies review text analysis)
- ❌ "Known for..." (IF derived from Google review text)
- ❌ "Reviewers praise..." (implies review text analysis)
- ❌ AI-generated themes from `google_reviews_highlights.text`
- ❌ Any transformation of Google review content

---

### 🎯 Safe Social Proof Examples:

**Rating-Based (Safe):**
```typescript
if (rating >= 4.5 && reviewCount > 200) {
  return "Highly rated and very popular (⭐ 4.8, 200+ reviews)"
}
if (rating >= 4.5 && reviewCount > 100) {
  return "Highly rated with strong review volume (⭐ 4.7, 150+ reviews)"
}
if (rating >= 4.5) {
  return "Highly rated (⭐ 4.6)"
}
if (rating >= 4.0) {
  return "Solid ratings (⭐ 4.2)"
}
```

**Business-Provided Highlights (Safe):**
```typescript
// From business_highlights field (owner-selected during onboarding)
if (business.business_highlights?.length > 0) {
  return `Highlights: ${business.business_highlights.slice(0, 3).join(', ')}`
  // e.g., "Highlights: Live music, Craft cocktails, Dog-friendly"
}
```

**Menu-Derived Themes (Safe):**
```typescript
// Only if you have actual menu data proving it
if (business.menu_items.includes('wood-fired pizza')) {
  return "Known for wood-fired Neapolitan pizzas"
}
```

---

### 🏗️ Recommended Database Schema Addition:

Add business-provided highlights during onboarding/dashboard:

```sql
ALTER TABLE business_profiles
ADD COLUMN business_highlights TEXT[];

-- Example values:
-- ['Live music', 'Craft cocktails', 'Dog-friendly', 'Vegan options', 'Quick service']
```

**UI during onboarding:**
"What makes your business special? (Select up to 5)"
- [ ] Live music
- [ ] Craft cocktails
- [ ] Family-friendly
- [ ] Vegan options
- [ ] Late night
- [ ] Dog-friendly
- [ ] Outdoor seating
- [ ] etc.

This gives you clean, monetizable "Known for" data with ZERO Google ToS risk.

---

## 💬 **UX Copy Guidance: Explaining The Difference**

### **For UNCLAIMED Businesses (Business Detail Page):**

```
┌─────────────────────────────────────────┐
│  Customer Reviews (via Google)          │
│                                          │
│  ⭐ 4.6 (89 reviews)                    │
│                                          │
│  "The atmosphere in the bar is lovely…"  │
│  "Cocktail choices are fun…"             │
│  "Very expensive, but expected…"         │
│                                          │
│  [Read all reviews on Google →]         │
│                                          │
│  _Ratings and reviews provided by Google_│
└─────────────────────────────────────────┘
```

**This communicates:** "We only have third-party info here."

---

### **For CLAIMED Businesses (Business Detail Page):**

```
┌─────────────────────────────────────────┐
│  About This Venue                        │
│  ✓ Verified by business owner            │
│                                          │
│  Tagline:                                │
│  "Authentic wood-fired Neapolitan pizza" │
│                                          │
│  Description:                            │
│  We specialize in house-made pasta and   │
│  wood-fired pizza, using only the        │
│  finest imported Italian ingredients...  │
│                                          │
│  Highlights:                             │
│  • Wood-fired oven                       │
│  • Cosy candle-lit atmosphere            │
│  • Family-owned since 2018               │
│                                          │
│  💡 This venue has provided verified     │
│     information directly to Qwikker      │
└─────────────────────────────────────────┘
```

**This communicates:** They feel MORE official, not less reviewed.

---

### **Chat Response Examples:**

**Unclaimed (Tier 3):**
```
⭐ 4.6 rated Mediterranean restaurant (0.6 miles away)

Based on Google reviews, customers mention:
• Lovely atmosphere
• Classic cocktails  
• West End pricing

📞 Call ahead to confirm menu options
```

**Claimed (Tier 1 & 2):**
```
They specialize in house-made pasta and wood-fired pizza, 
known for their cosy candle-lit atmosphere.

Menu highlights:
• Truffle arancini (secret menu)
• Margherita pizza - £12
• Tiramisu - £6.50

Offer: 2-for-1 pizzas after 9pm
```

**The Difference:**
- Unclaimed = Social proof (ratings + generic themes)
- Claimed = Intelligent venue knowledge (structured data)

---

### **When Businesses Claim (Onboarding Copy):**

```
┌─────────────────────────────────────────┐
│  📝 Your Description Powers Qwikker AI  │
│                                          │
│  Qwikker's AI uses your description and  │
│  highlights to recommend your venue.     │
│                                          │
│  The better this section is, the more    │
│  accurately we match you to customers.   │
│                                          │
│  ✨ This isn't fluff - it feeds the AI   │
└─────────────────────────────────────────┘
```

**This makes businesses understand:** Their content = AI intelligence, not just marketing copy.

---

**Document Version:** 1.2  
**Last Updated:** 2026-01-28  
**Implementation Status:** Option A (verbatim snippets) implemented, Option B (Qwikker Vibes) roadmap ready
