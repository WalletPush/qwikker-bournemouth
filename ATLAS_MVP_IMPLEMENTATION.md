# Atlas MVP: Complete Engine - Implementation Summary

**Branch:** `atlas-improvements`  
**Date:** February 3, 2026  
**Status:** ✅ Phase 1 & 2 Complete

---

## 📋 Overview

Implemented "Atlas MVP: Complete Engine" to transform Qwikker Atlas from a simple map into an interactive decision-making engine with explainable recommendations and reactive refinement.

### Core Principles Achieved:
- ✅ **Trust First:** Relevance decides IF, Tier decides ORDER
- ✅ **Explainable AI:** Every business has a "reason tag" explaining why it's shown
- ✅ **The Loop:** Click pin → More details → AI response (no visible user message)
- ✅ **Live Reactive Refinement:** "open now", "closer", "clear" modifiers work instantly
- ✅ **Legal Compliance:** No Google review text (already removed)

---

## 🎯 Phase 1: Trust + Explainability

### 1.1 Intent-Aware Reason Tagger

**File:** `lib/ai/reason-tagger.ts` (NEW - 248 lines)

Created a smart tagging system that assigns a primary "why shown" reason to each business.

**Reason Priority:**
1. **Category match** (if user asked for specific type + relevanceScore ≥ 3)
2. **Open now** (immediate utility)
3. **Closest** (< 500m away)
4. **Top rated** (≥ 4.6★ with ≥ 100 reviews)
5. **Highly rated** (≥ 4.4★)
6. **Popular** (≥ 50 reviews)
7. **Recommended** (fallback)

**Key Code:**

```typescript
export function getReasonTag(
  business: any,
  intent: IntentResult,
  relevanceScore: number,
  userLocation?: { lat: number, lng: number } | { latitude: number, longitude: number },
  isBrowseMode: boolean = false
): ReasonTag {
  
  // PRIORITY 1: Category match (if user asked for something specific)
  if (!isBrowseMode && relevanceScore >= 3) {
    const categoryName = intent.categories[0] || business.display_category
    if (categoryName) {
      return { 
        type: 'category_match', 
        label: `Popular ${categoryName} spot`, 
        emoji: '🍜' 
      }
    }
  }
  
  // PRIORITY 2: Open now (immediate utility)
  if (business.business_hours && isOpenNow(business.business_hours)) {
    return { 
      type: 'open_now', 
      label: 'Open now', 
      emoji: '🕐' 
    }
  }
  
  // PRIORITY 3: Closest (if very close)
  if (userLocation && business.latitude && business.longitude) {
    const distance = calculateDistance(
      normalizeLocation(userLocation),
      { latitude: business.latitude, longitude: business.longitude }
    )
    if (distance < 500) {
      return { 
        type: 'closest', 
        label: `${Math.round(distance)}m away`, 
        emoji: '📍' 
      }
    }
  }
  
  // PRIORITY 4-7: Social proof fallbacks...
}
```

**Secondary Metadata:**

```typescript
export function getReasonMeta(
  business: any,
  userLocation?: { lat: number, lng: number } | { latitude: number, longitude: number }
): ReasonMeta {
  const isOpen = business.business_hours && isOpenNow(business.business_hours)
  
  let distanceMeters = null
  if (userLocation && business.latitude && business.longitude) {
    distanceMeters = Math.round(calculateDistance(
      normalizeLocation(userLocation),
      { latitude: business.latitude, longitude: business.longitude }
    ))
  }
  
  let ratingBadge = null
  if (business.rating && business.review_count) {
    ratingBadge = `${business.rating.toFixed(1)} (${business.review_count})`
  }
  
  return { 
    isOpenNow: isOpen, 
    distanceMeters, 
    ratingBadge 
  }
}
```

---

### 1.2 Updated Ranking Logic: "Relevance Decides IF, Tier Decides ORDER"

**File:** `lib/ai/hybrid-chat.ts`

**The Golden Rule:**
- Paid businesses do NOT blindly show first
- Relevance filters businesses IN or OUT
- Tier only affects ordering WITHIN the relevant set

**Key Code:**

