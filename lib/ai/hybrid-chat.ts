/**
 * Hybrid AI Chat System
 * Routes queries to GPT-4o-mini (cheap) or GPT-4o (smart) based on complexity
 */

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { classifyQueryIntent, logClassification } from './intent-classifier'
import { detectIntent } from './intent-detector'
import { scoreBusinessRelevance } from './relevance-scorer'
import { getReasonTag, getReasonMeta } from './reason-tagger'
import { 
  ConversationState, 
  createInitialState, 
  updateConversationState, 
  generateStateContext 
} from './conversation-state'
import { createTenantAwareServerClient } from '@/lib/utils/tenant-security'
import { isFreeTier, isAiEligibleTier, getTierPriority } from '@/lib/atlas/eligibility'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import { normalizeLocation, calculateDistance, isValidUUID } from '@/lib/utils/location'
import { getBusinessVibeStats } from '@/lib/utils/vibes'

// DO NOT instantiate OpenAI globally - must be per-franchise to use their API key
// Each franchise pays for their own AI usage via franchise_crm_configs.openai_api_key

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  city: string
  userName?: string
  walletPassId?: string
  userLocation?: {
    latitude: number
    longitude: number
  }
}

interface ChatResponse {
  success: boolean
  response?: string
  sources?: any[]
  error?: string
  modelUsed?: 'gpt-4o-mini' | 'gpt-4o'
  classification?: any
  uiMode?: 'conversational' | 'suggestions' | 'map' // Explicit UI mode for carousel gating
  hasBusinessResults?: boolean // For Atlas "earned moment" without carousel spam
  businessCarousel?: Array<{
    id: string
    business_name: string
    business_tagline?: string
    system_category?: string // Stable enum for filtering
    display_category?: string // User-friendly label
    business_tier: string // ✅ effective_tier from subscription-based view (spotlight, featured, starter)
    tier_priority?: number // ✅ Sort priority from view (1=spotlight, 2=featured/trial, 3=starter)
    vibes_positive_percentage?: number // 💚 Qwikker Vibes (only if 5+ vibes)
    vibes_total?: number // 💚 Total vibes count
    business_address?: string
    business_town?: string
    logo?: string
    business_images?: string[]
    rating?: number
    review_count?: number // ✅ ATLAS: For review count display
    offers_count?: number
    latitude?: number // ✅ ATLAS: For map pins
    longitude?: number // ✅ ATLAS: For map pins
    phone?: string // ✅ ATLAS: For contact info
    website_url?: string // ✅ ATLAS: For website link
    google_place_id?: string // ✅ ATLAS: For Google reviews link
  }>
  walletActions?: Array<{
    type: 'add_to_wallet'
    offerId: string
    offerName: string
    offerDescription: string | null
    offerType: string | null
    offerValue: string
    offerTerms: string | null
    offerStartDate: string | null
    offerEndDate: string | null
    offerImage: string | null
    businessName: string
    businessId: string
  }>
  eventCards?: Array<{
    id: string
    title: string
    description: string
    event_type: string
    start_date: string
    start_time?: string
    end_date?: string
    end_time?: string
    location: string
    ticket_url?: string
    image_url?: string
    business_name: string
    business_id: string
  }>
  googleReviewSnippets?: {
    businessName: string
    businessId: string
    google_place_id?: string
    snippets: Array<{
      text: string
      author: string
      rating: number
    }>
  }
  mapPins?: Array<{
    // ✅ ATLAS: ALL businesses for map (paid + unclaimed + claimed_free)
    id: string
    business_name: string
    latitude: number
    longitude: number
    rating?: number
    review_count?: number
    display_category?: string
    business_tier: 'paid' | 'unclaimed' | 'claimed_free' // For pin coloring
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
  queryCategories?: string[] // ✅ ATLAS: Categories detected in query (for filtering businesses)
  queryKeywords?: string[] // ✅ ATLAS: Keywords detected in query (for filtering businesses)
}

/**
 * Generate AI response using hybrid model selection
 */
export async function generateHybridAIResponse(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = [],
  conversationState?: ConversationState
): Promise<ChatResponse> {
  
  try {
    const { city, userName = 'there' } = context
    
    // ✅ SHIP-SAFE: Assert city is provided (prevent silent tenant leaks)
    if (!city || city === 'unknown') {
      console.error('❌ CRITICAL: No city provided to generateHybridAIResponse')
      if (process.env.NODE_ENV === 'development') {
        throw new Error('City is required for AI chat')
      }
      return {
        success: false,
        error: 'City configuration missing. Please contact support.'
      }
    }
    
    // 🔑 Get franchise-specific OpenAI API key
    const franchiseKeys = await getFranchiseApiKeys(city)
    
    if (!franchiseKeys.openai_api_key) {
      console.error(`❌ No OpenAI API key configured for ${city}`)
      return {
        success: false,
        error: 'AI service not configured for this city. Please contact support.'
      }
    }
    
    // Create OpenAI client with franchise's API key (they pay for usage)
    const openai = new OpenAI({
      apiKey: franchiseKeys.openai_api_key,
    })
    
  // 🔍 EARLY EXIT: Handle hidden business detail command
  // ✅ SAFETY: Only match if entire message is exactly the command (prevent accidental triggers)
  const detailCommandMatch = userMessage.trim().match(/^__qwikker_business_detail__:(\S+)$/)
  if (detailCommandMatch) {
    const businessId = detailCommandMatch[1]
    
    // ✅ SHIP-SAFE: Validate UUID format before querying
    if (!isValidUUID(businessId)) {
      console.warn(`⚠️ Invalid business ID format: ${businessId}`)
      return {
        success: false,
        error: 'Invalid business identifier',
        response: 'Sorry, I couldn\'t find that business. Please try again.'
      }
    }
    
    console.log(`🔍 Hidden detail request detected for business ID: ${businessId}`)
    // ✅ CONTEXT: Pass conversation history for smarter detail responses
    return await generateBusinessDetailResponse(businessId, context, openai, conversationHistory)
  }
    
    // Initialize or use existing conversation state
    let state = conversationState || createInitialState()
    
    // 🎯 STEP 1: Classify query complexity
    const classification = classifyQueryIntent(userMessage, conversationHistory)
    const modelToUse = classification.complexity === 'complex' ? 'gpt-4o' : 'gpt-4o-mini'
    
    logClassification(userMessage, classification, modelToUse)
    
    // 🔒 KB AUTHORITY GATE: Distinguish HARD queries from MIXED queries
    // HARD queries (pure offers/events) → DB-only, no KB
    // MIXED queries (discovery + offers) → KB for discovery, DB for filtering
    const lowerMessage = userMessage.toLowerCase()
    
    // Detect if offers/events are mentioned
    const isOfferQuery = /\b(offers?|deals?|discounts?|promos?|specials?)\b/i.test(lowerMessage) ||
                         /\b(show|list|all|any|get|find|see|tell me).*(deals?|offers?)\b/i.test(lowerMessage)
    // Match "shows" (noun) but NOT "show" (verb) to avoid false positives like "show me restaurants"
    const isEventQuery = /\b(events?|shows|concerts?|gigs?|happening|what'?s on|things to do)\b/i.test(lowerMessage) && 
                         !/\b(show me|show all|showing)\b/i.test(lowerMessage)
    
    // 🎯 CRITICAL FIX: Distinguish HARD queries (DB-only) from MIXED queries (KB + DB)
    // HARD = pure offer/event query (e.g., "show me offers", "current deals")
    // MIXED = discovery with constraints (e.g., "restaurants with offers", "family friendly with deals")
    const isMixedQuery = /(with|that has|which has|anywhere|places|restaurants?|bars?|cafes?|family|kids?|cheap|good|best)/i.test(userMessage)
    
    const isHardOfferQuery = isOfferQuery && !isMixedQuery
    const isHardEventQuery = isEventQuery && !isMixedQuery
    
    const isKbDisabled = isHardOfferQuery || isHardEventQuery
    const intent = isOfferQuery ? 'offers' : (isEventQuery ? 'events' : 'general')
    
    console.log(`🔍 KB GATE CHECK: query="${userMessage}"`)
    console.log(`  isOfferQuery=${isOfferQuery}, isEventQuery=${isEventQuery}`)
    console.log(`  isMixedQuery=${isMixedQuery} (discovery with constraints)`)
    console.log(`  isHardOfferQuery=${isHardOfferQuery} (pure offers, no discovery)`)
    console.log(`  isKbDisabled=${isKbDisabled}, intent="${intent}"`)
    
    if (isKbDisabled) {
      console.log(`🚫 KB search DISABLED: HARD ${intent} query (DB-authoritative only)`)
    } else if (isOfferQuery || isEventQuery) {
      console.log(`✅ KB search ENABLED: MIXED query (discovery with ${intent} constraint)`)
    } else {
      console.log(`✅ KB search ENABLED: General discovery query`)
    }
    
    // 🎯 STEP 2: Search knowledge base with context-aware query expansion
    // ❗ SKIP ENTIRELY if intent requires DB authority (offers, events)
    const searchLimit = userMessage.toLowerCase().includes('list all') ? 30 : 12
    
    let businessResults = { success: true, results: [] as any[] }
    let cityResults = { success: true, results: [] as any[] }
    
    if (!isKbDisabled) {
      // If user uses pronouns (their, they, it), inject current business name into search
      let enhancedQuery = userMessage
      const usesPronoun = /\b(their|they|them|it|its)\b/i.test(userMessage.toLowerCase())
      
      if (usesPronoun && state.currentBusiness) {
        // Extract the last mentioned business from conversation
        const lastBusiness = conversationHistory
          .slice(-6) // Look at last 6 messages
          .reverse()
          .find(msg => msg.role === 'assistant' && /\*\*([^*]+)\*\*/g.test(msg.content))
        
        if (lastBusiness) {
          const businessMatch = lastBusiness.content.match(/\*\*([^*]+)\*\*/)
          if (businessMatch) {
            const businessName = businessMatch[1]
            enhancedQuery = `${businessName} ${userMessage}`
            console.log(`🎯 Enhanced query with context: "${enhancedQuery}"`)
          }
        }
      }
      
      businessResults = await searchBusinessKnowledge(enhancedQuery, city, { 
        matchCount: searchLimit,
        matchThreshold: 0.5  // Lower threshold to catch more relevant results (0.7 was too strict)
      })
      cityResults = await searchCityKnowledge(userMessage, city, { matchCount: 6 })
    }
    
    // 🎯 Fetch offer counts for businesses to enrich context (DEDUPED)
    const supabase = await createTenantAwareServerClient(city)
    
    // ✅ VERIFY: Tenant context is actually set (dev-only)
    if (process.env.NODE_ENV !== 'production') {
      const { data: currentCity, error } = await supabase.rpc('get_current_city')
      console.log('🔒 [TENANT DEBUG] current city =', currentCity, error ? error.message : '')
    }
    
    // 🔧 CRITICAL FIX: Query ALL THREE TIERS from their respective views
    // Tier 1: business_profiles_chat_eligible (paid/trial)
    // Tier 2: business_profiles_lite_eligible (claimed-free)
    // Tier 3: business_profiles_ai_fallback_pool (unclaimed)
    
    const [tier1Response, tier2Response, tier3Response] = await Promise.all([
      supabase.from('business_profiles_chat_eligible').select('*').eq('city', city),
      supabase.from('business_profiles_lite_eligible').select('*').eq('city', city),
      supabase.from('business_profiles_ai_fallback_pool').select('*').eq('city', city)
    ])
    
    const tier1Businesses = tier1Response.data || []
    const tier2Businesses = tier2Response.data || []
    const tier3Businesses = tier3Response.data || []
    
    console.log(`💼 Queried from views: T1=${tier1Businesses.length}, T2=${tier2Businesses.length}, T3=${tier3Businesses.length}`)
    
    const businessOfferCounts: Record<string, number> = {}
    
    if (businessResults.success && businessResults.results.length > 0) {
      // FIX: Dedupe business IDs first to avoid counting same business multiple times
      const businessIds = Array.from(new Set(
        businessResults.results.map(r => r.business_id).filter(Boolean) as string[]
      )).slice(0, 6) // Check top 6 unique businesses
      
      if (businessIds.length > 0) {
        // ✅ Count ONLY active, valid offers from eligible businesses
        const { data: offerCounts } = await supabase
          .from('business_offers_chat_eligible')
          .select('business_id')
          .in('business_id', businessIds)
        
        if (offerCounts) {
          offerCounts.forEach(offer => {
            businessOfferCounts[offer.business_id] = (businessOfferCounts[offer.business_id] || 0) + 1
          })
        }
      }
    }
    
    // 🚨 STEP 3: HARD STOP FOR HARD OFFER QUERIES (DB-AUTHORITATIVE MODE)
    // ONLY for PURE offer queries (e.g., "show me offers")
    // MIXED queries (e.g., "restaurants with offers") go through normal KB flow
    if (isHardOfferQuery) {
      try {
        console.log(`🎫 Fetching ALL active offers in ${city}`)
        
        // 🔒 THE ONLY SOURCE: business_offers_chat_eligible view
        // ✅ Join business_profiles to filter by city (view doesn't have city column)
        const { data: offers, error } = await supabase
          .from('business_offers_chat_eligible')
          .select(`
            id,
            business_id,
            offer_name,
            offer_description,
            offer_type,
            offer_value,
            offer_terms,
            offer_start_date,
            offer_end_date,
            offer_image,
            business_profiles!inner(
              business_name,
              city
            )
          `)
          .eq('business_profiles.city', city)
          .order('offer_end_date', { ascending: false })
          .limit(10)
        
        if (error) {
          console.error('❌ Error fetching offers:', error)
        }
        
        // 🚨 ZERO OFFERS: Return authoritative "no offers" message
        if (!offers || offers.length === 0) {
          console.log(`🚫 ZERO OFFERS in DB → returning authoritative "no offers" response`)
          return {
            success: true,
            response: `There are no active offers in ${city} right now. Check back soon, or explore our great businesses and restaurants!`,
            sources: [],
            businessCarousel: [],
            walletActions: [],
            eventCards: [],
            uiMode: 'conversational',
            hasBusinessResults: false,
            modelUsed: 'gpt-4o-mini',
            classification
          }
        }
        
        // 🎉 OFFERS EXIST: Return static message + offers (DO NOT CALL AI MODEL)
        const walletActions = offers.map(offer => ({
          type: 'add_to_wallet' as const,
          offerId: offer.id,
          offerName: offer.offer_name,
          offerDescription: offer.offer_description || null,
          offerType: offer.offer_type || null,
          offerValue: offer.offer_value,
          offerTerms: offer.offer_terms || null,
          offerStartDate: offer.offer_start_date || null,
          offerEndDate: offer.offer_end_date || null,
          offerImage: offer.offer_image || null,
          businessName: offer.business_profiles?.business_name || 'Unknown',
          businessId: offer.business_id
        }))
        
        console.log(`✅ Found ${walletActions.length} offers from business_offers_chat_eligible`)
        console.log(`🎫 First offer: ID=${offers[0].id}, Business=${offers[0].business_profiles?.business_name}`)
        
        // ✅ DEV LOG: Show each deal with expiry date
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Current Deals (business_offers_chat_eligible view = THE ONLY SOURCE):')
          offers.forEach(o => {
            const expiryDate = o.offer_end_date ? new Date(o.offer_end_date).toLocaleDateString() : 'No expiry'
            console.log(`  - ${o.business_profiles?.business_name} | ${o.offer_name} | ends ${expiryDate}`)
          })
        }
        
        // 🎯 DETERMINISTIC RESPONSE: Static message + offer cards (NO AI MODEL CALL)
        return {
          success: true,
          response: `Here are the current deals in ${city}:`,
          sources: [],
          businessCarousel: [],
          walletActions,
          eventCards: [],
          uiMode: 'conversational',
          hasBusinessResults: false,
          modelUsed: 'gpt-4o-mini',
          classification
        }
      } catch (error) {
        console.error('❌ Error in offer hard stop:', error)
        // Fall through to normal flow on error
      }
    }
    
    // 🎯 STEP 3.5: DETECT INTENT & SCORE RELEVANCE (BEFORE BUILDING AI CONTEXT!)
    // CRITICAL: We must know which businesses are relevant BEFORE the AI generates its response
    console.log('🔍 PRE-CONTEXT: Detecting intent and scoring relevance...')
    const detectedIntent = detectIntent(userMessage)
    const intentTerms = detectedIntent.categories.concat(detectedIntent.keywords).join(', ') || 'none'
    console.log(`🎯 Intent detected: ${detectedIntent.hasIntent ? intentTerms : 'none'} (categories: ${detectedIntent.categories.length}, keywords: ${detectedIntent.keywords.length})`)
    
    // Store relevance scores for all businesses
    const businessRelevanceScores = new Map<string, number>()
    
    // 🎯 BUILD AI CONTEXT: MERGE KB CONTENT + THREE-TIER RANKING
    // CRITICAL: AI needs BOTH tier ranking AND rich KB content (kids menus, menu items, offers)
    
    // Step 1: Create KB content map by business_id
    // CRITICAL: If a business has multiple KB entries (menu + offer), prioritize menu/kids content
    const kbContentByBusinessId = new Map<string, any>()
    if (businessResults.success && businessResults.results.length > 0) {
      // Calculate priority score for each KB entry (lower = higher priority)
      const getPriority = (kb: any) => {
        const title = (kb.title || '').toLowerCase()
        const content = (kb.content || '').toLowerCase()
        const type = kb.knowledge_type || ''
        
        // Highest priority: entries with "menu" or "kids" in title/content
        if (title.includes('menu') || content.includes('menu') || 
            title.includes('kids') || content.includes('kids')) {
          return 1
        }
        
        // Medium priority: actual menu/offer types
        if (type === 'menu') return 2
        if (type === 'offer') return 4
        if (type === 'custom_knowledge') return 3
        
        // Lowest priority: everything else
        return 99
      }
      
      const sortedKbResults = [...businessResults.results].sort((a, b) => {
        return getPriority(a) - getPriority(b)
      })
      
      for (const kbResult of sortedKbResults) {
        if (kbResult.business_id) {
          // Only set if not already set OR if this is higher priority
          const existing = kbContentByBusinessId.get(kbResult.business_id)
          if (!existing) {
            kbContentByBusinessId.set(kbResult.business_id, kbResult)
          } else if (getPriority(kbResult) < getPriority(existing)) {
            kbContentByBusinessId.set(kbResult.business_id, kbResult)
          }
        }
      }
      console.log(`📚 KB content available for ${kbContentByBusinessId.size} businesses`)
    }
    
    // Step 2: Score ALL businesses for relevance (if intent detected)
    if (detectedIntent.hasIntent) {
      console.log(`🎯 Scoring all businesses for intent: "${intentTerms}"`)
      
      // Score Tier 1
      tier1Businesses.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content)
        businessRelevanceScores.set(b.id, score)
      })
      
