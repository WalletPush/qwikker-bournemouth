# Qwikker Vibes: Proprietary Review System Roadmap

**Status:** Future Enhancement (Post-Launch)  
**Purpose:** Build proprietary sentiment data that becomes Qwikker's competitive moat  
**Timeline:** Ship within 4-6 weeks of launch  

---

## 🎯 **The Problem:**

Google Reviews are:
- ❌ Owned by Google (platform risk)
- ❌ Can't be transformed by AI (ToS restrictions)
- ❌ Not actionable for businesses
- ❌ Generic (not Qwikker-specific engagement)

**Qwikker needs its own sentiment layer.**

---

## ✨ **The Solution: Qwikker Vibes**

### **Concept:**
Lightweight, friction-free feedback system integrated into the wallet pass experience.

### **Key Principles:**
1. **No written reviews** (emoji + tags only = faster, less intimidating)
2. **Context-aware** (triggered after engagement: directions, call, offer claim, visit)
3. **Opt-in** (never intrusive, always valuable)
4. **Proprietary** (100% Qwikker data, zero Google dependency)

---

## 🔧 **Implementation:**

### **Phase 1: One-Tap Vibe Check (MVP)**

**Trigger:** After user taps "Directions", "Call", "Save Offer", or "Mark as Visited"

**UI Flow:**

```
┌─────────────────────────────────────┐
│  How was [Business Name]?           │
│                                      │
│  🔥 Amazing                          │
│  🙂 Good                             │
│  😕 Not for me                      │
│                                      │
│  [ Maybe later ]                     │
└─────────────────────────────────────┘
```

**Database Schema:**

```sql
CREATE TABLE qwikker_vibes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES business_profiles(id),
  user_id UUID REFERENCES app_users(id),
  vibe_rating TEXT CHECK (vibe_rating IN ('amazing', 'good', 'not_for_me')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id) -- One vibe per user per business
);

CREATE INDEX idx_vibes_business ON qwikker_vibes(business_id) WHERE vibe_rating IN ('amazing', 'good');
```

---

### **Phase 2: Tag Selection (Depth Layer)**

**Trigger:** After vibe selection, show follow-up:

```
┌─────────────────────────────────────┐
│  What stood out? (Pick up to 3)     │
│                                      │
│  ☑ Great atmosphere                  │
│  ☐ Friendly staff                    │
│  ☑ Worth the price                   │
│  ☐ Amazing cocktails                 │
│  ☐ Fast service                      │
│  ☐ Good for dates                    │
│  ☑ Instagram-worthy                  │
│  ☐ Family-friendly                   │
│  ☐ Hidden gem                        │
│                                      │
│  [ Submit Vibe ]                     │
└─────────────────────────────────────┘
```

**Database Schema:**

```sql
CREATE TABLE vibe_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vibe_id UUID REFERENCES qwikker_vibes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vibe_tags_business ON vibe_tags(vibe_id);

-- Predefined tags (extensible)
CREATE TABLE available_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  category TEXT, -- 'atmosphere', 'service', 'value', 'experience'
  sort_order INT DEFAULT 0
);
```

**Seed Tags:**

```sql
INSERT INTO available_tags (tag, category, sort_order) VALUES
  ('Great atmosphere', 'atmosphere', 1),
  ('Friendly staff', 'service', 2),
  ('Worth the price', 'value', 3),
  ('Amazing cocktails', 'experience', 4),
  ('Fast service', 'service', 5),
  ('Good for dates', 'experience', 6),
  ('Instagram-worthy', 'atmosphere', 7),
  ('Family-friendly', 'experience', 8),
  ('Hidden gem', 'experience', 9),
  ('Live music', 'atmosphere', 10),
  ('Dog-friendly', 'experience', 11),
  ('Late night', 'experience', 12),
  ('Vegan options', 'value', 13),
  ('Quick bites', 'service', 14),
  ('Romantic vibe', 'atmosphere', 15);
```

---

### **Phase 3: Aggregate & Display**

**Business Profile Page:**

```
┌─────────────────────────────────────┐
│  What Qwikker Users Say:             │
│                                      │
│  🔥 95% positive vibes (42 ratings)  │
│                                      │
│  Top mentions:                       │
│  • Great atmosphere (28)             │
│  • Worth the price (19)              │
│  • Friendly staff (15)               │
│                                      │
└─────────────────────────────────────┘
```

**AI Chat Response:**

```
🍕 I found 3 great pizza spots for you:

📍 Primo Wood Fired Pizza
   ⭐ 4.8 (124 Google reviews) • 0.3 miles away
   💚 95% Qwikker users love it
   Users mention: Great atmosphere, Worth the price

   Offer: 2-for-1 pizzas after 9pm
```

**Database Query:**

```sql
-- Aggregate vibes for a business
SELECT 
  COUNT(*) FILTER (WHERE vibe_rating = 'amazing') as amazing_count,
  COUNT(*) FILTER (WHERE vibe_rating = 'good') as good_count,
  COUNT(*) FILTER (WHERE vibe_rating = 'not_for_me') as not_for_me_count,
  ROUND((COUNT(*) FILTER (WHERE vibe_rating IN ('amazing', 'good'))::DECIMAL / COUNT(*)) * 100) as positive_percentage
FROM qwikker_vibes
WHERE business_id = $1;

-- Get top tag mentions
SELECT 
  vt.tag,
  COUNT(*) as mention_count
FROM vibe_tags vt
JOIN qwikker_vibes qv ON vt.vibe_id = qv.id
WHERE qv.business_id = $1
  AND qv.vibe_rating IN ('amazing', 'good')
GROUP BY vt.tag
ORDER BY mention_count DESC
LIMIT 5;
```

