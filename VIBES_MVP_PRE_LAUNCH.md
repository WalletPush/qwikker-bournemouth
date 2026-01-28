# Qwikker Vibes MVP - PRE-LAUNCH CRITICAL

**Status:** 🔴 **SHIP BEFORE LAUNCH**  
**Priority:** Core product positioning (not "nice to have")  
**Timeline:** 2-3 days implementation  
**Last Updated:** 2026-01-28  

---

## 🎯 **Why This Is Pre-Launch Critical (Not "Phase 2")**

### **Without Vibes:**
> "AI directory with Google ratings"

### **With Vibes:**
> "AI that understands the type of experience places give"

**That's a category difference.**

---

## 🧠 **Why Shipping This NOW Is Actually Critical:**

### **1. Solves Review Chaos Cleanly**

Right now you're fighting:
- ❌ Google ToS stress
- ❌ Attribution complexity
- ❌ 30-day refresh requirements
- ❌ "Can AI summarize reviews?" anxiety
- ❌ Free vs paid review imbalance

**Vibes deletes the whole problem:**
- ✅ Google = Credibility layer
- ✅ Qwikker = Experience layer
- ✅ Done. Clean architecture.

---

### **2. Makes AI Feel Intelligent**

**Without Vibes:**
> "Here are some places with good ratings"

**With Vibes:**
> "Here are chill date-night spots people say have a great atmosphere and are worth the price"

**Feels like:** 🧠 "This AI gets me"  
**Not:** 📖 "This AI reads Google"

---

### **3. Protects Monetization From Day 1**

**If you rely on Google reviews:**
- Free listings look just as "rich" as paid
- Value looks external

**With Vibes:**
- ✅ Paid tiers get insight dashboards
- ✅ Vibe badge can be premium feature
- ✅ AI can surface "most loved" within tiers
- ✅ **You control the signal**

**That's SaaS leverage.**

---

### **4. Gives Qwikker a Moat From Day 1**

Most startups add the moat later.

**You're launching with the moat baked in.**

That's serious.

---

### **5. Easier To Ship Now Than Retrofit**

**If you launch first, then add later:**
- ❌ Change UI later
- ❌ Retrain AI prompts
- ❌ Reframe product narrative
- ❌ Migrate mental model

**Doing it now:**
- ✅ Architecture clean from day 1
- ✅ Product story coherent
- ✅ Data collection starts immediately
- ✅ No retrofitting headaches

---

## ✅ **LAUNCH VERSION (Vibes MVP - Lightweight)**

### **What We're NOT Building:**

❌ Tag selection (can be phase 2)  
❌ Advanced analytics (can be phase 2)  
❌ Trend analysis (can be phase 2)  
❌ Comparative insights (can be phase 2)  

### **What We ARE Building:**

✅ **3-level vibe capture** (🔥/🙂/😕)  
✅ **Basic storage** (business_id, user_id, vibe_rating)  
✅ **Simple display** (percentage + count)  
✅ **AI integration** (mention in chat responses)  

**That's it. Clean and fast.**

---

## 🛠️ **Implementation Plan (2-3 Days)**

### **Day 1: Database + Capture**

#### **1. Create Table:**

```sql
-- Simple vibes table
CREATE TABLE qwikker_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vibe_rating TEXT NOT NULL CHECK (vibe_rating IN ('loved_it', 'it_was_good', 'not_for_me')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One vibe per user per business
  UNIQUE(business_id, user_id)
);

-- Index for fast lookups
CREATE INDEX idx_qwikker_vibes_business ON qwikker_vibes(business_id);
CREATE INDEX idx_qwikker_vibes_user ON qwikker_vibes(user_id);
```

**Values:**
- `'loved_it'` → "♥ Loved it"
- `'it_was_good'` → "✓ It was good"
- `'not_for_me'` → "— Not for me"

#### **2. Create API Route:**

`/app/api/vibes/submit/route.ts`

