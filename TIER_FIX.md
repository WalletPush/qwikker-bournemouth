# CRITICAL FIX: Tier/Branding Issue

## THE PROBLEM (LEGAL/TRUST RISK):
1. AI says "These are Qwikker Picks for a reason!" when businesses AREN'T all Picks
2. Featured businesses can appear above Spotlight
3. No tier callouts in AI descriptions

## WHERE THE ISSUE IS:

**File:** `lib/ai/chat.ts`

**Lines 1006-1014:** Sorting exists but is INCOMPLETE
- Missing "spotlight" tier in priority
- Not checking if all are picks before AI closing copy

## THE FIX:

### 1. Update Tier Priority (line 1007-1012):
```typescript
const tierPriority = {
  'spotlight': 0,        // ADD THIS - highest paid tier
  'qwikker_picks': 1,    // Editorial picks
  'featured': 2,         // Paid featured
  'recommended': 3,
  'free_trial': 4
}
```

### 2. Add Closing Copy Logic (after line 1016):
```typescript
// Determine if all businesses are Qwikker Picks
const allAreQwikkerPicks = businessCarousel.every(b => b.business_tier === 'qwikker_picks')

// Add tier context to system prompt
let tierGuidance = ''
if (businessCarousel.length > 0) {
  if (allAreQwikkerPicks) {
    tierGuidance = '\n- CLOSING: End with "These are Qwikker Picks for a reason!"'
  } else {
    tierGuidance = '\n- CLOSING: Use neutral ending like "Want to see these on Atlas or check their offers?"'
  }
  tierGuidance += '\n- NEVER call a business a "Qwikker Pick" unless its tier is qwikker_picks'
  tierGuidance += '\n- NEVER invent or guess tier/priority information'
}
```

### 3. Add Tier Callouts to Descriptions:
In the system prompt (around line 475-500), add:
```
When describing businesses:
- If tier is "spotlight": mention "(Spotlight Partner)" 
- If tier is "qwikker_picks": mention "(Qwikker Pick - curated by us)"
- If tier is "featured": mention "(Featured Partner)"
- Never add tier labels for free_trial or standard
```

## ACCEPTANCE TESTS:
1. ✅ Query "find restaurants" → if mixed tiers, NO "Qwikker Picks" closing
2. ✅ Spotlight businesses ALWAYS appear first
3. ✅ AI NEVER calls non-Pick businesses "Picks"
4. ✅ Tier callouts match actual database tiers

---

# NEXT: Tell me Atlas console logs and I'll fix that too!