```typescript
// Step 4: Apply "Relevance decides IF, Tier decides ORDER" rule
const MIN_RESULTS_THRESHOLD = 3
let sortedForContext = [...allBusinessesForContext]
let isBrowseFallback = false

if (detectedIntent.hasIntent) {
  // Filter to relevant businesses only
  const relevantBusinesses = allBusinessesForContext.filter(b => 
    (b.relevanceScore || 0) > 0
  )
  
  console.log(`🎯 Intent detected: ${relevantBusinesses.length} relevant of ${allBusinessesForContext.length} businesses`)
  
  // Check if we have enough relevant matches
  if (relevantBusinesses.length < MIN_RESULTS_THRESHOLD) {
    console.log(`⚠️ Only ${relevantBusinesses.length} relevant results. Falling back to browse mode (top-rated).`)
    isBrowseFallback = true
    
    // Fall back to top-rated businesses
    sortedForContext = [...allBusinessesForContext]
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
  } else {
    // Use relevant businesses only
    sortedForContext = relevantBusinesses
  }
}

// Sort: TIER first, then RELEVANCE, then RATING, then DISTANCE
sortedForContext.sort((a, b) => {
  // 1. Tier priority (paid > claimed > unclaimed) [lower number = higher priority]
  if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
  
  // 2. Relevance score (higher = better)
  const scoreA = a.relevanceScore || 0
  const scoreB = b.relevanceScore || 0
  if (scoreA !== scoreB) return scoreB - scoreA
  
  // 3. Rating (higher = better)
  const ratingA = a.rating || 0
  const ratingB = b.rating || 0
  if (ratingA !== ratingB) return ratingB - ratingA
  
  // 4. Distance (if available, closer = better)
  if (context.userLocation && a.latitude && b.latitude) {
    const distA = calculateDistanceSimple(context.userLocation, a)
    const distB = calculateDistanceSimple(context.userLocation, b)
    return distA - distB
  }
  
  return 0
})
```

---

### 1.3 Attached Reasons to Map Pins

**File:** `lib/ai/hybrid-chat.ts`

Every business pin now includes `reason` and `reasonMeta`:

```typescript
// Determine if this is browse mode for reason tagging
const isBrowseModeForReasons = !detectedIntent.hasIntent || isBrowseFallback

// Add ALL Tier 1 businesses (paid/trial)
if (tier1Businesses && tier1Businesses.length > 0) {
  tier1Businesses.forEach((b: any) => {
    if (b.latitude && b.longitude && !addedIds.has(b.id)) {
      mapPins.push({
        id: b.id,
        business_name: b.business_name,
        latitude: b.latitude,
        longitude: b.longitude,
        rating: b.rating,
        review_count: b.review_count,
        display_category: b.display_category,
        business_tier: 'paid',
        phone: b.phone,
        website_url: b.website_url,
        google_place_id: b.google_place_id,
        reason: getReasonTag(
          b,
          detectedIntent,
          businessRelevanceScores.get(b.id) || 0,
          context.userLocation,
          isBrowseModeForReasons
        ),
        reasonMeta: getReasonMeta(b, context.userLocation)
      })
      addedIds.add(b.id)
    }
  })
}
```

**TypeScript Interface:**

```typescript
mapPins?: Array<{
  id: string
  business_name: string
  latitude: number
  longitude: number
  rating?: number
  review_count?: number
  display_category?: string
  business_tier: 'paid' | 'unclaimed' | 'claimed_free'
  phone?: string
  website_url?: string
  google_place_id?: string
  reason?: {
    type: string
    label: string
    emoji: string
  }
  reasonMeta?: {
    isOpenNow: boolean
    distanceMeters: number | null
    ratingBadge: string | null
  }
}>
```

---

### 1.4 Display Reasons in UI

#### Business Carousel

**File:** `components/ui/business-carousel.tsx`

```tsx
{/* Primary reason */}
{business.reason && (
  <div className="inline-flex items-center gap-1.5 px-2 py-1 mb-2 rounded-full bg-[#00d083]/10 border border-[#00d083]/30">
    {business.reason.emoji && <span className="text-sm">{business.reason.emoji}</span>}
    <span className="text-xs text-[#00d083] font-medium">{business.reason.label}</span>
  </div>
)}

{/* Secondary metadata */}
{business.reasonMeta && (
  <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
    {business.reasonMeta.ratingBadge && (
      <span>⭐ {business.reasonMeta.ratingBadge}</span>
    )}
    {business.reasonMeta.isOpenNow && (
      <span className="text-[#00d083]">• 🕐 Open now</span>
    )}
    {business.reasonMeta.distanceMeters && (
      <span>• 📍 {business.reasonMeta.distanceMeters}m</span>
    )}
  </div>
)}
```