```typescript
// Submit a vibe
POST /api/vibes/submit
{
  businessId: string,
  vibeRating: 'loved_it' | 'it_was_good' | 'not_for_me'
}

// Uses UPSERT (insert or update if exists)
// Returns: { success: true, vibeData }
```

#### **3. Create Trigger UI:**

**Show prompt after:**
- ✅ "Get Directions" tapped
- ✅ "Call" tapped  
- ✅ Offer saved
- ✅ Wallet pass viewed

**UI (Premium Text-Led - No Playful Emojis):**

```
┌─────────────────────────────────────────┐
│  How was your visit?                    │
│                                          │
│  [ ♥ Loved it        ]                  │
│  [ ✓ It was good     ]                  │
│  [ — Not for me      ]                  │
│                                          │
│  Maybe later                             │
└─────────────────────────────────────────┘
```

**Design Specs:**
- **Bottom sheet** (smooth slide-up from bottom)
- **Dark mode** (bg-slate-900/95, backdrop-blur)
- **Minimal icons** (monochrome, soft white)
- **Single tap** to submit
- **Auto-dismiss** after submit with subtle checkmark
- **Never shows again** for this business/user
- **Dismissible** ("Maybe later" link, muted text)

**Tone:**
- ❌ Not: Playful/cartoon/Duolingo energy
- ✅ Is: Premium/editorial/concierge tone
- Feels like: iOS settings, Apple Music rating, private members club

**Alternative (Micro-Luxury Version):**
```
How was it?

[ Loved it      ]
[ Worth it      ]
[ Not for me    ]
```

**Interaction:**
- Bottom sheet (smooth slide-up)
- Single tap to submit
- Auto-dismisses after submit
- Shows subtle "✓ Thanks" confirmation (no emoji)
- Never shows again for this business/user

---

### **Day 2: Display + Aggregation**

#### **1. Create Aggregation Function:**

`/lib/utils/vibes.ts`

```typescript
export async function getBusinessVibes(businessId: string) {
  const { data } = await supabase
    .from('qwikker_vibes')
    .select('vibe_rating')
    .eq('business_id', businessId)
  
  if (!data || data.length === 0) {
    return {
      totalVibes: 0,
      positivePercentage: null,
      displayText: null
    }
  }
  
  const total = data.length
  const positive = data.filter(v => 
    v.vibe_rating === 'loved_it' || v.vibe_rating === 'it_was_good'
  ).length
  
  const percentage = Math.round((positive / total) * 100)
  
  // Only show stats if >= 5 vibes
  if (total >= 5) {
    return {
      totalVibes: total,
      positivePercentage: percentage,
      displayText: `${percentage}% positive (${total} vibes)`
    }
  }
  
  // 1-4 vibes: Early feedback
  if (total >= 1) {
    return {
      totalVibes: total,
      positivePercentage: percentage,
      displayText: `Early feedback: ${percentage}% positive (${total})`
    }
  }
  
  // 0 vibes: Invitation
  return {
    totalVibes: 0,
    positivePercentage: null,
    displayText: null  // Don't show anything - use empty state UI instead
  }
}
```

#### **2. Display On Business Page:**

Add to `UserBusinessDetailPage` (below rating):

```tsx
{vibeData && vibeData.totalVibes >= 1 && (
  <div className="text-sm text-slate-300">
    {vibeData.displayText}
  </div>
)}

{vibeData && vibeData.totalVibes === 0 && (
  <div className="text-sm text-slate-400 italic">
    ✨ Be the first Qwikker to share a vibe
  </div>
)}
```

**Rules:**
- ❌ Never show "0%" or empty stats
- ✅ >= 5 vibes: Show percentage
- ✅ 1-4 vibes: "Early feedback coming in"
- ✅ 0 vibes: Invitation copy

---

### **Day 3: AI Integration**

#### **1. Add Vibes To Business Context:**

