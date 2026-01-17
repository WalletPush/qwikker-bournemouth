# Atlas HUD Bubble - Ephemeral Spatial Responses

## Overview

Atlas Mode now features an **ephemeral HUD bubble** for AI responses instead of a persistent chat interface. This creates a premium, spatial-first experience where the AI guides briefly, then gets out of the way.

---

## Design Philosophy

### Atlas ≠ Chat

**Atlas Mode is action-first, not conversation-first.**

- User intent: "Take me somewhere / show me / move me"
- AI response: Acknowledge → Confirm → Direct → Vanish
- Focus stays on: pins, routes, proximity, motion

### The "Appears → Guides → Dissolves" Pattern

Inspired by premium spatial UIs (Apple Vision Pro, Tesla navigation, AR HUDs):
1. **Appears:** Floating bubble with glassmorphism
2. **Guides:** 1-2 sentences max, spatial focus
3. **Dissolves:** Auto-dismiss after 4.2s or on user interaction

---

## Implementation

### Components

**1. AtlasHudBubble** (`components/atlas/AtlasHudBubble.tsx`)
- Framer Motion animations
- Glassmorphism styling with subtle glow
- Auto-dismiss with premium dissolve
- "More details" CTA for chat handoff

**2. Atlas AI Prompt** (`lib/ai/prompts/atlas.ts`)
- Strict JSON schema enforcement
- Max 140 characters (hard max 200)
- Spatial language only
- No questions, lists, markdown, or emojis

**3. Atlas Query Endpoint** (`app/api/atlas/query/route.ts`)
- POST `/api/atlas/query`
- Uses same knowledge base search
- Returns `AtlasResponse` with strict structure
- Tier filtering (excludes free_tier automatically)

### Animation Timing (Premium Feel)

```typescript
// Appear
delay: 120ms        // After map begins moving
duration: 260ms
ease: [0.16, 1, 0.3, 1]  // Cubic bezier
motion: fade + rise (y: +10 → 0) + scale (0.98 → 1)

// Auto-dismiss
default: 4200ms     // Standard results
route: 5200ms       // Directions queries
dwell: 900ms        // After map movement ends

// Dismiss
duration: 320ms
ease: easeInOut
motion: opacity (1 → 0) + blur (0 → 6px) + rise (0 → -6) + scale (1 → 0.985)
```

---

## API Contract

### Request (POST `/api/atlas/query`)

```json
{
  "message": "vegan sushi nearby",
  "userLocation": { "lat": 50.7192, "lng": -1.8808 },
  "viewport": null
}
```

### Response (`AtlasResponse`)

```json
{
  "summary": "Found 3 top-rated vegan sushi spots nearby.",
  "businessIds": ["uuid1", "uuid2", "uuid3"],
  "primaryBusinessId": "uuid2",
  "ui": {
    "focus": "pins",
    "autoDismissMs": 4200
  }
}
```

### Fields

- **summary** (string): 1-2 sentences, spatial confirmation
  - ✅ "Found 3 places with vegan sushi nearby."
  - ✅ "Seafood Haven is 8 minutes away."
  - ❌ "I found several great options for you! Let me tell you about..."

- **businessIds** (string[]): Up to 5 business IDs (from KB search)
- **primaryBusinessId** (string?): Best result if clear winner
- **ui.focus** ("pins" | "route"): Map focus mode
- **ui.autoDismissMs** (number): Dismiss timer (default 4200)

---

## UX Behavior

### Bubble Lifecycle

1. **User submits query** → "vegan sushi"
2. **API called** → `/api/atlas/query`
3. **Map animates** → Pins appear, camera moves
4. **120ms delay** → HUD bubble fades in
5. **4.2s dwell** → Bubble remains visible
6. **Auto-dismiss** → Premium dissolve animation

### User Interactions

**Tap/Click Dismiss (X button)**
- Cancels auto-dismiss timer
- Immediate dissolve animation

**Tap "More details"**
- Dismisses bubble
- Returns to chat mode
- Passes state: `lastAtlasQuery`, `lastAtlasBusinessIds`
- Chat can continue conversation with context