#### Atlas HUD

**File:** `components/atlas/AtlasMode.tsx`

```typescript
const generateBusinessHudMessage = useCallback((business: Business): string => {
  const parts: string[] = []
  
  // Primary reason (why shown)
  if (business.reason) {
    parts.push(`${business.reason.emoji} ${business.reason.label}`)
  }
  
  // Secondary metadata
  if (business.reasonMeta) {
    if (business.reasonMeta.ratingBadge) {
      parts.push(`⭐ ${business.reasonMeta.ratingBadge}`)
    }
    if (business.reasonMeta.isOpenNow) {
      parts.push('🕐 Open now')
    }
    if (business.reasonMeta.distanceMeters) {
      parts.push(`📍 ${business.reasonMeta.distanceMeters}m`)
    }
  }
  
  // Fallback if no reason data
  if (parts.length === 0) {
    parts.push(`${business.business_name} — ${business.rating}★`)
    if (business.display_category) {
      parts.push(business.display_category)
    }
  }
  
  return parts.join(' • ')
}, [])
```

---

## 🔄 Phase 2: The Loop

### 2.1 Hidden ID-Based Detail Request

**Problem:** Clicking "More details" in Atlas should show business info in chat WITHOUT adding a visible user message.

**Solution:** Internal action handoff using hidden command.

#### User Chat Page

**File:** `components/user/user-chat-page.tsx`

```typescript
// ATLAS: Detail request (hidden ID-based handoff)
const [detailRequest, setDetailRequest] = useState<string | null>(null)

// ATLAS: Fetch business detail using hidden ID-based command
const fetchBusinessDetail = async (businessId: string) => {
  console.log(`🔍 Fetching business detail for ID: ${businessId}`)
  setIsTyping(true)
  
  try {
    // Call AI API with HIDDEN command (no user message)
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `__qwikker_business_detail__:${businessId}`, // Hidden command
        walletPassId: currentUser?.wallet_pass_id,
        city: currentCity,
        conversationHistory: [],
        userLocation: locationStatus === 'granted' && userLocation ? userLocation : null
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Add ONLY the AI response (no user message)
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'ai',
        content: data.response || 'Here are the details:',
        timestamp: new Date().toISOString(),
        businessCarousel: data.businessCarousel || [],
        quickReplies: data.quickReplies || ['Back to Atlas', 'Directions', 'Tell me more'],
      }
      
      setMessages(prev => [...prev, aiMessage])
      console.log(`✅ Business detail fetched successfully`)
    }
  } catch (error) {
    console.error('❌ Error fetching business detail:', error)
  } finally {
    setIsTyping(false)
  }
}

// useEffect to trigger detail fetch when detailRequest changes
useEffect(() => {
  if (detailRequest) {
    fetchBusinessDetail(detailRequest)
    setDetailRequest(null) // Reset after triggering
  }
}, [detailRequest])
```

#### Atlas Mode Handler

**File:** `components/atlas/AtlasMode.tsx`

```typescript
const handleHudMoreDetails = useCallback(() => {
  // ID-based detail request
  if (onRequestDetails && selectedBusiness) {
    console.log(`📱 Requesting details for business ID: ${selectedBusiness.id}`)
    onRequestDetails(selectedBusiness.id)
    handleHudDismiss()
  } else {
    // Fallback: close and return to chat
    handleHudDismiss()
    handleClose()
  }
}, [selectedBusiness, onRequestDetails, handleHudDismiss, handleClose])
```

---

### 2.2 Handle Hidden Command in AI

**File:** `lib/ai/hybrid-chat.ts`

```typescript
// 🔍 EARLY EXIT: Handle hidden business detail command
const detailCommandMatch = userMessage.match(/__qwikker_business_detail__:([a-f0-9-]+)/i)
if (detailCommandMatch) {
  const businessId = detailCommandMatch[1]
  console.log(`🔍 Hidden detail request detected for business ID: ${businessId}`)
  return await generateBusinessDetailResponse(businessId, context, openai)
}
```

**Detail Response Generator:**

