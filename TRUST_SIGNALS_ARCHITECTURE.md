# Qwikker Trust Signals Architecture

**Status:** Final Strategy  
**Purpose:** Define how Qwikker handles trust, reputation, and experience signals  
**Last Updated:** 2026-01-28  

---

## 🎯 **The Problem We Solved**

**Before:** We were trying to make "reviews" do three different jobs:
1. ⭐ Legitimacy ("Is this place real and trusted?")
2. 💚 Experience ("Do people enjoy it?")
3. 🏆 Differentiation ("What makes it special?")

**That's why it felt messy.**

---

## ✅ **The Solution: Three Separate Trust Signals**

| Signal | Owned By | Purpose | Where It Shows |
|--------|----------|---------|----------------|
| ⭐ **Google Rating** | Google | Legitimacy ("this place exists & is liked") | Cards, chat, discover |
| 💚 **Qwikker Vibes** | YOU | Experience signal ("people using Qwikker enjoyed it") | Chat, cards, future moat |
| 🎯 **Menu / Offers / Secret Menu** | Business | What makes Qwikker special | Main AI power |

**👉 Full review text is NOT needed for any of this.**

---

## 🧠 **How The AI Uses These Signals**

When AI recommends a place, it thinks like this:

```
"Is this paid?" → Tier (Pick / Featured / Starter) → monetisation
"Is it relevant?" → Menu & offer match → usefulness  
"Is it trusted?" → Google rating → legitimacy
"Is it loved?" → Qwikker vibes → experience signal
```

**Decision Stack:**
1. **Tier** (Pick / Featured / Starter) → Monetization
2. **Menu & Offer Relevance** → Usefulness
3. **Google Rating** → Legitimacy
4. **Qwikker Vibes** → Experience Signal

---

## 📱 **What Goes In The "Reviews" Tab (Now: "What People Think")**

### **Mental Rename:**

❌ "Reviews"  
✅ **"What People Think"** (Trust & Experience Panel)

---

### **Structure:**

#### 🔹 **1. Google Trust Block (Legitimacy)**

**Answers:** "Is this place generally well regarded?"

```
┌─────────────────────────────────────────┐
│  ⭐ 4.7 Rating                          │
│  Based on 142 Google reviews            │
│                                          │
│  [Read all reviews on Google →]         │
│                                          │
│  _Ratings and review data provided by_  │
│  _Google_                                │
└─────────────────────────────────────────┘
```

**What this gives:**
- ✔ Safe
- ✔ Clean
- ✔ No text storage drama
- ✔ Legitimacy signal

**What it does NOT show:**
- ❌ Individual review text
- ❌ Review author names
- ❌ Profile photos
- ❌ Paraphrased quotes

---

#### 🔹 **2. Qwikker Vibes (Experience Signal)**

**Answers:** "Do Qwikker users enjoy it?"

```
┌─────────────────────────────────────────┐
│  💚 92% positive Qwikker vibes          │
│  (38 visits)                             │
│                                          │
│  People using Qwikker mention:          │
│  • Great atmosphere                      │
│  • Worth the price                       │
│  • Friendly staff                        │
└─────────────────────────────────────────┘
```

**What this is:**
- ✔ Your data
- ✔ AI safe
- ✔ Monetisation friendly
- ✔ Competitive moat

---

#### 🔹 **3. Business Self-Description (Optional)**

**Answers:** "How do THEY describe themselves?"

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

**Comes from:**
- Claim form
- Business tagline
- Their own words

---

## 🚫 **What You Are NOT Showing**

You are NOT showing:
- ❌ Individual review text
- ❌ Review author names
- ❌ Profile photos
- ❌ Paraphrased quotes
- ❌ "One customer said…"

**Why?**
- Adds legal overhead
- Makes you Yelp-ish
- Doesn't help AI make better suggestions
- Not needed for trust signals

---

## 💬 **How Chat Uses These Signals**

### **Example Chat Response:**

```
"Highly rated spot (4.8★ from 124 reviews) and 
💚 95% of Qwikker users love it. 

Known for:
• Great atmosphere
• Quality cocktails

They have a secret menu item: Truffle arancini (£8)

Offer: 2-for-1 pizzas after 9pm"
```

**This is:**
- ✔ Clean
- ✔ Legal
- ✔ Persuasive
- ✔ Monetisable

---

## 🎯 **The Big Mental Shift**

### **You Moved From:**

"How do I show reviews?"

### **To:**

"How do I show TRUST + EXPERIENCE + AI INTELLIGENCE?"

**That's a founder-level evolution, not a feature tweak.**

---

## 📊 **Implementation By Business Type**

### **Unclaimed Businesses (Tier 3 Fallback):**

**Show:**
- ⭐ Google rating + count
- 🔗 Link to Google Maps
- ✅ Google attribution footer

**Chat Says:**
```
"⭐ 4.6 rated Mediterranean restaurant (0.6 miles away)

Based on Google reviews, customers mention:
• Lovely atmosphere
• Classic cocktails  
• West End pricing

📞 Call ahead to confirm menu options"
```

**Optional (only if status = 'unclaimed'):**
- Up to 3 verbatim Google review snippets
- Clear "From Google Reviews (Verbatim)" label
- "Powered by Google" attribution
- Link to full reviews