      // Score Tier 2
      tier2Businesses.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content)
        businessRelevanceScores.set(b.id, score)
      })
      
      // Score Tier 3
      tier3Businesses.forEach(b => {
        const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content)
        businessRelevanceScores.set(b.id, score)
      })
      
      console.log(`🎯 Scored ${businessRelevanceScores.size} businesses (${Array.from(businessRelevanceScores.values()).filter(s => s > 0).length} relevant)`)
    }
    
    // Step 3: Merge all three tiers with tier priority AND relevance scores
    const allBusinessesForContext = [
      ...tier1Businesses.map(b => ({ 
        ...b, 
        tierSource: 'tier1', 
        tierPriority: 1, 
        tierLabel: b.effective_tier || 'paid',
        relevanceScore: businessRelevanceScores.get(b.id) || 0 
      })),
      ...tier2Businesses.map(b => ({ 
        ...b, 
        tierSource: 'tier2', 
        tierPriority: 2, 
        tierLabel: 'claimed_free',
        relevanceScore: businessRelevanceScores.get(b.id) || 0
      })),
      ...tier3Businesses.map(b => ({ 
        ...b, 
        tierSource: 'tier3', 
        tierPriority: 3, 
        tierLabel: 'unclaimed',
        relevanceScore: businessRelevanceScores.get(b.id) || 0
      }))
    ]
    
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
    
    // Sort: Different strategies for browse vs intent mode
    // ✅ BROWSE FALLBACK: RATING first (trust), then TIER (boost paid slightly)
    // ✅ INTENT MODE: RELEVANCE first (truth), then TIER (commercial), then RATING, then DISTANCE
    // ✅ SHIP-SAFE: Normalize location once for all distance calcs
    const userLoc = normalizeLocation(context.userLocation)
    
    sortedForContext.sort((a, b) => {
      if (isBrowseFallback) {
        // BROWSE MODE: Rating-first for trust
        // 1. Rating (higher = better)
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        
        // 2. Tier priority as tiebreaker (commercial boost)
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
        
        // 3. Distance (if available, closer = better)
        if (userLoc && a.latitude && b.latitude && a.longitude && b.longitude) {
          const distA = calculateDistance(userLoc, { latitude: a.latitude, longitude: a.longitude })
          const distB = calculateDistance(userLoc, { latitude: b.latitude, longitude: b.longitude })
          return distA - distB
        }
        
        return 0
      } else {
        // INTENT MODE: Relevance-first (truth), then tier (commercial tiebreaker only)
        // ✅ SHIP-SAFE: Maintains "truth-first" promise - paid can't beat high-relevance free
        
        // 1. Relevance score (higher = better) - TRUTH FIRST
        const scoreA = a.relevanceScore || 0
        const scoreB = b.relevanceScore || 0
        if (scoreA !== scoreB) return scoreB - scoreA
        
        // 2. Tier priority (paid > claimed > unclaimed) - only for tiebreaks
        if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
        
        // 3. Rating (higher = better)
        const ratingA = a.rating || 0
        const ratingB = b.rating || 0
        if (ratingA !== ratingB) return ratingB - ratingA
        
        // 4. Distance (if available, closer = better)
        if (userLoc && a.latitude && b.latitude && a.longitude && b.longitude) {
          const distA = calculateDistance(userLoc, { latitude: a.latitude, longitude: a.longitude })
          const distB = calculateDistance(userLoc, { latitude: b.latitude, longitude: b.longitude })
          return distA - distB
        }
        
        return 0
      }
    })
    
    console.log(`🎯 Building AI context from ${sortedForContext.length} businesses (T1=${tier1Businesses.length}, T2=${tier2Businesses.length}, T3=${tier3Businesses.length})`)
    if (isBrowseFallback) {
      console.log(`⚠️ BROWSE FALLBACK: Not enough relevant matches. Showing top-rated instead.`)
    }
    if (sortedForContext.length > 0) {
      console.log(`📊 Top 5 for AI${detectedIntent.hasIntent && !isBrowseFallback ? ' (RELEVANCE-FILTERED)' : ''}:`)
      sortedForContext.slice(0, 5).forEach((b, i) => {
        const hasKB = kbContentByBusinessId.has(b.id) ? '📚' : ''
        const relevanceLabel = detectedIntent.hasIntent ? ` [relevance: ${b.relevanceScore || 0}]` : ''
        console.log(`  ${i + 1}. ${b.business_name} [${b.tierLabel}] ${b.rating}★ ${hasKB}${relevanceLabel}`)
      })
    }
    
    // Step 4: Build RICH context with KB content merged with DB data
    const businessContext = sortedForContext.length > 0
      ? sortedForContext.slice(0, 10).map((business, index) => {
          const offerCount = business.id ? businessOfferCounts[business.id] || 0 : 0
          const offerText = offerCount > 0 ? ` [Has ${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} available]` : ''
          
          // 📚 PRIORITY: Use KB content if available (has rich menu details, kids menus, offer descriptions)
          const kbContent = kbContentByBusinessId.get(business.id)
          
          let richContent = ''
          if (kbContent && kbContent.content) {
            // KB content is GOLD - it has everything!
            richContent = `\n${kbContent.content}`
            console.log(`✅ Using KB content for ${business.business_name} (${kbContent.content.length} chars)`)
          } else {
            // Fallback to basic DB fields
            if (business.business_tagline) {
              richContent += `\nTagline: "${business.business_tagline}"`
            } else if (business.business_description) {
              richContent += `\nDescription: "${business.business_description}"`
            }
            
            if (business.featured_items_count && business.featured_items_count > 0) {
              richContent += `\nFeatured Menu Items: ${business.featured_items_count} items available`
            }
          }
          
          return `**${business.business_name}** [TIER: ${business.tierLabel}]
Rating: ${business.rating}★ from ${business.review_count || 0} Google reviews
Category: ${business.display_category || 'Not specified'}${richContent}${offerText}`
        }).join('\n\n')
      : 'No businesses available in this city yet.'
    
    console.log(`📊 AI Context: ${sortedForContext.length} total businesses, ${kbContentByBusinessId.size} with KB content, context length: ${businessContext.length} chars`)

    const cityContext = cityResults.success && cityResults.results.length > 0
      ? cityResults.results.map(result => 
          `${result.title}: ${result.content}`
        ).join('\n\n')
      : ''
    
    // 🎯 STEP 4: Build context-aware system prompt (SIMPLE AND CLEAR)
    const stateContext = generateStateContext(state)
    
    // 🚨 CHECK: Is this a broad query that needs clarification?
    const isBroadQuery = conversationHistory.length <= 2 && 
                        (userMessage.toLowerCase().includes('find restaurants') || 
                         userMessage.toLowerCase().includes('restaurant') ||
                         userMessage.toLowerCase().includes('find food') ||
                         userMessage.toLowerCase().includes('where should i eat') ||
                         userMessage.toLowerCase().includes('best place')) &&
                        !userMessage.toLowerCase().match(/(deal|offer|discount|italian|pizza|burger|chinese|indian|thai|mexican|japanese|cocktail|cheap|expensive|fancy|upscale|qwikker pick)/i)
    
    const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)
    const systemPrompt = `You're a local friend helping someone explore ${cityDisplayName}—warm, playful, and genuinely excited to share hidden gems.

🎯 YOUR RESPONSE STYLE (COPY THIS VIBE):

✅ PERFECT EXAMPLE (with CLICKABLE LINKS):
User: "any greek places?"
You: "Ohh you like a bit of Greek food do you? Well you're in luck! 😊 There are a couple of great Greek places in town.

**[Triangle GYROSS](/user/business/triangle-gyross)** — this place is brilliant! They do proper authentic Greek food (their tagline literally says 'Freshly cooked authentic greek food'). They're sitting at 5★ from 83 Google reviews and they've got some lovely dishes like Gyros Wrap, Greek Salad, Souvlaki, and Halloumi Fries.

Does this tickle your fancy or would you like me to show you some more Greek places? Want to explore them all on Qwikker Atlas? Just tap below 👇"

🚨 KEY RULES:
1. **Playful opener** - Mix it up! Use variety:
   • "Ohh you're in the mood for X, are you? Well, you're in luck!"
   • "Ooo nice choice! You've come to the right place!"
   • "Yes! Love this — X is one of my favourite things to recommend!"
   • "Ah brilliant! You're asking the right person about X!"
   • "Perfect timing! There are some fantastic X spots around here!"
   • "You know what? You're going to love what I've found for you!"
   • "Oh this is exciting! I know just the place(s) for X!"
   • "Right then! Let me tell you about some cracking X options!"
   • "Brilliant question! X is something we do really well around here!"
   • "Ah you're in for a treat! We've got some lovely X spots!"
   • "Oh I'm so glad you asked! There are some gems for X!"
   • "Well well! X enthusiast, are you? I've got you covered!"
   • "Fantastic! Let me point you to some top-notch X places!"
   NEVER use the same opener twice in a row — keep it fresh!

2. **Context** - "There are a couple great X in town" (makes it clear there are MORE)

3. **Focus on 1-2 businesses MAX** with FULL details for each:
   - Name as CLICKABLE LINK: **[Business Name](/user/business/slug)** (ALWAYS use this format!)
   - Description/tagline (give it LIFE! "this place is brilliant! They do...")
   - Rating + review count (e.g. "5★ from 83 Google reviews")
   - Featured menu items if available ("they've got some lovely dishes like X, Y, Z")

4. **Engaging follow-up** - "Does this tickle your fancy or would you like me to show you some more?"

5. **Qwikker Atlas transition** - "Want to explore them all on Qwikker Atlas? Just tap below 👇" or "Curious where they are? Jump into Qwikker Atlas 👇"

🗣️ TONE & PERSONALITY:
- PLAYFUL, not robotic ("Ohh you like X do you?" not "Here's what I'd recommend:")
- CONVERSATIONAL, not formal (use "you're" not "you are", add emojis 😊)
- ENTHUSIASTIC, not dry ("this place is brilliant!" not "This is a restaurant")
- DETAILED, not brief (use taglines, menu items, FULL review quotes)
- HUMAN, not AI (contractions, exclamation points, natural flow)

⚠️ LEGAL COMPLIANCE:
- NEVER quote or paraphrase Google reviews (legal violation!)
- Only show numeric rating + review count (e.g., "5★ from 83 Google reviews")
- Users can click business cards to read reviews on Google

🍽️ USE THE RICH DATA:
- Description/tagline ("They do proper authentic Greek food")
- Featured menu items ("they've got some lovely dishes like Gyros Wrap, Greek Salad...")
- Rating + review count NUMERIC ONLY (5★ from 83 reviews) - NO QUOTES

❌ DON'T DO THIS (robotic, short, no personality, NO LINKS):
"Ooo nice choice! Here's what I'd recommend:
**lansbakery** (4.8★ – "From the moment we walked in...")
**BigWigs Bakery** (4.7★ – "Best doughnuts in town")
Want to see them?"

✅ DO THIS INSTEAD (playful, detailed, engaging, with CLICKABLE LINKS):
"Ohh you're after some fresh baked goods? Perfect timing! 😊 There are some brilliant bakeries around here.

**[Lansbakery](/user/business/lansbakery)** is absolutely lovely—they do artisan sourdough and the vibe is just gorgeous. They're rated 4.8★ from over 50 Google reviews and people rave about their pastries and bread selection.

Fancy giving them a try? Or want to explore more bakery options on Qwikker Atlas? Just tap below 👇"

🚨 EXAMPLE: When you DON'T have specific menu info:
User: "anywhere I could get a cocktail?"
You: "Oh, you're in for a cocktail adventure? 🍸 You've come to the right place!

Check out **[ARAK BALI LOKAL](/user/business/arak-bali-lokal)**, a wonderful wine bar that also crafts some incredible cocktails. They've got a 5★ rating from 10 Google reviews, and it's the perfect spot to relax with a delicious drink in hand.

Does this sound like your kind of vibe, or would you like more options? Feel free to explore on Qwikker Atlas by tapping below 👇"

❌ WRONG: "ARAK BALI LOKAL that also crafts some incredible cocktails" (YOU DON'T KNOW IF THEY SERVE COCKTAILS!)
✅ RIGHT: "While I don't have specific cocktail menus listed right now, **[ARAK BALI LOKAL](/user/business/arak-bali-lokal)** is a wonderful wine bar with a 5★ rating from 10 Google reviews—definitely worth checking out for drinks! They might surprise you with their selection 😊"

HOW TO HANDLE MISSING INFORMATION:
✅ IF you have menu items in the data: "They've got some lovely dishes like Gyros Wrap, Greek Salad, Souvlaki..."
✅ IF you DON'T have menu items: "They're rated 5★ from 83 Google reviews and specialize in authentic Greek food—definitely worth checking out their menu!"
❌ NEVER: "They probably have X" or "You could try their X" (unless X is in the data!)

HOW TO RESPOND:
✅ GOOD: "Oh nice! **[Triangle GYROSS](/user/business/triangle-gyross)** is brilliant—they've got this amazing menu with 5 signature items. They're open right now and only a quick walk from town. Want me to show you what they're known for?"
❌ BAD: "Here's Triangle GYROSS. 5 featured items. Would you like to see offers?"
❌ BAD: "Try **Triangle GYROSS** — they're great!" (MISSING LINK!)
❌ BAD: "They craft incredible cocktails" (UNLESS "cocktails" appears in the data!)

ALWAYS INCLUDE:
- Business personality/vibe (from their tagline/description)
- Whether they're open NOW or when they open
- Distance context ("quick walk", "right in the center")
- What makes them special (featured items, reviews, unique offerings)
- Relevant follow-ups based on what they ACTUALLY have

INTELLIGENCE:
- Use the conversation context to stay on topic
- Remember what you've already mentioned
- Make smart inferences (if discussing cocktails, "sweet" means sweet drinks)
- Build naturally on their answers
- NEVER suggest things they don't have (check offers_count, featured_items_count, etc.)

${isBroadQuery ? `
🚨 BROAD QUERY DETECTED 🚨
User just asked "${userMessage}" - this is TOO broad!