**Tap anywhere else on bubble**
- Same as dismiss

---

## State Handoff (Atlas → Chat)

When user clicks "More details", Atlas passes context back to AI Companion:

```typescript
{
  lastAtlasQuery: "vegan sushi",
  lastAtlasBusinessIds: ["uuid1", "uuid2", "uuid3"]
}
```

Chat can then:
- Show menus for those businesses
- Display offers/events
- Provide detailed recommendations
- Continue conversation with spatial context

---

## What Atlas NEVER Does

- ❌ No chat history
- ❌ No long explanations
- ❌ No menus/events
- ❌ No multi-paragraph text
- ❌ No follow-up questions
- ❌ No markdown/formatting

**Those all belong to AI Companion (chat mode).**

---

## Tier Filtering (Critical)

Atlas queries use the **AI-safe view** (`business_profiles_ai_eligible`):

```sql
CREATE VIEW business_profiles_ai_eligible AS
SELECT * FROM business_profiles
WHERE business_tier IN ('qwikker_picks', 'featured', 'free_trial', 'recommended')
  AND visibility = 'ai_enabled';
```

**Result:** `free_tier` businesses physically cannot appear in Atlas, even if DB has bad data.

---

## Files Changed

1. ✅ `components/atlas/AtlasHudBubble.tsx` - HUD bubble component
2. ✅ `lib/ai/prompts/atlas.ts` - AI prompt template + types
3. ✅ `app/api/atlas/query/route.ts` - Query endpoint
4. ✅ `components/atlas/AtlasMode.tsx` - Wired to HUD bubble + query endpoint
5. ✅ `docs/ATLAS_HUD_BUBBLE.md` - This document

---

## Testing

### 1. Test HUD Bubble Appearance
```bash
# Open Atlas, type "vegan sushi"
# Expected:
# - Map animates to results
# - HUD bubble appears after ~120ms
# - Text: max 2 sentences
# - Dismisses after ~4.2s
```

### 2. Test "More Details" CTA
```bash
# In Atlas, search "seafood"
# Click "More details" in HUD bubble
# Expected:
# - Returns to chat mode
# - Chat has context about query
# - Can show menus/offers for those businesses
```

### 3. Test Tier Filtering
```bash
# Verify no free_tier businesses appear
psql $DATABASE_URL -c "
SELECT COUNT(*) FROM business_profiles_ai_eligible
WHERE business_tier = 'free_tier';
"
# Expected: 0
```

### 4. Test Zero Results
```bash
# Search for "dinosaur steakhouse"
# Expected:
# - HUD shows: "No matches nearby. Try a broader search."
# - Dismisses after ~3.5s
```

---

## Commit Message

```
✨ Atlas HUD bubble + ephemeral AI responses

FEATURE: Atlas Mode now uses ephemeral HUD bubbles instead of chat
- Floating glassmorphism bubble with premium dissolve animation
- AI responses are spatial, brief, action-first (max 2 sentences)
- Auto-dismiss after 4.2s with Framer Motion animations
- "More details" CTA passes state back to chat for depth

IMPLEMENTATION:
- New AtlasHudBubble component (Framer Motion)
- Atlas AI prompt template (strict JSON contract)
- /api/atlas/query endpoint (spatial responses only)
- Timing: 120ms delay, 260ms appear, 320ms dissolve
- Uses business_profiles_ai_eligible (no free_tier leakage)

UX IMPROVEMENTS:
- Atlas feels premium and "alive"
- Focus stays on map (no chat clutter)
- Seamless handoff to chat for details/menus/offers
- Tier filtering enforced at DB view layer

Files:
- components/atlas/AtlasHudBubble.tsx
- lib/ai/prompts/atlas.ts
- app/api/atlas/query/route.ts
- components/atlas/AtlasMode.tsx
- docs/ATLAS_HUD_BUBBLE.md
```

Branch: `atlas-prototype`  
Status: ✅ Ready for testing