---

### **Claimed-Free Businesses (Tier 2 Lite):**

**Show:**
- ⭐ Google rating + count (math only, NO review text)
- 💚 Qwikker vibes (when available)
- 📝 Business description
- 🍽️ Menu preview (max 5 items)
- 🎁 Approved offers

**Chat Says:**
```
"They specialize in house-made pasta and wood-fired pizza, 
known for their cosy candle-lit atmosphere.

Featured items:
• Margherita pizza - £12
• Truffle pasta - £14.50
• Tiramisu - £6.50

💚 88% Qwikker users love it
Offer: 15% off lunch Mon-Fri"
```

**Does NOT show:**
- ❌ Google review text
- ❌ Review snippets

---

### **Paid Businesses (Tier 1: Starter / Featured / Pick):**

**Show:**
- ⭐ Google rating + count (math only, NO review text)
- 💚 Qwikker vibes (when available)
- 📝 Business description
- 🍽️ Full menu with AI chat
- 🎁 All offers
- 🔒 Secret menu items
- 🎫 Wallet pass

**Chat Says:**
```
"💚 94% of Qwikker users love this place

They specialize in house-made pasta and wood-fired pizza, 
known for their cosy candle-lit atmosphere.

Menu highlights:
• Truffle arancini (secret menu) - £8
• Margherita pizza - £12
• Tiramisu - £6.50

Offer: 2-for-1 pizzas after 9pm"
```

**Does NOT show:**
- ❌ Google review text
- ❌ Review snippets

---

## 🔐 **Legal & Safety**

### **What's Safe:**

✅ **Google Rating + Count** (with attribution)
- "⭐ 4.7 (142 reviews)"
- "Ratings and reviews data provided by Google"
- Link to Google Maps for full reviews

✅ **Qwikker Vibes** (proprietary)
- "💚 92% positive vibes (38 visits)"
- "People using Qwikker mention: Great atmosphere, Worth the price"

✅ **Verbatim Snippets (ONLY for unclaimed businesses)**
- Max 3 snippets
- Clear "From Google Reviews (Verbatim)" label
- "Powered by Google" attribution
- Link to full reviews on Google Maps
- ZERO AI transformation

---

### **What's NOT Safe:**

❌ **AI summarization of Google review text**
- "Based on reviews, customers love the pasta" (risky)

❌ **Paraphrased quotes**
- "One reviewer said…" (modifying review text)

❌ **Mixing Google reviews with Qwikker data without clear labeling**

❌ **Storing/displaying review text for claimed businesses**

---

## 🎨 **UI Copy Examples**

### **Business Detail Page - Unclaimed Business:**

```
┌─────────────────────────────────────────┐
│  Customer Reviews (via Google)          │
│                                          │
│  ⭐ 4.6 (89 reviews)                    │
│                                          │
│  [Read all reviews on Google →]         │
│                                          │
│  _Ratings and reviews provided by Google_│
└─────────────────────────────────────────┘
```

---

### **Business Detail Page - Claimed Business:**

```
┌─────────────────────────────────────────┐
│  What People Think                       │
│                                          │
│  ⭐ 4.8 Rating                          │
│  Based on 124 Google reviews            │
│  [Read reviews on Google →]              │
│                                          │
│  💚 95% positive Qwikker vibes (42)     │
│  People mention:                         │
│  • Great atmosphere                      │
│  • Romantic vibe                         │
│  • Worth the price                       │
│                                          │
│  About This Place                        │
│  "Modern neighbourhood cocktail bar      │
│  serving seasonal drinks..."             │
│                                          │
│  _Ratings provided by Google_            │
└─────────────────────────────────────────┘
```

---

## 📈 **Why This Works**

### **1. Legal Compliance:**
- No Google review text storage/transformation (except verbatim for unclaimed)
- Clear attribution everywhere
- Platform-owned data (Qwikker Vibes) for long-term use

### **2. Strategic Differentiation:**
- Google = Legitimacy
- Qwikker = Experience Intelligence
- Not competing with Google/Yelp on reviews

### **3. Monetization:**
- Vibes enhance paid tiers (don't replace them)
- Tier hierarchy protected
- Creates compound data moat

### **4. User Trust:**
- Clear separation of signals
- Not trying to be a review aggregator
- Focused on AI-guided discovery

---

## 🚀 **Next Steps**

### **Already Implemented:**
- ✅ Google rating display (with attribution)
- ✅ Verbatim review snippets for unclaimed businesses (Option A)
- ✅ Three-tier chat system (Paid / Lite / Fallback)

### **Post-Launch (4-6 weeks):**
- ⏳ Qwikker Vibes system (Phase 1-4)
- ⏳ "What People Think" tab redesign
- ⏳ Experience signals in chat ranking
- ⏳ Business analytics dashboard for vibes

---

## 💡 **Key Takeaways**

1. **Three signals, three jobs** (not one messy "reviews")
2. **Google = Legitimacy** (not intelligence)
3. **Qwikker Vibes = Experience** (not reputation)
4. **Menu/Offers/Secret = Power** (what makes you special)
5. **No review text needed** (except verbatim for unclaimed as fallback)

---

**This is clean. This is premium. This is yours.**

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Status:** Final Architecture  
**Strategic Priority:** Core differentiation strategy