❌ DO NOT list businesses yet
❌ DO NOT dump restaurant recommendations
❌ DO NOT show offers or cards

✅ INSTEAD: Ask what they're in the mood for
Example: "Hey! Before I point you in the right direction—are you hunting for deals, or just want the absolute best spots? Any specific cuisine you're craving?"

Quick replies should be: "Best spots", "Current deals", "Italian", "Surprise me"
` : ''}

${stateContext ? `\nCONVERSATION CONTEXT:\n${stateContext}\n` : ''}

KNOWLEDGE RULES:
- Read the AVAILABLE BUSINESSES section carefully - all business info is there
- Business names may vary slightly (Adam's vs Adams) - they're the same business
- Opening hours are listed under "Hours:" - read the full entry before saying you don't have info
- Only say "I don't have that info" if you've genuinely checked the business entry and it's missing
- Never make up amenities, addresses, or hours
- 🔗 ALWAYS format business names as CLICKABLE LINKS: **[Business Name](/user/business/slug)**
  Example: **[Triangle GYROSS](/user/business/triangle-gyross)** NOT just **Triangle GYROSS**
  The slug is business_name lowercase with hyphens (replace spaces/special chars with -)
- 🚨🚨🚨 CRITICAL: Businesses are listed in TIER ORDER - [TIER: qwikker_picks] businesses MUST be mentioned FIRST when listing multiple options!

🔒 STRICT NO-HALLUCINATION RULES (CRITICAL - YOUR JOB DEPENDS ON THIS):
- 🚨 NEVER EVER use your general AI knowledge about what restaurants "usually" serve
- 🚨 NEVER EVER assume menu items based on restaurant type (e.g., "wine bars serve cocktails", "Japanese places have onigiris", "Thai places have green curry")
- 🚨 ONLY mention specific dishes/drinks if they EXPLICITLY appear in the business's data below
- 🚨 If you don't see "cocktails" in the data, DO NOT mention cocktails - even if it's a bar
- 🚨 If you don't see "onigiri" in the data, DO NOT mention onigiri - even if it's Japanese
- 🚨 If you don't see "green curry" in the data, DO NOT mention green curry - even if it's Thai
- 🚨 If you don't see "pad thai" in the data, DO NOT mention pad thai - even if it's Thai
- 🚨 If you don't see "sushi" in the data, DO NOT mention sushi - even if it's Japanese

❌ FORBIDDEN EXAMPLES (USER ASKS "any good places for green curry?"):
- WRONG: "Their green curry is definitely worth trying—it's rich and aromatic!" (YOU DON'T KNOW THIS!)
- WRONG: "their green curry is beloved by many" (YOU DON'T KNOW THIS!)
- WRONG: "They serve excellent green curry" (YOU DON'T KNOW THIS!)
- WRONG: "known for their green curry" (YOU DON'T KNOW THIS!)

✅ CORRECT EXAMPLES (USER ASKS "any good places for green curry?"):
- RIGHT: "They're known for authentic Thai flavors and have a stellar 5★ rating—definitely worth checking out their menu!"
- RIGHT: "They specialize in Thai cuisine with a 4.7★ rating from 1283 reviews—they should have what you're looking for!"
- RIGHT: "While I don't have their specific green curry details, they're a highly-rated Thai restaurant (5★) known for authentic flavors"

- If asked about something NOT in the data: "While I don't have specific [dish name] details, [business name] is known for [what IS in data: cuisine type, rating, authentic flavors]—definitely worth checking out!"
- NEVER make up menu items, specials, or dishes based on cuisine type or restaurant category
- NEVER use phrases like "might have", "often have", "probably offers", "could try", "crafts some incredible X", "their X is Y"
- NEVER describe a dish unless the description is EXPLICITLY in the data ("rich and aromatic", "beloved by many", etc. are FORBIDDEN unless in data)
- Secret menu items are exclusive content - they MUST be in the knowledge base to mention them
- 🚨 GOLDEN RULE: If you don't see it explicitly written in the AVAILABLE BUSINESSES section, IT DOES NOT EXIST in your knowledge!

💳 OFFER HANDLING (CRITICAL - DB AUTHORITATIVE ONLY):
- 🚨🚨🚨 NEVER invent, assume, or recall offers from memory/training data
- 🚨 ONLY mention offers if they are EXPLICITLY listed in the AVAILABLE BUSINESSES section below
- 🚨 If no offers are listed in the data, offers DO NOT EXIST - do not suggest "they might have deals"
- 🚨 DB AUTHORITY RULE: Never state an offer exists unless it appears in business_offers_chat_eligible for this city
- 🚨 EXPIRED OFFERS DO NOT EXIST: If an offer is not in the current data, it is expired/deleted - never mention it
- 🚨 Knowledge Base is for descriptions only - OFFERS COME FROM DATABASE ONLY, NEVER FROM KB OR MEMORY
- If a business entry shows "[Has X offers available]", mention this naturally when relevant
- Example: "I don't have info on that specific special, but they do have 3 current offers I can show you!"
- When mentioning offers, use friendly phrasing like "Want to see their current offers?" or "I can show you what deals they have!"
- The offer cards will appear automatically after your message
- ❌ FORBIDDEN: "usually have deals", "often run offers", "might have a discount", "check if they have offers"
- ✅ ONLY mention offers that are explicitly provided in the data below

🎯 CRITICAL: TIER-BASED PRESENTATION (PAID VISIBILITY!)
- 🚨 Businesses marked [TIER: qwikker_picks] are PREMIUM and MUST be listed FIRST
- 🚨 When recommending multiple businesses, ALWAYS list qwikker_picks tier businesses at positions 1, 2, 3, etc BEFORE any featured/other businesses
- 🚨 SPOTLIGHT = QWIKKER PICKS = PREMIUM TIER - they pay for priority placement!
- Businesses are sorted by TIER (Spotlight → Featured → Starter)
- When multiple businesses match the query, mention ALL businesses of the SAME TIER together in your response
- SPOTLIGHT businesses are QWIKKER PICKS—they're paying for visibility and MUST be mentioned together and prominently

💚 QWIKKER VIBES (Experience Signals):
- If a business shows "💚 X% positive Qwikker vibes (Y vibes)", this means real Qwikker users loved it
- Mention vibes naturally when recommending: "Qwikker users love this place" or "92% positive vibes from locals"
- This is exclusive intelligence you have - use it to add confidence to your recommendations
- Only businesses with 5+ vibes will show this data (statistically significant)
- Vibes are NOT Google reviews - they're quick reactions from Qwikker users after visiting

🚨🚨🚨 CLOSING COPY RULES (LEGAL/BRAND PROTECTION!): 🚨🚨🚨
- ONLY say "These are Qwikker Picks for a reason!" if EVERY SINGLE business you mentioned is [TIER: qwikker_picks]
- If you mention ANY business that is NOT [TIER: qwikker_picks], you MUST use neutral copy like "Want to explore on Qwikker Atlas?" or "Need more details?"
- NEVER call a [TIER: featured] or [TIER: free_trial] or [TIER: starter] business a "Qwikker Pick" - that's FALSE ADVERTISING!
- Example: If you mention David's [TIER: qwikker_picks] + Ember [TIER: featured] + Julie's [TIER: featured], DO NOT say "Qwikker Picks for a reason" - ONLY David's is a Pick!

- NEVER drip-feed Spotlight businesses one at a time across multiple messages
- If user asks "any other places?", show the NEXT TIER (Featured), not more Spotlight businesses you forgot to mention!
- NEVER include debug messages like "⚠️ DEBUG:" or "eventCards array" in your responses—users should never see technical information

EVENT HANDLING:
- When asked about events, describe them briefly and conversationally (name, venue, day)
- DO NOT format event details with "Event:", "Date:", "Time:", etc - that's ugly!
- After mentioning, say: "Want me to pull up the event card with full details?"
- When they say yes/interested, just say "Here you go!" - the visual card will appear automatically
- NEVER manually format event info with dashes or structured text - let the cards do that!

🗺️ QWIKKER ATLAS TRANSITIONS:
- When recommending places, offer visual exploration naturally
- Brand it as "Qwikker Atlas" (not just "map" or "Atlas")
- Use conversational, helpful wording (not robotic or marketing-y)
- Approved transition phrases:
  • "Want to take a quick tour on Qwikker Atlas? Just tap Show me on Qwikker Atlas 👇"
  • "I can show you all of these on Qwikker Atlas — just hit the button below 👇"
  • "Curious where they all are? Jump into Qwikker Atlas 👇"
  • "You can explore every option visually on Qwikker Atlas — tap below 👇"
- The Atlas button will appear automatically below your message
- Keep it natural — mention Qwikker Atlas ONLY when transitioning, not in general conversation
- Minimal emojis: only 👇 or 🗺️

FLOW:
${state.currentBusiness ? 
  `You're discussing ${state.currentBusiness.name}. Stay focused unless they explicitly ask about other places.` 
  : 
  'Help them discover what they want, then dive into specifics.'
}