In `lib/ai/hybrid-chat.ts`, add vibes data to business objects:

```typescript
// After querying businesses, fetch vibes for each
const businessesWithVibes = await Promise.all(
  businesses.map(async (business) => {
    const vibeData = await getBusinessVibes(business.id)
    return {
      ...business,
      vibeData
    }
  })
)
```

#### **2. Include In AI Prompt:**

```typescript
// For businesses with >= 5 vibes
if (business.vibeData && business.vibeData.totalVibes >= 5) {
  context += `\nQwikker users love this place (${business.vibeData.positivePercentage}% positive from ${business.vibeData.totalVibes} vibes).`
}

// For businesses with 1-4 vibes
if (business.vibeData && business.vibeData.totalVibes >= 1 && business.vibeData.totalVibes < 5) {
  context += `\nEarly Qwikker feedback is positive.`
}

// For 0 vibes: Don't mention anything
```

#### **3. AI Response Examples:**

**5+ Vibes:**
> "This place serves wood-fired pizza and has a 4.8★ rating. 92% of recent Qwikker visitors loved it. Offer: 2-for-1 after 9pm."

**1-4 Vibes:**
> "They specialize in cocktails. Early Qwikker feedback is positive (3 vibes). Open until 1am."

**0 Vibes:**
> "Modern neighbourhood bar with 4.7★ rating. Known for craft cocktails."

**No awkward "no data" language. Just omit vibes if not available.**

---

### **4. Chat Response Contract (For TypeScript)**

To prevent mixing tiers and ensure correct attribution:

```typescript
interface ChatResponse {
  aiResponse: string
  businessCarousel?: BusinessCard[]  // Only for Tier 1 (paid)
  
  // Vibes data (when applicable)
  vibesSummary?: {
    businessId: string
    businessName: string
    positivePercentage: number
    totalVibes: number
    displayInChat: boolean  // Only true if >= 5 vibes
  }
  
  // Google review snippets (only for Tier 3 unclaimed)
  googleReviewSnippets?: {
    businessName: string
    businessId: string
    google_place_id: string
    snippets: Array<{
      text: string
      author: string
      rating: number
    }>
  }
  
  // Flags for rendering
  tierUsed: 1 | 2 | 3 | 0  // 0 = no results
  showGoogleAttribution: boolean  // true if any Google data used (rating/reviews/hours)
  showTier3Disclaimer: boolean  // true for fallback directory responses
}
```

**Rules:**
- `vibesSummary.displayInChat` = true only if `totalVibes >= 5`
- `showGoogleAttribution` = true if rating, review_count, hours, or review snippets are used
- `googleReviewSnippets` only populated for Tier 3 unclaimed businesses
- `businessCarousel` only populated for Tier 1 (paid/trial)

---

## 🧠 **The Psychology: "Zero Vibes" Is An Opportunity**

### **What You're NOT Doing:**

❌ "0% positive vibes"  
❌ "No reviews yet"  
❌ Empty statistics blocks  
❌ "Not enough data"  

### **What You ARE Doing:**

✅ **"Be the first Qwikker to share a vibe"**  
✅ **Discovery signal** (not lack of trust)  
✅ **Invitation energy** (not emptiness)  

### **Why This Works:**

Early users LOVE:
- 🔥 "Be the first"
- 🔥 "Discovering before others"
- 🔥 "Found something new"

**So "no vibes yet" becomes:**
- Discovery signal (this is NEW on Qwikker)
- Participation invitation
- Early adopter moment

**Not:**
- Trust deficit
- Unpopular business
- Missing data

---

## 🎯 **The Business Evolution Model**

### **Phase 1 Businesses (0 vibes):**
- Credibility via Google rating
- "Be the first to vibe"

### **Phase 2 Businesses (5+ vibes):**
- Credibility via Google rating
- **+ Experience identity via Qwikker vibes**

**Businesses evolve on your platform.**  
**That's powerful.**

---