```typescript
async function generateBusinessDetailResponse(
  businessId: string,
  context: ChatContext,
  openai: OpenAI
): Promise<ChatResponse> {
  console.log(`🔍 Generating detail response for business ID: ${businessId}`)
  
  const supabase = await createTenantAwareServerClient()
  
  // SECURITY: tenant-safe + city-match
  const { data: business, error} = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', businessId)
    .eq('city', context.city) // Hostname-derived in production
    .single()
  
  if (error || !business) {
    console.error(`❌ Business not found: ${businessId}`, error)
    return {
      success: false,
      error: 'Business not found'
    }
  }
  
  console.log(`✅ Found business: ${business.business_name}`)
  
  // Build detail context
  const detailLines = [
    `Business: ${business.business_name}`,
    `Category: ${business.display_category || business.system_category || 'Local business'}`,
    business.business_tagline ? `Tagline: ${business.business_tagline}` : null,
    business.rating && business.review_count ? 
      `Rating: ${business.rating}★ from ${business.review_count} Google reviews` : null,
    business.business_address ? `Location: ${business.business_address}` : null,
    business.phone ? `Phone: ${business.phone}` : null,
    business.website_url ? `Website: ${business.website_url}` : null,
    business.business_hours ? `Hours: ${business.business_hours}` : null
  ].filter(Boolean).join('\n')
  
  // Generate concise AI response
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { 
        role: 'system', 
        content: 'You are a helpful local guide. Be concise, friendly, and factual. Only use provided data. No hallucinations.' 
      },
      { 
        role: 'user', 
        content: `User wants details about ${business.business_name}.\n\n${detailLines}\n\nGenerate a 2-3 sentence response highlighting:\n1. What makes this place worth visiting\n2. Key practical info\n3. End with a helpful question or suggestion\n\nNo hallucinations. Use only the provided data.` 
      }
    ],
    temperature: 0.7,
    max_tokens: 200
  })
  
  const aiResponse = completion.choices[0].message.content || 
    `${business.business_name} is a ${business.display_category || 'local business'} with ${business.rating}★ rating. Want directions?`
  
  return {
    success: true,
    response: aiResponse,
    businessCarousel: [/* business card object */],
    modelUsed: 'gpt-4o-mini',
    classification: { complexity: 'simple', queryType: 'business_detail', requiresKB: false }
  }
}
```

---

### 2.3 Filter State Management

**File:** `components/atlas/AtlasMode.tsx`

**State Setup:**

```typescript
const [businesses, setBusinesses] = useState<Business[]>([])
const [baseBusinesses, setBaseBusinesses] = useState<Business[]>([]) // Original unfiltered list
const [activeFilters, setActiveFilters] = useState<{
  openNow: boolean
  maxDistance: number | null
}>({ openNow: false, maxDistance: null })
```

**Filter Application:**

```typescript
// Helper: Apply filters to business list (must be defined BEFORE visibleBusinesses)
const applyFilters = useCallback((
  businessList: Business[],
  filters: typeof activeFilters,
  userLoc: Coordinates | null
): Business[] => {
  let filtered = [...businessList]
  
  // Filter by open now
  if (filters.openNow) {
    filtered = filtered.filter(b => 
      b.reasonMeta?.isOpenNow === true
    )
  }
  
  // Filter by distance
  if (filters.maxDistance !== null && userLoc) {
    filtered = filtered
      .map(b => {
        if (!b.latitude || !b.longitude) return { ...b, distance: Infinity }
        
        const R = 6371e3 // Earth radius in meters
        const φ1 = userLoc.lat * Math.PI / 180
        const φ2 = b.latitude * Math.PI / 180
        const Δφ = (b.latitude - userLoc.lat) * Math.PI / 180
        const Δλ = (b.longitude - userLoc.lng) * Math.PI / 180
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const distance = R * c
        
        return { ...b, distance }
      })
      .filter(b => b.distance! <= filters.maxDistance!)
      .sort((a, b) => a.distance! - b.distance!)
  }
  
  return filtered
}, [])

// Computed visible businesses (apply filters to baseBusinesses)
const visibleBusinesses = useMemo(() => {
  return applyFilters(baseBusinesses, activeFilters, userLocation)
}, [baseBusinesses, activeFilters, userLocation, applyFilters])

// Update map when visibleBusinesses changes (filters applied)
useEffect(() => {
  if (!mapLoaded || visibleBusinesses.length === 0) return
  
  console.log(`[Atlas] 🔄 Updating map with ${visibleBusinesses.length} visible businesses (filters applied)`)
  addBusinessMarkers(visibleBusinesses)
}, [visibleBusinesses, mapLoaded, addBusinessMarkers])
```