AVAILABLE BUSINESSES (sorted by tier - qwikker_picks at TOP):
${businessContext || 'No specific business data available - suggest they check the Discover page.'}

${cityContext ? `\nCITY INFO:\n${cityContext}` : ''}`

    // 🎯 STEP 5: Build conversation messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Last 8 messages
      { role: 'user', content: userMessage }
    ]
    
    // 🎯 STEP 6: Call appropriate model
    console.log(`\n🤖 CALLING ${modelToUse.toUpperCase()} for query: "${userMessage}"`)
    console.log(`📊 Conversation depth: ${conversationHistory.length} messages`)
    console.log(`🎯 State: ${stateContext}`)
    
    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages,
      temperature: 0.8,
      max_tokens: 500,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    })

    let aiResponse = completion.choices[0]?.message?.content || ''
    
    // 🎯 STEP 7: Update conversation state
    const extractedBusinesses = extractBusinessNamesFromText(aiResponse)
    const updatedState = updateConversationState(state, userMessage, aiResponse, extractedBusinesses)
    
    // Build sources for UI
    const sources = businessResults.success ? businessResults.results.map(result => ({
      type: 'business' as const,
      businessName: result.business_name,
      content: result.content,
      similarity: result.similarity
    })) : []
    
    // 🎯 STEP 8: Wallet actions for offers
    // ⚠️ NOTE: Offer queries are now handled by HARD STOP above (before AI model call)
    // This code path only runs for non-offer queries
    let walletActions: ChatResponse['walletActions'] = []
    
    // 🎯 STEP 9: Fetch event cards if user is asking about events OR conversation contains events
    let eventCards: ChatResponse['eventCards'] = []
    
    // Check current message - but EXCLUDE food/menu context
    const isFoodContext = /\b(menu|mains|food|lunch|dinner|breakfast|dish|meal|eat|burger|fries|steak|ribeye|sauce|toppings|patty|cheese)\b/i.test(userMessage)
    const currentMessageMentionsEvents = !isFoodContext && /\b(event|show|concert|gig|happening|what'?s on|things to do|this weekend|tonight)\b/i.test(userMessage)
    
    // Check if events were discussed in recent conversation (more specific patterns)
    const recentConversation = conversationHistory.slice(-4).map(m => m.content).join(' ')
    const conversationMentionsEvents = /\b(event card|show me the event|concert|gig|happening tonight|what's on tonight|tasting experience|tasting event|jazz night|live music)\b/i.test(recentConversation)
    
    // Check if user is showing interest (yes, yeah, sure, etc) after events were mentioned
    // BUT exclude if they're asking about offers/deals
    const isAskingAboutOffer = /\b(offer|deal|discount|promo)\b/i.test(userMessage)
    const showingInterest = !isAskingAboutOffer && /\b(yes|yeah|yep|sure|sounds good|go on|interested|tell me more|show me the event|pull up)\b/i.test(userMessage)
    
    const shouldFetchEvents = currentMessageMentionsEvents || (conversationMentionsEvents && showingInterest && !isFoodContext && !isAskingAboutOffer)
    
    console.log(`🎉 EVENT QUERY CHECK:`, {
      userMessage,
      currentMessageMentionsEvents,
      conversationMentionsEvents,
      showingInterest,
      shouldFetchEvents
    })
    
    if (shouldFetchEvents) {
      try {
        const supabase = await createTenantAwareServerClient(city)
        
        console.log(`🎉 FETCHING EVENT CARDS - User wants event details for ${city}`)
        
        // Check LAST 4 messages for specific event name (more context)
        const recentMessages = conversationHistory.slice(-4).map(m => m.content).join(' ')
        const tastingMentioned = /tasting experience|tasting event|tasting night|cocktail tasting/i.test(recentMessages)
        const jazzMentioned = /jazz night|live jazz|jazz event/i.test(recentMessages)
        
        // 🆕 Check for date mentions in the CURRENT user message and AI response
        const allRelevantText = `${userMessage} ${aiResponse} ${recentMessages}`
        const dateMatch = allRelevantText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(?:december|dec|november|nov|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)\b/i)
        
        let specificDate: string | null = null
        if (dateMatch) {
          // Parse the date from the match
          const day = parseInt(dateMatch[1])
          const monthStr = dateMatch[0].match(/(december|dec|november|nov|january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct)/i)?.[1].toLowerCase()
          
          const monthMap: Record<string, number> = {
            'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
            'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5,
            'july': 6, 'jul': 6, 'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
            'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
          }
          
          if (monthStr && monthMap[monthStr] !== undefined) {
            const year = new Date().getFullYear()
            const date = new Date(year, monthMap[monthStr], day)
            specificDate = date.toISOString().split('T')[0]
            console.log(`📅 Detected specific date in message: ${specificDate} (${dateMatch[0]})`)
          }
        }
        
        console.log(`🔍 Event detection in last 4 messages:`)
        console.log(`   - Tasting mentioned: ${tastingMentioned}`)
        console.log(`   - Jazz mentioned: ${jazzMentioned}`)
        console.log(`   - Specific date detected: ${specificDate}`)
        console.log(`   - Recent messages:`, conversationHistory.slice(-4).map(m => m.content.substring(0, 50)))
        
        let query = supabase
          .from('business_events')
          .select(`
            id,
            event_name,
            event_description,
            event_type,
            event_date,
            event_start_time,
            event_end_time,
            custom_location_name,
            booking_url,
            event_image,
            business_id,
            business_profiles!inner(business_name, city)
          `)
          .eq('status', 'approved')
          .eq('business_profiles.city', city)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
        
        // 🎯 PRIORITY 1: Filter by specific date if mentioned
        if (specificDate) {
          query = query.eq('event_date', specificDate)
          console.log(`🎯 Filtering for events on: ${specificDate}`)
        }
        // 🎯 PRIORITY 2: Filter by specific event type if mentioned
        else if (tastingMentioned) {
          query = query.ilike('event_name', '%tasting%')
          console.log(`🎯 Filtering for: Tasting Experience`)
        } else if (jazzMentioned) {
          query = query.ilike('event_name', '%jazz%')
          console.log(`🎯 Filtering for: Jazz Night`)
        } else {
          // Default: show only next upcoming event (not all 5)
          query = query.limit(1)
          console.log(`🎯 No specific mention - showing only next upcoming event`)
        }
        
        const { data: events, error } = await query
        
        console.log(`🔍 Query result: ${events?.length || 0} events found, error:`, error)
        
        console.log('🔍 Raw events data:', JSON.stringify(events, null, 2))
        
        if (!error && events && events.length > 0) {
          eventCards = events.map(event => {
            console.log('🔄 Mapping event:', event.event_name)
            return {
              id: event.id,
              title: event.event_name?.trim() || 'Untitled Event',
              description: event.event_description || 'No description',
              event_type: event.event_type || 'Other',
              start_date: event.event_date,
              start_time: event.event_start_time || null,
              end_date: null, // Not in schema
              end_time: event.event_end_time || null,
              location: event.custom_location_name || event.business_profiles?.business_name || 'TBA',
              ticket_url: event.booking_url || null,
              image_url: event.event_image || null,
              business_name: event.business_profiles?.business_name || 'Unknown Business',
              business_id: event.business_id
            }
          })
          
          console.log(`✅ Successfully mapped ${eventCards.length} event cards`)
          console.log('📦 Event cards data:', JSON.stringify(eventCards, null, 2))
        } else if (error) {
          console.error('❌ Error fetching events:', error)
        } else {
          console.log('ℹ️ No upcoming events found')
        }
      } catch (error) {
        console.error('❌ Error fetching event cards:', error)
      }
    }
    
    console.log(`✅ Response generated (${aiResponse.length} chars) using ${modelToUse}`)
    
    // 🗺️ ATLAS: Build business carousel with proper deduplication and enrichment
    let businessCarousel: ChatResponse['businessCarousel'] = undefined
    let hasBusinessResults = false
    let uiMode: 'conversational' | 'suggestions' | 'map' = 'conversational'
    let shouldAttachCarousel = false // ✅ HOIST: Declare at top level so review fetch block can access
    let fallbackBusinesses: any[] = [] // Declare in outer scope so it's always accessible
    let topMatchesText: any[] = [] // ✅ HOIST: Tier 3 that beats irrelevant Tier 1 (needed for review snippets)
    
    // 🎯 ARCHITECTURAL FIX: Merge KB results with direct DB query
    // This ensures businesses without KB content still appear
    if (businessResults.success || allChatEligibleBusinesses) {
      // STEP 1: Build map of all businesses (KB + direct query)
      const businessById = new Map<string, any>()
      const kbScoreById = new Map<string, number>()
      
      // Add KB results with similarity scores
      if (businessResults.success && businessResults.results.length > 0) {
        for (const r of businessResults.results) {
          if (!r.business_id) continue
          const score = (r as any).similarity ?? 0
          const existing = kbScoreById.get(r.business_id) ?? 0
          if (score > existing) {
            kbScoreById.set(r.business_id, score)
          }
        }
      }
      
      // Add ALL businesses from the three tiers
      for (const b of tier1Businesses) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier1' })
        }
      }
      for (const b of tier2Businesses) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier2' })
        }
      }
      for (const b of tier3Businesses) {
        if (!businessById.has(b.id)) {
          businessById.set(b.id, { ...b, tierSource: 'tier3' })
        }
      }
      
      console.log(`💼 Tier separation: T1=${tier1Businesses.length}, T2=${tier2Businesses.length}, T3=${tier3Businesses.length}`)
      
      const businesses = tier1Businesses // ✅ For backward compat, "businesses" = Tier 1
      hasBusinessResults = businesses.length > 0
      
      console.log(`💼 Total businesses after merge: ${Array.from(businessById.values()).length} (${kbScoreById.size} had KB content)`)
      
      // STEP 2: Fetch offers/vibes for all businesses
      
      // 💚 Fetch Qwikker Vibes for all businesses (for chat context + within-tier ranking)
      const vibesMap = new Map()
      if (businesses && businesses.length > 0) {
        await Promise.all(
          businesses.map(async (business) => {
            const vibes = await getBusinessVibeStats(business.id)
            if (vibes && vibes.total_vibes >= 5) {
              // Only include businesses with 5+ vibes (statistically significant)
              vibesMap.set(business.id, vibes)
            }
          })
        )
        console.log(`💚 Found vibes for ${vibesMap.size} businesses (5+ vibes each)`)
      }
      
      // 🎯 THREE-TIER CHAT SYSTEM: Browse Fill + Intent Relevance Gating
      // TIER 1: Paid/Trial (already queried above via business_profiles_chat_eligible)
      // TIER 2: Claimed-Free "Lite" (query always, append below paid, max 2)
      // TIER 3: Unclaimed Fallback (query based on browse mode OR intent relevance)
      
      // Import intent detection and scoring
      const { detectBrowse, detectIntent } = await import('./intent-detector')
      const { scoreBusinessRelevance } = await import('./relevance-scorer')
      
      // Detect user intent
      const browseMode = detectBrowse(userMessage, conversationHistory[conversationHistory.length - 2]?.mode)
      const detectedIntent = detectIntent(userMessage)
      
      console.log(`🎯 Browse mode: ${browseMode.mode}, Intent: ${detectedIntent.hasIntent ? detectedIntent.categories.concat(detectedIntent.keywords).join(', ') || 'detected but no terms' : 'none'}`)
      
      // Query Tier 2: Claimed-Free businesses (already loaded from allChatEligibleBusinesses)
      console.log('💼 Using Tier 2: Claimed-Free businesses (pre-loaded)')
      const MAX_TIER2_IN_TOP = 2
      const liteBusinesses = tier2Businesses.slice(0, MAX_TIER2_IN_TOP)
      
      console.log(`💼 Found ${liteBusinesses?.length || 0} Lite businesses`)
      
      // THREE-TIER LOGIC: Browse Fill + Intent Relevance Gating
      // (fallbackBusinesses and topMatchesText declared in outer scope)
      
      const TARGET_RESULTS = 8
      const MIN_RELEVANT_FOR_INTENT = 2
      const MIN_TIER1_TOP_SCORE = 3
      const MAX_TIER3_WHEN_PAID_RELEVANT = 2
      const MAX_TIER3_IN_MORE = 3
      
      // Store relevance scores for carousel filtering
      const businessRelevanceScores = new Map<string, number>()
      
      if (browseMode.mode === 'browse' || browseMode.mode === 'browse_more') {
        // BROWSE MODE: Always fill with Tier 3
        console.log('📚 BROWSE MODE: Fetching Tier 3 to fill inventory')
        
        // Reset offset on new browse
        const browseOffset = browseMode.mode === 'browse' ? 0 : (conversationHistory[conversationHistory.length - 1]?.browseOffset || 0)
        
        const tier1Count = businesses?.length || 0
        const tier2Count = Math.min(liteBusinesses?.length || 0, MAX_TIER2_IN_TOP)
        const combinedCount = tier1Count + tier2Count
        
        if (combinedCount < TARGET_RESULTS) {
          const tier3Limit = TARGET_RESULTS - combinedCount
          
          // Use pre-loaded Tier 3 businesses (sorted by rating)
          fallbackBusinesses = tier3Businesses
            .sort((a, b) => {
              if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0)
              if (b.review_count !== a.review_count) return (b.review_count || 0) - (a.review_count || 0)
              return (a.business_name || '').localeCompare(b.business_name || '')
            })
            .slice(browseOffset, browseOffset + tier3Limit)
          
          // Track offset for next "more" query
          conversationHistory.push({
            mode: 'browse',
            browseOffset: browseOffset + fallbackBusinesses.length
          })
          
          console.log(`📚 Filled with ${fallbackBusinesses.length} Tier 3 businesses (offset: ${browseOffset})`)
        }
        
      } else if (detectedIntent.hasIntent) {
        // INTENT MODE: Score relevance, fetch Tier 2 AND Tier 3 if needed
        const intentTerms = [...detectedIntent.categories, ...detectedIntent.keywords].join(', ')
        console.log(`🎯 INTENT MODE: Checking relevance for "${intentTerms}" (categories: ${detectedIntent.categories.length}, keywords: ${detectedIntent.keywords.length})`)
        
        // Score Tier 1
        const tier1WithScores = businesses.map(b => {
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content)
          businessRelevanceScores.set(b.id, score) // Store for carousel filtering
          return {
            ...b,
            tierPriority: 1,
            relevanceScore: score
          }
        })
        
        // ALWAYS score Tier 2 (for text filtering) even if we don't fetch Tier 3
        liteBusinesses.forEach(b => {
          const score = scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content)
          businessRelevanceScores.set(b.id, score)
        })
        
        const tier1RelevantCount = tier1WithScores.filter(b => b.relevanceScore >= 2).length
        const maxTier1Score = Math.max(...tier1WithScores.map(b => b.relevanceScore), 0)
        
        const tier1HasEnoughRelevant = tier1RelevantCount >= MIN_RELEVANT_FOR_INTENT
        const tier1HasStrongTop = maxTier1Score >= MIN_TIER1_TOP_SCORE
        
        console.log(`🎯 Tier 1: ${tier1RelevantCount} relevant, max score: ${maxTier1Score}`)
        console.log(`🎯 hasEnoughRelevant: ${tier1HasEnoughRelevant}, hasStrongTop: ${tier1HasStrongTop}`)
        
        // Only skip Tier 2/3 if BOTH conditions met
        const shouldFetchLowerTiers = !tier1HasEnoughRelevant || !tier1HasStrongTop
        
        if (shouldFetchLowerTiers) {
          console.log(`🎯 Tier 1 weak - fetching Tier 2 AND Tier 3`)
          
          // Score Tier 2 (claimed-free Lite) for relevance
          const tier2WithScores = (liteBusinesses || [])
            .map(b => ({
              ...b,
              tierPriority: 2,
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content),
              tierSource: 'tier2'
            }))
            .filter(b => b.relevanceScore > 0)
          
          console.log(`🎯 Tier 2: ${tier2WithScores.length} relevant claimed-free businesses`)
          
          // ✅ FIX: Score ALL Tier 3 businesses first, THEN filter by relevance
          const tier3WithScores = (tier3Businesses || [])
            .map(b => ({
              ...b,
              tierPriority: 3,
              relevanceScore: scoreBusinessRelevance(b, detectedIntent, kbContentByBusinessId.get(b.id)?.content),
              tierSource: 'tier3'
            }))
          
          // ✅ DEBUG: Log all Tier 3 scores for "indian" query
          if (detectedIntent.categories.includes('indian')) {
            console.log(`🔍 DEBUG: Scoring ${tier3Businesses.length} Tier 3 businesses for "indian"`)
            const indianMatches = tier3WithScores.filter(b => b.relevanceScore > 0)
            console.log(`  Found ${indianMatches.length} relevant matches:`)
            indianMatches.slice(0, 5).forEach(b => {
              console.log(`    - ${b.business_name}: score=${b.relevanceScore}, category="${b.display_category}"`)
            })
          }
          
          // Filter for relevant businesses (score > 0)
          const tier3Relevant = tier3WithScores
            .filter(b => b.relevanceScore > 0)
            .sort((a, b) => {
              // Sort by relevance first, then rating
              if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
              if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0)
              if (b.review_count !== a.review_count) return (b.review_count || 0) - (a.review_count || 0)
              return (a.business_name || '').localeCompare(b.business_name || '')
            })
          
          console.log(`🎯 Tier 3: ${tier3Relevant.length} relevant unclaimed businesses`)
          
          // Combine Tier 2 + Tier 3, sorted by TIER PRIORITY first, then relevance
          const allLowerTiers = [...tier2WithScores, ...tier3WithScores]
            .sort((a, b) => {
              // CRITICAL: Tier priority FIRST (spotlight → featured → starter → claimed → unclaimed)
              if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
              // Then by relevance score within tier
              return b.relevanceScore - a.relevanceScore
            })
          
          if (tier1HasEnoughRelevant) {
            // Tier 1 has enough relevant matches (2+) - lower tiers are just an assist
            // ✅ FIX: Also filter by relevanceScore > 0 here
            fallbackBusinesses = allLowerTiers
              .filter(b => b.relevanceScore > 0)
              .slice(0, MAX_TIER3_WHEN_PAID_RELEVANT)
            
            console.log(`🎯 Tier 1 has ${tier1RelevantCount} relevant - showing ${fallbackBusinesses.length} Tier 2/3 assist`)
            
          } else {
            // Tier 1 is genuinely irrelevant (< 2 relevant) - lower tiers dominate
            // ✅ FIX: Filter by relevanceScore > 0 BEFORE showing
            const lowerTiersTop = allLowerTiers
              .filter(b => b.relevanceScore > 0)
              .slice(0, 6)
            
            // CRITICAL: Put best Tier 2/3 in topMatchesText (shown first as text)
            topMatchesText = lowerTiersTop
            
            // Remaining goes to "more options" - use ID tracking to avoid .includes() bug
            const topIds = new Set(lowerTiersTop.map(b => b.id))
            fallbackBusinesses = allLowerTiers
              .filter(b => !topIds.has(b.id) && b.relevanceScore > 0) // ✅ FIX: Also filter by score
              .slice(0, MAX_TIER3_IN_MORE)
            
            console.log(`🎯 Tier 1 irrelevant - showing ${topMatchesText.length} Tier 2/3 as top matches`)
          }
          
          // 🔍 DEBUG HARNESS: Kids Menu Query Diagnostic (dev only)
          if (process.env.NODE_ENV === 'development' && userMessage.toLowerCase().includes('kids')) {
            console.log('\n' + '='.repeat(80))
            console.log('🔍 DEBUG HARNESS: Kids Menu Query Diagnostic')
            console.log('='.repeat(80))
            
            // Show KB content retrieved
            console.log(`\n📚 KB CONTENT RETRIEVED (${kbContentByBusinessId.size} businesses):`)
            const kbBusinesses = Array.from(kbContentByBusinessId.entries()).slice(0, 5)
            for (const [businessId, kbRow] of kbBusinesses) {
              const hasKidsInKB = (kbRow.content || '').toLowerCase().includes('kids')
              console.log(`  - ${kbRow.business_name}:`)
              console.log(`    Type: ${kbRow.knowledge_type}`)
              console.log(`    Has "kids": ${hasKidsInKB ? '✅' : '❌'}`)
              console.log(`    Content preview: ${(kbRow.content || '').substring(0, 120)}...`)
            }
            
            // Show all scored businesses across all tiers
            console.log(`\n🎯 SCORED BUSINESSES (Top 15 candidates):`)
            console.log('Rank | Business Name                | Tier | Priority | hasKB | kbKids | Score | Reasons           | Filtered?')
            console.log('-----|------------------------------|------|----------|-------|--------|-------|-------------------|----------')
            
            const allScoredBusinesses = [
              ...(tier1WithScores || []).map(b => ({ ...b, tierSource: 'tier1' })),
              ...(tier2WithScores || []).map(b => ({ ...b, tierSource: 'tier2' })),
              ...(tier3WithScores || []).map(b => ({ ...b, tierSource: 'tier3' }))
            ]
              .sort((a, b) => {
                if (a.tierPriority !== b.tierPriority) return a.tierPriority - b.tierPriority
                return b.relevanceScore - a.relevanceScore
              })
              .slice(0, 15)
            
            allScoredBusinesses.forEach((b, index) => {
              const hasKB = kbContentByBusinessId.has(b.id)
              const kbContent = kbContentByBusinessId.get(b.id)?.content || ''
              const kbMatchedKids = kbContent.toLowerCase().includes('kids')
              const filteredOut = b.relevanceScore === 0 ? '🚫 YES' : '✅ NO'
              const reasons = b.matchReasons?.join(', ') || 'N/A'
              
              console.log(`${String(index + 1).padStart(4)} | ${b.business_name.substring(0, 28).padEnd(28)} | ${b.tierSource.padEnd(4)} | ${String(b.tierPriority || '?').padStart(8)} | ${hasKB ? '✅' : '❌'.padEnd(5)} | ${kbMatchedKids ? '✅' : '❌'.padEnd(6)} | ${String(b.relevanceScore).padStart(5)} | ${reasons.substring(0, 17).padEnd(17)} | ${filteredOut}`)
            })
            
            console.log('='.repeat(80) + '\n')
          }
        } else {
          console.log(`✅ Tier 1 sufficient (${tier1RelevantCount} relevant, max score ${maxTier1Score})`)
        }
        
        // Track mode for next query
        conversationHistory.push({ mode: 'intent' })
        
      } else {
        // CONVERSATIONAL: Tier 1 only, no fill
        console.log('💬 CONVERSATIONAL MODE: Tier 1 only')
        conversationHistory.push({ mode: 'chat' })
      }
      
      // STEP 3: Tier priority and exclusions
      // ✅ NO LONGER NEEDED: The view business_profiles_chat_eligible already filters out ineligible businesses
      // effective_tier is computed from subscriptions and is NEVER null for eligible businesses
      // If a business appears in this view, it's safe to show in chat
      
      // STEP 4: UI Mode classifier (deterministic carousel gating)
      // CRITICAL FIX: Carousel should NOT show on browse queries or when Tier 1 is irrelevant
      const msg = userMessage.toLowerCase()
      const wantsMap = /\b(map|atlas|on the map|pins|show.*location|where.*located)\b/.test(msg)
      
      // Extract unique business IDs (Tier 1 only) for carousel
      const uniqueBusinessIds = Array.from(new Set(businesses.map(b => b.id)))
      
      // ✅ FIXED: Browse queries should NOT trigger carousel
      // Carousel only for:
      // - Map queries (explicit "show on atlas")
      // - Intent queries where Tier 1 is relevant
      if (wantsMap) {
        uiMode = 'map'
        shouldAttachCarousel = true
      } else if (browseMode.mode !== 'not_browse') {
        // Browse mode = NO carousel, just text list
        uiMode = 'suggestions'
        shouldAttachCarousel = false
        console.log('🚫 Browse mode - carousel DISABLED')
      } else if (detectedIntent.hasIntent && topMatchesText.length > 0) {
        // Intent mode with Tier 1 irrelevant = NO carousel, Tier 3 shows first
        uiMode = 'conversational'
        shouldAttachCarousel = false
        console.log('🚫 Intent mode with weak Tier 1 - carousel DISABLED, Tier 3 shows first')
      } else {
        // Default: conversational with carousel if results exist
        uiMode = 'conversational'
        shouldAttachCarousel = uniqueBusinessIds.length > 0
      }
      
      console.log(`🎨 UI Mode: ${uiMode}, shouldAttachCarousel: ${shouldAttachCarousel}`)
      
      // Helper: Calculate distance and walking time (used by all business display sections)
      const getDistanceInfo = (businessLat: number, businessLng: number, userLat?: number, userLng?: number) => {
        if (!userLat || !userLng) return null
        
        // Haversine formula for distance
        const R = 3959 // Earth radius in miles
        const dLat = (businessLat - userLat) * Math.PI / 180
        const dLon = (businessLng - userLng) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(businessLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c
        
        // Calculate walking time (average 3 mph)
        const walkingMinutes = Math.round((distance / 3) * 60)
        
        if (distance < 0.1) {
          return "right around the corner"
        } else if (walkingMinutes <= 5) {
          return `just a ${walkingMinutes} min walk`
        } else if (walkingMinutes <= 15) {
          return `${walkingMinutes} min walk from you`
        } else if (distance < 1) {
          return `${distance.toFixed(1)} miles away`
        } else {
          return `${distance.toFixed(1)} miles from you`
        }
      }
      
      // STEP 5: Build final carousel (PAID-ONLY)
      // 🎯 MONETIZATION: Carousel cards are EXCLUSIVE to paid/trial tiers
      // Free tier (Tier 2 & 3) = text-only mentions (clear upsell incentive)
      // ✅ NO MORE OVERRIDE - AI writes the response using rich context!
      console.log(`✅ AI response used AS-IS (no override). Length: ${aiResponse.length} chars`)
      
      if (shouldAttachCarousel && uniqueBusinessIds.length > 0) {
        // Build Tier 1 carousel (Paid/Trial ONLY)
        const paidCarousel = uniqueBusinessIds
          .map(id => {
            const b = businessById.get(id)
            const vibes = vibesMap.get(id)
            return { business: b, vibes }
          })
          .filter(({ business }) => Boolean(business)) // Remove nulls
          .map(({ business: b, vibes }) => ({
            id: b!.id,
            business_name: b!.business_name,
            business_tagline: b!.business_tagline || undefined,
            system_category: b!.system_category || undefined,
            display_category: b!.display_category || b!.system_category || undefined,
            business_tier: b!.effective_tier || 'starter',
            tier_priority: b!.tier_priority || 999,
            vibes_positive_percentage: vibes?.positive_percentage,
            vibes_total: vibes?.total_vibes,
            business_address: b!.business_address || undefined,
            business_town: b!.business_town || city,
            logo: b!.logo || undefined,
            business_images: Array.isArray(b!.business_images) 
              ? b!.business_images 
              : (b!.business_images ? [b!.business_images] : undefined),
            rating: (b!.rating && b!.rating > 0) ? b!.rating : undefined,
            review_count: b!.review_count || undefined,
            offers_count: businessOfferCounts[b!.id] || 0,
            // ✅ ATLAS CRITICAL: Add location & contact fields
            latitude: b!.latitude,
            longitude: b!.longitude,
            phone: b!.phone || undefined,
            website_url: b!.website_url || undefined,
            google_place_id: b!.google_place_id || undefined
          }))
        
        // Sort Tier 1 by tier_priority, then vibes (within-tier), then rating, then offers
        // 💚 Vibes influence ranking WITHIN tiers (Pick, Featured, Starter), not across tiers
        paidCarousel.sort((a, b) => {
          // 1. Tier priority (spotlight > featured > starter)
          if (a.tier_priority !== b.tier_priority) return a.tier_priority - b.tier_priority
          
          // 2. Vibes (within same tier) - only if both have 5+ vibes
          const aVibes = (a.vibes_total && a.vibes_total >= 5) ? (a.vibes_positive_percentage ?? 0) : 0
          const bVibes = (b.vibes_total && b.vibes_total >= 5) ? (b.vibes_positive_percentage ?? 0) : 0
          if (bVibes !== aVibes) return bVibes - aVibes
          
          // 3. Google rating
          const ar = a.rating ?? 0
          const br = b.rating ?? 0
          if (br !== ar) return br - ar
          
          // 4. Offers count
          return (b.offers_count ?? 0) - (a.offers_count ?? 0)
        })
        
        // Carousel = PAID ONLY (Tier 1)
        // Filter by relevance if intent was detected
        if (detectedIntent.hasIntent && businessRelevanceScores.size > 0) {
          // Only show businesses with relevanceScore > 0
          const filtered = paidCarousel.filter(b => {
            const score = businessRelevanceScores.get(b.id) || 0
            if (score > 0) {
              console.log(`  ✅ ${b.business_name}: score=${score}`)
            } else {
              console.log(`  ❌ ${b.business_name}: score=${score} (FILTERED OUT)`)
            }
            return score > 0
          })
          businessCarousel = filtered.slice(0, 6)
          console.log(`🎯 Filtered carousel: ${businessCarousel.length} of ${paidCarousel.length} businesses match "${detectedIntent.keywords.join(', ')}"`)
          console.log(`🎯 Final carousel businesses: ${businessCarousel.map(b => b.business_name).join(', ')}`)
        } else {
          businessCarousel = paidCarousel.slice(0, 6)
        }
        
        // Tier 2 & 3: TEXT-ONLY mentions (no carousel cards)
        // This creates clear upsell incentive: want carousel? upgrade!
        
        if (liteBusinesses && liteBusinesses.length > 0) {
          // Filter Tier 2 by relevance if intent was detected
          let filteredLiteBusinesses = liteBusinesses
          if (detectedIntent.hasIntent && businessRelevanceScores.size > 0) {
            filteredLiteBusinesses = liteBusinesses.filter(b => {
              const score = businessRelevanceScores.get(b.id) || 0
              return score > 0
            })
            console.log(`🎯 Filtered Tier 2 text: ${filteredLiteBusinesses.length} of ${liteBusinesses.length} Lite businesses match intent`)
          }
          
          if (filteredLiteBusinesses.length > 0) {
            // Add Lite businesses as text-only mentions with personality
            const liteIntros = [
              "Also worth checking out – these places are really solid:",
              "Oh, and a few more options that caught my eye:",
              "Plus, here are some other spots people are raving about:",
              "And don't sleep on these – they're really good too:"
            ]
            let liteText = liteIntros[Math.floor(Math.random() * liteIntros.length)] + `\n\n`
            
            filteredLiteBusinesses.slice(0, 3).forEach(b => {
            // Use actual slug from DB, fallback to generated slug, fallback to ID
            const businessSlug = b.slug || b.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || b.id
            liteText += `• **[${b.business_name}](/user/business/${businessSlug})**`
            if (b.display_category) {
              liteText += ` — ${b.display_category}`
            }
            
            // Add personality to ratings
            if (b.rating && b.rating >= 4.5) {
              liteText += ` (${b.rating}★ – really well-loved)`
            } else if (b.rating && b.rating > 0) {
              liteText += ` (${b.rating}★)`
            }
            
            // Show featured items count if they have them
            if (b.menu_preview && Array.isArray(b.menu_preview) && b.menu_preview.length > 0) {
              liteText += `\n   _${b.menu_preview.length} featured items on their menu – check it out!_`
            }
            
            // Show offers count if they have any - with excitement!
            if (b.approved_offers_count && b.approved_offers_count > 0) {
              liteText += `\n   🎉 **${b.approved_offers_count} exclusive offer${b.approved_offers_count === 1 ? '' : 's'} available!**`
            }
            
            // Add distance info with personality
            if (b.latitude && b.longitude && context.userLocation) {
              const distanceText = getDistanceInfo(b.latitude, b.longitude, context.userLocation.latitude, context.userLocation.longitude)
              if (distanceText) {
                liteText += `\n   📍 ${distanceText}`
              }
            }
            
            liteText += `\n\n`
            })
            
            aiResponse = aiResponse + liteText
          }
        }
        
        // ALWAYS show fallbackBusinesses if they exist (browse fill or intent assist)
        // These appear AFTER carousel/lite as "More places"
        if (fallbackBusinesses && fallbackBusinesses.length > 0) {
          // More conversational, personalized intros
          const moreIntros = [
            "Alright, I've got some solid picks for you! Here's what's catching my eye:",
            "So I've been digging around and found some real gems:",
            "Okay, listen – these places are definitely worth checking out:",
            "Right, so I've got a few spots that people are absolutely loving right now:",
            "Here's the deal – these are some of the top-rated places around here:",
            "I've rounded up some seriously good options for you:"
          ]
          let fallbackText = moreIntros[Math.floor(Math.random() * moreIntros.length)] + `\n\n`
          
          // Add a bit more context based on what we found
          const totalCount = fallbackBusinesses.length
          const avgRating = fallbackBusinesses.reduce((sum, b) => sum + (b.rating || 0), 0) / totalCount
          
          if (avgRating >= 4.5) {
            fallbackText += `_All of these are seriously highly rated – like, people **really** love them._\n\n`
          } else if (avgRating >= 4.0) {
            fallbackText += `_These are all solid spots with great reviews from locals and visitors._\n\n`
          }
          
          fallbackBusinesses.slice(0, 10).forEach((b, index) => {
            // Use actual slug from DB, fallback to generated slug, fallback to ID
            const businessSlug = b.slug || b.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || b.id
            
            fallbackText += `• **[${b.business_name}](/user/business/${businessSlug})**`
            
            if (b.display_category) {
              fallbackText += ` — ${b.display_category}`
            }
            
            // Add personality based on rating
            if (b.rating && b.review_count) {
              if (b.rating >= 4.7) {
                fallbackText += ` (${b.rating}★ from ${b.review_count} Google reviews – people are **obsessed** with this place 🔥)`
              } else if (b.rating >= 4.5) {
                fallbackText += ` (${b.rating}★ from ${b.review_count} Google reviews – consistently excellent)`
              } else if (b.rating >= 4.0) {
                fallbackText += ` (${b.rating}★ from ${b.review_count} Google reviews – solid choice)`
              } else {
                fallbackText += ` (${b.rating}★ from ${b.review_count} Google reviews)`
              }
            }
            
            // Show featured items for Tier 2 (claimed-free)
            if (b.tierSource === 'tier2' && b.featured_items_count && b.featured_items_count > 0) {
              fallbackText += `\n   _They've got ${b.featured_items_count} featured items on their menu – definitely worth a look_`
            }
            
            // Add distance info with personality
            if (b.latitude && b.longitude && context.userLocation) {
              const distanceText = getDistanceInfo(b.latitude, b.longitude, context.userLocation.latitude, context.userLocation.longitude)
              if (distanceText) {
                // Parse distance to add commentary
                const distanceMatch = distanceText.match(/(\d+\.?\d*)\s*(km|m)/)
                if (distanceMatch) {
                  const distance = parseFloat(distanceMatch[1])
                  const unit = distanceMatch[2]
                  
                  if (unit === 'm' || (unit === 'km' && distance < 0.5)) {
                    fallbackText += `\n   📍 Super close – ${distanceText} away (basically right there)`
                  } else if (unit === 'km' && distance < 2) {
                    fallbackText += `\n   📍 ${distanceText} away – easy walk or quick ride`
                  } else {
                    fallbackText += `\n   📍 ${distanceText} away`
                  }
                }
              }
            }
            
            if (b.phone) {
              fallbackText += `\n   📞 [Give them a call: ${b.phone}](tel:${b.phone})`
            }
            
            fallbackText += `\n\n`
          })
          
          // Add engaging footer
          if (fallbackBusinesses.length > 10) {
            fallbackText += `_...and I've got ${fallbackBusinesses.length - 10} more spots if none of these hit the mark. Just let me know what you're after!_\n\n`
          } else {
            fallbackText += `_Want more options or looking for something specific? Just ask – I've got tons more recommendations!_\n\n`
          }
          
          fallbackText += `_Ratings and reviews provided by Google_`
          
          aiResponse = aiResponse + fallbackText
        }
        
        console.log(`🗺️ Built three-tier response:`)
        console.log(`   - Tier 1 (Paid) Carousel: ${paidCarousel.length} cards`)
        console.log(`   - Tier 2 (Lite) Text: ${liteBusinesses?.length || 0} mentions`)
        console.log(`   - Tier 3 (Fallback) Text: ${fallbackBusinesses.length} mentions`)
        
      } else {
        console.log(`🗺️ Business results available but carousel gated (no list query)`)
      }
    }
    
    // ✅ LEGAL COMPLIANCE: Review text removed per Google ToS
    // We still show rating + review_count + link to Google Maps in business cards
    
    // 🗺️ ATLAS: Build mapPins array (includes ALL businesses for map display)
    // ALWAYS include ALL tiers so Atlas CTA shows whenever businesses are discussed
    const mapPins: ChatResponse['mapPins'] = []
    const addedIds = new Set<string>()
    
    // Determine if this is browse mode for reason tagging
    const isBrowseModeForReasons = !detectedIntent.hasIntent || isBrowseFallback
    
    // ✅ Helper: Safely get reasonMeta (always returns valid object, never undefined)
    const safeGetReasonMeta = (business: any, userLoc: any) => {
      try {
        const meta = getReasonMeta(business, userLoc)
        return meta || { isOpenNow: false, distanceMeters: null, ratingBadge: null }
      } catch (error) {
        console.warn('⚠️ getReasonMeta failed, using fallback:', error)
        return { isOpenNow: false, distanceMeters: null, ratingBadge: null }
      }
    }
    
    // ✅ Combine all businesses for relative ranking
    const allBusinessesForRanking = [
      ...(tier1Businesses || []),
      ...(tier2Businesses || []),
      ...(tier3Businesses || [])
    ]
    
    // Add ALL Tier 1 businesses (paid/trial) - whether carousel is shown or not
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
              isBrowseModeForReasons,
              allBusinessesForRanking // ✅ Pass all businesses for relative ranking
            ),
            reasonMeta: safeGetReasonMeta(b, context.userLocation) // ✅ Always present
          })
          addedIds.add(b.id)
        }
      })
    }
    
    // Add Tier 2 businesses (claimed-free)
    if (tier2Businesses && tier2Businesses.length > 0) {
      tier2Businesses.forEach((b: any) => {
        if (b.latitude && b.longitude && !addedIds.has(b.id)) {
          mapPins.push({
            id: b.id,
            business_name: b.business_name,
            latitude: b.latitude,
            longitude: b.longitude,
            rating: b.rating,
            review_count: b.review_count,
            display_category: b.display_category,
            business_tier: 'claimed_free',
            phone: b.phone,
            website_url: b.website_url,
            google_place_id: b.google_place_id,
            reason: getReasonTag(
              b,
              detectedIntent,
              businessRelevanceScores.get(b.id) || 0,
              context.userLocation,
              isBrowseModeForReasons,
              allBusinessesForRanking // ✅ Pass all businesses for relative ranking
            ),
            reasonMeta: safeGetReasonMeta(b, context.userLocation) // ✅ Always present
          })
          addedIds.add(b.id)
        }
      })
    }
    
    // Add Tier 3 businesses (unclaimed)
    if (tier3Businesses && tier3Businesses.length > 0) {
      tier3Businesses.forEach((b: any) => {
        if (b.latitude && b.longitude && !addedIds.has(b.id)) {
          mapPins.push({
            id: b.id,
            business_name: b.business_name,
            latitude: b.latitude,
            longitude: b.longitude,
            rating: b.rating,
            review_count: b.review_count,
            display_category: b.display_category,
            business_tier: 'unclaimed',
            phone: b.phone,
            website_url: b.website_url,
            google_place_id: b.google_place_id,
            reason: getReasonTag(
              b,
              detectedIntent,
              businessRelevanceScores.get(b.id) || 0,
              context.userLocation,
              isBrowseModeForReasons,
              allBusinessesForRanking // ✅ Pass all businesses for relative ranking
            ),
            reasonMeta: safeGetReasonMeta(b, context.userLocation) // ✅ Always present
          })
          addedIds.add(b.id)
        }
      })
    }
    
    const paidCount = mapPins.filter(p => p.business_tier === 'paid').length
    const claimedFreeCount = mapPins.filter(p => p.business_tier === 'claimed_free').length
    const unclaimedCount = mapPins.filter(p => p.business_tier === 'unclaimed').length
    console.log(`🗺️ ATLAS MAP PINS: ${mapPins.length} total (${paidCount} paid, ${claimedFreeCount} claimed-free, ${unclaimedCount} unclaimed)`)
    
    return {
      success: true,
      response: aiResponse,
      sources,
      uiMode, // Explicit UI mode for carousel gating
      hasBusinessResults, // For "Qwikker Atlas" CTA without carousel spam
      businessCarousel, // Only populated when user asks for list/map
      walletActions,
      eventCards,
      mapPins, // ✅ ATLAS: ALL businesses for map (paid cyan + unclaimed grey)
      queryCategories: detectedIntent.categories, // ✅ ATLAS: For filtering businesses by query
      queryKeywords: detectedIntent.keywords, // ✅ ATLAS: For filtering businesses by query
      modelUsed: modelToUse,
      classification
    }

  } catch (error) {
    console.error('❌ Hybrid chat error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Generate business detail response from hidden ID-based request
 */
async function generateBusinessDetailResponse(
  businessId: string,
  context: ChatContext,
  openai: OpenAI,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  console.log(`🔍 Generating detail response for business ID: ${businessId}`)
  
  // ✅ TENANT SAFETY: Pass city to ensure correct tenant context
  const supabase = await createTenantAwareServerClient(context.city)
  
  // SECURITY: UUID validation first
  if (!isValidUUID(businessId)) {
    console.error(`❌ Invalid business ID: ${businessId}`)
    return {
      success: false,
      error: 'Invalid business ID'
    }
  }
  
  // Fetch business (allow cross-city for "More details" from Atlas)
  const { data: business, error} = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', businessId)
    // ✅ REMOVED: .eq('city', context.city) to allow cross-city details
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
  
  // ✅ CONTEXT: Include recent conversation history for smarter responses
  const recentHistory = conversationHistory
    .filter(m => !m.content?.startsWith('__qwikker_')) // Strip hidden commands
    .slice(-6)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  
  // Generate concise AI response
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful local guide. Be concise, friendly, and factual. Only use provided data. No hallucinations.' 
        },
        ...recentHistory, // ✅ Include conversation context
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
    
    console.log(`✅ Generated detail response for ${business.business_name}`)
    
    return {
      success: true,
      response: aiResponse,
      businessCarousel: [{
        id: business.id,
        business_name: business.business_name,
        business_tagline: business.business_tagline,
        system_category: business.system_category,
        display_category: business.display_category,
        business_tier: business.business_tier || 'unclaimed',
        tier_priority: 99, // Fallback priority
        business_address: business.business_address,
        business_town: business.business_town,
        logo: business.logo,
        business_images: business.business_images,
        rating: business.rating,
        review_count: business.review_count,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        website_url: business.website_url,
        google_place_id: business.google_place_id
      }],
      modelUsed: 'gpt-4o-mini',
      classification: { complexity: 'simple', queryType: 'business_detail', requiresKB: false }
    }
  } catch (error) {
    console.error(`❌ Error generating detail response:`, error)
    
    // Fallback: return basic info without AI enhancement
    return {
      success: true,
      response: `${business.business_name} is located at ${business.business_address || 'this location'}. ${business.rating ? `Rated ${business.rating}★ on Google.` : ''} Want directions?`,
      businessCarousel: [{
        id: business.id,
        business_name: business.business_name,
        business_tagline: business.business_tagline,
        system_category: business.system_category,
        display_category: business.display_category,
        business_tier: business.business_tier || 'unclaimed',
        tier_priority: 99,
        business_address: business.business_address,
        business_town: business.business_town,
        logo: business.logo,
        business_images: business.business_images,
        rating: business.rating,
        review_count: business.review_count,
        latitude: business.latitude,
        longitude: business.longitude,
        phone: business.phone,
        website_url: business.website_url,
        google_place_id: business.google_place_id
      }],
      modelUsed: 'gpt-4o-mini',
      classification: { complexity: 'simple', queryType: 'business_detail', requiresKB: false }
    }
  }
}

/**
 * Extract business names from text (simplified for state tracking)
 */
function extractBusinessNamesFromText(text: string): string[] {
  const businesses: string[] = []
  const businessKeywords = [
    "David's Grill Shack",
    "Julie's Sports Pub",
    "Alexandra's Café",
    "Orchid & Ivy",
    "Mike's Pool Bar",
    "Venezy Burgers",
    "Adams Cocktail Bar"
  ]
  
  businessKeywords.forEach(business => {
    if (text.includes(business)) {
      businesses.push(business)
    }
  })
  
  return businesses
}