## 📊 **"What People Think" Tab - Exact UI Copy**

### **Tab Structure (Always 3 Blocks):**

1. **Google Trust Block** (always render)
2. **Qwikker Vibes Block** (always render, may show empty state)
3. **About This Place** (claimed) OR **Unclaimed Notice** (unclaimed)

---

### **🔹 Block 1: Google Trust Block (Always)**

#### **State A: Google Rating Available**

```
┌─────────────────────────────────────────┐
│  ⭐ 4.7                                  │
│  Based on 142 Google reviews            │
│                                          │
│  [Read all reviews on Google →]         │
│                                          │
│  Ratings and reviews provided by Google  │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3 pb-6 border-b border-slate-700/50">
  <div className="flex items-center gap-2">
    <span className="text-yellow-400">⭐</span>
    <span className="text-2xl font-semibold text-white">{rating.toFixed(1)}</span>
  </div>
  
  <p className="text-sm text-slate-400">
    Based on {reviewCount} Google reviews
  </p>
  
  <a 
    href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${google_place_id}`}
    target="_blank"
    className="inline-flex items-center gap-2 text-sm text-[#00d083] hover:text-[#00d083]/80"
  >
    Read all reviews on Google
    <ExternalLink className="w-3.5 h-3.5" />
  </a>
  
  <p className="text-xs text-slate-500">
    Ratings and reviews provided by Google
  </p>
</div>
```

---

#### **State B: Google Rating Unavailable (Not Verified)**

```
┌─────────────────────────────────────────┐
│  Google rating unavailable               │
│  This business hasn't verified with      │
│  Google yet.                             │
│                                          │
│  [View on Google Maps →]                 │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3 pb-6 border-b border-slate-700/50">
  <p className="text-sm text-slate-400">
    Google rating unavailable
  </p>
  
  <p className="text-xs text-slate-500">
    This business hasn't verified with Google yet.
  </p>
  
  {google_place_id && (
    <a 
      href={`https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${google_place_id}`}
      target="_blank"
      className="inline-flex items-center gap-2 text-sm text-[#00d083] hover:text-[#00d083]/80"
    >
      View on Google Maps
      <ExternalLink className="w-3.5 h-3.5" />
    </a>
  )}
</div>
```

---

### **🔹 Block 2: Qwikker Vibes (Always Render)**

#### **State A: >= 5 Vibes (Show Stats)**

```
┌─────────────────────────────────────────┐
│  Qwikker Vibes                           │
│                                          │
│  92% positive (38 vibes)                 │
│                                          │
│  Most recent visitors loved it.          │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3 pb-6 border-b border-slate-700/50">
  <h3 className="text-sm font-medium text-white">
    Qwikker Vibes
  </h3>
  
  <div className="text-2xl font-semibold text-white">
    {vibeData.positivePercentage}% positive
    <span className="text-sm font-normal text-slate-400 ml-2">
      ({vibeData.totalVibes} vibes)
    </span>
  </div>
  
  <p className="text-sm text-slate-400">
    Most recent visitors loved it.
  </p>
</div>
```

---

#### **State B: 1-4 Vibes (Early Feedback)**

```
┌─────────────────────────────────────────┐
│  Qwikker Vibes                           │
│                                          │
│  Early feedback: 100% positive (3)       │
│                                          │
│  Early visitors are enjoying it.         │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3 pb-6 border-b border-slate-700/50">
  <h3 className="text-sm font-medium text-white">
    Qwikker Vibes
  </h3>
  
  <div className="text-lg font-medium text-white">
    Early feedback: {vibeData.positivePercentage}% positive ({vibeData.totalVibes})
  </div>
  
  <p className="text-sm text-slate-400">
    Early visitors are enjoying it.
  </p>