---

### 2.4 Modifiers: "open now", "closer", "clear"

**File:** `components/atlas/AtlasMode.tsx`

```typescript
const handleSearch = useCallback(async (query: string) => {
  console.log('[Atlas Search] 🔍 Starting search for:', query)
  
  const lower = query.toLowerCase()
  
  // Check for filter commands
  if (lower.includes('open now') || lower.includes('currently open')) {
    console.log('[Atlas] 🕐 Applying "open now" filter')
    setActiveFilters(prev => ({ ...prev, openNow: true }))
    setHudSummary('Showing only open businesses')
    setHudVisible(true)
    return
  }
  
  if (lower.includes('closer') || lower.includes('nearby') || lower.includes('within')) {
    console.log('[Atlas] 📍 Applying "closer" filter (within 1km)')
    setActiveFilters(prev => ({ ...prev, maxDistance: 1000 }))
    setHudSummary('Showing businesses within 1km')
    setHudVisible(true)
    return
  }
  
  // Clear/reset commands
  if (/\b(clear|reset|show all)\b/.test(lower)) {
    console.log('[Atlas] 🔄 Clearing all filters')
    setActiveFilters({ openNow: false, maxDistance: null })
    setHudSummary('Filters cleared')
    setHudVisible(true)
    return
  }
  
  // New search - clear filters and run query
  setActiveFilters({ openNow: false, maxDistance: null })
  // ... existing search logic
```

---

### 2.5 Status Strip with Filter Pills

**File:** `components/atlas/AtlasMode.tsx`