---

### **Phase 4: Business Dashboard Analytics**

**Show businesses what users vibe with:**

```
┌──────────────────────────────────────────┐
│  Your Qwikker Vibes (Last 30 Days)       │
│                                           │
│  🔥 32 amazing                            │
│  🙂 15 good                               │
│  😕 2 not for me                         │
│                                           │
│  📊 94% positive vibes                    │
│                                           │
│  🏆 Top 3 Mentions:                       │
│  1. Great atmosphere (18)                 │
│  2. Friendly staff (12)                   │
│  3. Amazing cocktails (10)                │
│                                           │
│  💡 Insight: Customers love your vibe     │
│     but mention slow service. Consider    │
│     highlighting your cocktail menu!      │
│                                           │
└──────────────────────────────────────────┘
```

---

## 🚀 **Monetization Opportunities:**

### **1. Vibe Badge (Premium Feature)**
- Businesses with 20+ positive vibes get a "Qwikker Verified" badge
- Only visible for Starter/Featured/Spotlight tiers
- Free tier gets vibes but no badge display

### **2. Vibe Insights (Analytics)**
- Free tier: Basic vibe count
- Paid tiers: Tag breakdown, trend analysis, comparative insights

### **3. Vibe-Driven Discovery**
- "Show me places with great atmosphere nearby"
- AI can filter by Qwikker Vibes tags (proprietary advantage over Google)

---

## 📊 **Success Metrics:**

### **Launch Targets (4 weeks post-launch):**
- 500+ vibes collected
- 20+ businesses with 10+ vibes each
- 5% vibe submission rate (users who engage → submit vibe)

### **Growth Targets (3 months):**
- 5,000+ vibes collected
- 100+ businesses with 20+ vibes each
- 10% vibe submission rate

---

## 🎯 **Competitive Moat:**

### **Why This Beats Google Reviews:**

| Feature | Google Reviews | Qwikker Vibes |
|---------|----------------|---------------|
| **Friction** | High (write review) | Low (1-2 taps) |
| **Ownership** | Google | Qwikker ✅ |
| **AI-Safe** | Restricted | Fully usable ✅ |
| **Context** | Generic | Wallet-pass triggered ✅ |
| **Actionable** | No | Yes (tag analytics) ✅ |
| **Real-time** | Delayed | Instant ✅ |

### **Strategic Value:**
- **Platform independence** - Not reliant on Google's data/ToS
- **Differentiation** - No other wallet-pass platform has this
- **Engagement loop** - Vibes → Better AI → More engagement
- **Business value** - Actionable insights, not just stars

---

## 🛠️ **Technical Implementation:**

### **Wallet Pass Integration:**

```typescript
// After user taps "Directions" on a business
if (!userHasVibedThisBusiness && userEngagedWithBusiness) {
  // Wait 5 seconds, then show vibe prompt
  setTimeout(() => {
    showVibePrompt(business)
  }, 5000)
}

// Vibe submission
async function submitVibe(businessId: string, vibeRating: 'amazing' | 'good' | 'not_for_me', tags: string[]) {
  const { data, error } = await supabase
    .from('qwikker_vibes')
    .insert({
      business_id: businessId,
      user_id: currentUserId,
      vibe_rating: vibeRating
    })
    .select()
    .single()
  
  if (data && tags.length > 0) {
    await supabase
      .from('vibe_tags')
      .insert(tags.map(tag => ({
        vibe_id: data.id,
        tag
      })))
  }
  
  // Show thank you animation
  showVibeConfirmation()
}
```

### **Chat Integration:**

```typescript
// In hybrid-chat.ts, add vibe data to business context

const vibeData = await supabase
  .from('qwikker_vibes')
  .select('vibe_rating')
  .eq('business_id', businessId)

const positiveVibes = vibeData.filter(v => v.vibe_rating in ('amazing', 'good')).length
const totalVibes = vibeData.length
const positivePercentage = Math.round((positiveVibes / totalVibes) * 100)

// Include in AI prompt:
`${positivePercentage}% of Qwikker users love this place (${totalVibes} vibes)`
```

---

## 🔒 **Privacy & Trust:**

1. **Anonymous by default** - No names shown publicly
2. **One vibe per business** - Can't spam/manipulate
3. **Moderation** - Businesses can't delete vibes (platform integrity)
4. **Opt-in** - Users choose to vibe, never forced

---

## 📅 **Timeline:**

| Phase | Tasks | Duration | Launch Date |
|-------|-------|----------|-------------|
| **Phase 1** | DB schema, UI prompt, basic collection | 1 week | Week 5 post-launch |
| **Phase 2** | Tag selection, aggregation logic | 1 week | Week 6 post-launch |
| **Phase 3** | Display on business pages, chat integration | 1 week | Week 7 post-launch |
| **Phase 4** | Business dashboard analytics | 1 week | Week 8 post-launch |

---

## 🎨 **UI Examples:**

### **Vibe Prompt (Wallet Pass):**
- Appears as bottom sheet after engagement
- Smooth slide-up animation
- Dismissible (not intrusive)
- Fast (< 5 seconds to complete)

### **Vibe Display (Business Page):**
- Compact card below hero image
- "What Qwikker Users Say" section
- Tag cloud with mention counts
- Link to all vibes (future: sortable)

### **Chat Mentions:**
- One-liner: "💚 95% Qwikker users love it"
- Optional: Top 2 tags in brackets
- Non-intrusive, adds social proof

---

**This is Qwikker's moat. Google can't copy this. It's the engagement layer that makes Qwikker indispensable.**