</div>
```

---

#### **State C: 0 Vibes (Invitation / Empty State)**

```
┌─────────────────────────────────────────┐
│  Qwikker Vibes                           │
│                                          │
│  No vibes yet — be the first.            │
│                                          │
│  After you tap Directions, Call, or Save │
│  an Offer, we'll ask how it was.         │
│                                          │
│  Takes 2 seconds. No written review.     │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3 pb-6 border-b border-slate-700/50">
  <h3 className="text-sm font-medium text-white">
    Qwikker Vibes
  </h3>
  
  <p className="text-sm text-slate-300">
    No vibes yet — be the first.
  </p>
  
  <p className="text-xs text-slate-500">
    After you tap Directions, Call, or Save an Offer, we'll ask how it was.
  </p>
  
  <p className="text-xs text-slate-500">
    Takes 2 seconds. No written review.
  </p>
</div>
```

---

### **🔹 Block 3: About This Place / Unclaimed Notice**

#### **State A: Claimed Business (Has Description)**

```
┌─────────────────────────────────────────┐
│  About This Place                        │
│                                          │
│  "Modern neighbourhood cocktail bar      │
│  serving seasonal drinks and small       │
│  plates in a relaxed late-night          │
│  setting."                               │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3">
  <h3 className="text-sm font-medium text-white">
    About This Place
  </h3>
  
  <p className="text-sm text-slate-300 leading-relaxed">
    {business.tagline || business.description}
  </p>
</div>
```

---

#### **State B: Unclaimed Business**

```
┌─────────────────────────────────────────┐
│  This business hasn't claimed their      │
│  Qwikker listing yet.                    │
│                                          │
│  Once claimed, owners can share their    │
│  story, menu, and special offers.        │
│                                          │
│  [Is this your business? Claim here →]  │
└─────────────────────────────────────────┘
```

**Code:**
```tsx
<div className="space-y-3">
  <p className="text-sm text-slate-400">
    This business hasn't claimed their Qwikker listing yet.
  </p>
  
  <p className="text-xs text-slate-500">
    Once claimed, owners can share their story, menu, and special offers.
  </p>
  
  <a 
    href={`/claim?business_id=${business.id}`}
    className="inline-flex items-center gap-2 text-sm text-[#00d083] hover:text-[#00d083]/80"
  >
    Is this your business? Claim here
    <ChevronRight className="w-3.5 h-3.5" />
  </a>
</div>
```

---

## 📍 **Google Attribution Rules (Critical for Compliance)**

**Simple rule:** Whenever you show `rating` or `review_count`, add attribution on that same surface.

### **Attribution Placement:**

#### **1. Discover Page (Card List)**
- Footer at bottom of page:
```
<div className="text-xs text-slate-500 text-right mt-6">
  Ratings and reviews provided by Google
</div>
```

#### **2. Business Detail Page ("What People Think" Tab)**
- Inside Google Trust Block (see Block 1 above)
- Small text at bottom of block

#### **3. Chat Responses (When Google Data Used)**
- Footer after AI message (only when `showGoogleAttribution === true`):
```
<div className="text-xs text-slate-500 mt-3">
  Ratings and reviews provided by Google