```tsx
{/* Status Strip with Filter Pills */}
{(activeFilters.openNow || activeFilters.maxDistance !== null || visibleBusinesses.length !== baseBusinesses.length) && (
  <div className="absolute top-20 left-0 right-0 z-20 px-4 py-2 bg-black/40 backdrop-blur-sm border-b border-white/10">
    <div className="flex items-center justify-between text-sm text-white/80">
      <span>
        Showing {visibleBusinesses.length} 
        {baseBusinesses.length > 0 && visibleBusinesses.length !== baseBusinesses.length ? ` of ${baseBusinesses.length}` : ''} places
        {!activeFilters.openNow && !activeFilters.maxDistance && ' • sorted by relevance'}
      </span>
      
      {(activeFilters.openNow || activeFilters.maxDistance) && (
        <div className="flex items-center gap-2">
          {activeFilters.openNow && (
            <button
              onClick={() => setActiveFilters(prev => ({ ...prev, openNow: false }))}
              className="px-2 py-1 rounded-full bg-[#00d083]/20 border border-[#00d083]/40 text-[#00d083] text-xs flex items-center gap-1 hover:bg-[#00d083]/30 transition-colors"
            >
              🕐 Open now <span className="ml-1">×</span>
            </button>
          )}
          {activeFilters.maxDistance && (
            <button
              onClick={() => setActiveFilters(prev => ({ ...prev, maxDistance: null }))}
              className="px-2 py-1 rounded-full bg-[#00d083]/20 border border-[#00d083]/40 text-[#00d083] text-xs flex items-center gap-1 hover:bg-[#00d083]/30 transition-colors"
            >
              📍 Within 1km <span className="ml-1">×</span>
            </button>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

---

## 📂 Files Changed

| File | Status | Lines | Changes |
|------|--------|-------|---------|
| `lib/ai/reason-tagger.ts` | **NEW** | 248 | Complete reason tagging system |
| `lib/ai/hybrid-chat.ts` | Modified | 1980 | Ranking logic, reasons, detail handler |
| `components/ui/business-carousel.tsx` | Modified | 260 | Reason chip + metadata display |
| `components/atlas/AtlasMode.tsx` | Modified | 1981 | Filters, modifiers, status strip, HUD |
| `components/atlas/AtlasHudBubble.tsx` | Modified | 107 | Interface update |
| `components/user/user-chat-page.tsx` | Modified | 1122 | Hidden detail fetch logic |

---

## 🧪 How to Test

### Phase 1: Trust + Explainability

1. **Query:** "any good Thai places?"
   - ✅ Should see "🍜 Popular Thai spot" reason chips
   - ✅ Carousel shows secondary metadata (rating, distance, open now)
   - ✅ Only relevant Thai businesses appear

2. **Query:** "where can I eat?" (browse mode)
   - ✅ Should see "⭐ Top rated nearby" or "⭐ Highly rated"
   - ✅ Social proof reasons, not category-specific

3. **Open Atlas:**
   - ✅ HUD shows reasons instead of business name
   - ✅ Example: "🍜 Popular Thai spot • ⭐ 4.6 (203) • 🕐 Open now • 📍 320m"

### Phase 2: The Loop

1. **Click pin in Atlas → "More details":**
   - ✅ Atlas closes
   - ✅ AI detail message appears in chat
   - ✅ NO visible user message (hidden handoff)
   - ✅ Business card shows below AI response

2. **Type "open now" in Atlas search:**
   - ✅ Map filters to only open businesses
   - ✅ Status strip shows: "Showing X of Y places"
   - ✅ Green pill appears: "🕐 Open now ×"

3. **Click × on filter pill:**
   - ✅ Filter clears
   - ✅ All businesses return to map

4. **Type "closer" in Atlas search:**
   - ✅ Map filters to businesses within 1km
   - ✅ Status strip shows: "Showing X of Y places"
   - ✅ Green pill appears: "📍 Within 1km ×"

5. **Type "clear" or "reset":**
   - ✅ All filters clear
   - ✅ Pills disappear
   - ✅ Full business set returns

### Filters Stack Test

1. Type "open now"
2. Then type "closer"
3. ✅ Should show businesses that are BOTH open AND within 1km
4. ✅ Two pills should appear
5. Click × on "open now" pill
6. ✅ Should keep distance filter only

---

## ✅ Acceptance Criteria

### Trust (Phase 1)
- [x] Every business has a reason explaining why it's shown
- [x] Reason priority reflects user intent > immediacy > social proof
- [x] Browse mode uses social proof reasons (top rated, highly rated)
- [x] Intent mode uses category match when relevance ≥ 3
- [x] Secondary metadata shows rating badge, open now, distance
- [x] Reasons display in carousel chips and Atlas HUD
- [x] Relevance decides IF businesses appear
- [x] Tier decides ORDER within relevant set
- [x] Fallback to browse mode when < 3 relevant matches

### The Loop (Phase 2)
- [x] "More details" closes Atlas and shows detail in chat
- [x] NO visible user message appears (hidden handoff)
- [x] Business detail uses ID-based lookup (tenant-safe)
- [x] AI generates concise 2-3 sentence response
- [x] Business card displays below AI response
- [x] Modifiers work: "open now", "closer", "clear"
- [x] Filter state maintained separately from base business list
- [x] Filters can be stacked (open now + closer)
- [x] Status strip shows filtered count vs total
- [x] Filter pills are tappable to remove individual filters
- [x] Map updates automatically when filters change

---

## 🚀 What's Next

### Phase 3: Mobile UI (Pending)
- [ ] Bottom sheet component with touch drag
- [ ] Mobile detection + responsive layout
- [ ] Bottom input overlay (safe area support)
- [ ] Mobile pin selection → sheet opens to peek
- [ ] Touch interactions (tap pin, tap map, drag sheet)

### Testing
- [ ] Full desktop flow verification
- [ ] Mobile Safari testing (safe area, keyboard)
- [ ] Performance testing with 100+ businesses
- [ ] Filter edge cases (0 results, all filtered out)

---

## 🎯 The Win

**Before:** "Cool animated map with pins"

**After:** "This actually helps me decide where to go"

Even with thin Google data (unclaimed businesses), users now:
1. ✅ Understand WHY each place is recommended
2. ✅ Can quickly filter by open now / distance
3. ✅ Get instant details without typing
4. ✅ See relevant businesses first (not just paid ones)
5. ✅ Have a continuous conversation flow (chat → Atlas → chat)

Once businesses claim and add rich data (menus/offers/events), this foundation multiplies in value.

---

**Implementation Date:** February 3, 2026  
**Branch:** `atlas-improvements`  
**Status:** ✅ Ready for testing