</div>
```

#### **4. Verbatim Review Snippets (Tier 3 Only)**
- "Powered by Google" in footer with logo
- Link to Google Maps for full reviews
- Clear "From Google Reviews (Verbatim)" label

**When NOT needed:**
- Qwikker Vibes only (no Google data)
- Business description only
- Menu/offers only

---

## ✅ **What This Achieves**

### **1. Clean Architecture From Day 1:**
- Google = Legitimacy
- Vibes = Experience
- Menu/Offers = Differentiation

### **2. No Review Text Drama:**
- ❌ No ToS stress
- ❌ No 30-day refresh
- ❌ No attribution complexity
- ❌ No "can AI summarize?" questions

### **3. Data Flywheel Starts Immediately:**
- Day 1: First vibes collected
- Week 1: 50+ vibes across businesses
- Month 1: 500+ vibes (compound data starts)
- Month 3: AI recommendations get noticeably smarter

### **4. Product Story Is Coherent:**
- Not "AI directory with reviews"
- **"AI that understands experience identity"**

### **5. Monetization Protected:**
- Vibes enhance paid tiers
- Dashboard analytics for paid businesses
- "Most loved" filtering (premium feature)
- Badge system (premium visual)

---

## 🚀 **Implementation Checklist**

### **Day 1: Database + Capture**
- [ ] Create `qwikker_vibes` table
- [ ] Create `POST /api/vibes/submit` route
- [ ] Add vibe prompt UI (bottom sheet)
- [ ] Wire up triggers (directions, call, offer saved)
- [ ] Test submission flow

### **Day 2: Display + Aggregation**
- [ ] Create `getBusinessVibes()` utility
- [ ] Add vibes display to business detail page
- [ ] Implement "0 vibes" invitation copy
- [ ] Implement "1-4 vibes" early feedback copy
- [ ] Implement "5+ vibes" percentage display
- [ ] Test all three states

### **Day 3: AI Integration**
- [ ] Add vibes to business context in hybrid-chat.ts
- [ ] Update AI prompts to include vibe data (when >= 5)
- [ ] Test chat responses with/without vibes
- [ ] Verify no awkward "no data" language
- [ ] Test all three tiers (Paid/Lite/Fallback)

---

## 💡 **Brutally Honest Founder Take**

You just designed something that's:
- ✅ Legally clean
- ✅ AI-native
- ✅ Monetizable
- ✅ Compounding
- ✅ Differentiated

Most founders would say:
> "Cool idea for phase 2"

You're saying:
> "This is the core"

**That's a product leader move.**

---

## 🧠 **First Principle**

**Vibes are a bonus signal - not a requirement for credibility.**

- **Google rating** = Trust baseline
- **Vibes** = Experience intelligence layer

**So:**
- No vibes ≠ problem
- No vibes = "Not experienced through Qwikker yet"

**That actually fits your story.**

---

## 🎯 **What This Really Is**

You're not building:
> A review site

You're building:
> **An experience intelligence system that grows over time**

**Zero vibes is not a flaw.**  
**It's the start of the data flywheel.**

---

## 📅 **Timeline**

| Day | Tasks | Outcome |
|-----|-------|---------|
| **Day 1** | DB + Capture | Vibes can be submitted |
| **Day 2** | Display + Aggregation | Vibes visible on business pages |
| **Day 3** | AI Integration | AI mentions vibes in responses |

**Total:** 2-3 days  
**Outcome:** Core product positioning locked in from launch  

---

**This is pre-launch critical. Not "nice to have."**  
**This IS the category difference.**

---

---

## 🎨 **Design Philosophy: Premium, Not Playful**

### **What Qwikker Is:**
- Dark mode cinematic
- Minimal + intentional
- AI-first intelligence
- Feels like: Apple Maps + private members club

### **What Qwikker Is NOT:**
- Playful/cartoon energy (Duolingo/Tinder)
- Big colorful emojis in core UI
- Gamified review platform
- Social media vibe

---

### **Where Emojis ARE OK:**
- ✅ Chat tone occasionally (casual, conversational)
- ✅ Marketing / social media
- ✅ Business dashboard fun bits

### **Where Emojis Are NOT OK:**
- ❌ Core trust/rating UI (vibes prompt, stats display)
- ❌ Navigation / structural UI
- ❌ Professional business-facing features

---

### **Vibes UI Tone:**

**Not:**
> "How was it? 🔥🙂😕"

**Is:**
> "How was your visit?  
> ♥ Loved it  
> ✓ It was good  
> — Not for me"

**Feels like:**
- Editorial restaurant guide
- Concierge recommendation
- Quiet signal, not loud review
- Premium experience intelligence

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Status:** 🔴 Ship before launch  
**Strategic Priority:** Core product positioning  
**Design Language:** Premium dark-mode, minimal icons, no playful emojis
