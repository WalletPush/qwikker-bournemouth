/**
 * Hybrid AI Chat System
 * Routes queries to GPT-4o-mini (cheap) or GPT-4o (smart) based on complexity
 */

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { classifyQueryIntent, logClassification } from './intent-classifier'
import { 
  ConversationState, 
  createInitialState, 
  updateConversationState, 
  generateStateContext 
} from './conversation-state'
import { createTenantAwareServerClient } from '@/lib/utils/tenant-security'
import { isFreeTier, isAiEligibleTier, getTierPriority } from '@/lib/atlas/eligibility'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'

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
    business_address?: string
    business_town?: string
    logo?: string
    business_images?: string[]
    rating?: number
    offers_count?: number
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
    const isEventQuery = /\b(events?|shows?|concerts?|gigs?|happening|what'?s on|things to do)\b/i.test(lowerMessage)
    
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
      
      businessResults = await searchBusinessKnowledge(enhancedQuery, city, { matchCount: searchLimit })
      cityResults = await searchCityKnowledge(userMessage, city, { matchCount: 6 })
    }
    
    // 🎯 Fetch offer counts for businesses to enrich context (DEDUPED)
    const supabase = await createTenantAwareServerClient(city)
    
    // ✅ VERIFY: Tenant context is actually set (dev-only)
    if (process.env.NODE_ENV !== 'production') {
      const { data: currentCity, error } = await supabase.rpc('get_current_city')
      console.log('🔒 [TENANT DEBUG] current city =', currentCity, error ? error.message : '')
    }
    
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
    
    // Build knowledge context with offer availability
    // 🚨 CRITICAL: Sort by tier FIRST so qwikker_picks appear at TOP
    const sortedBusinessResults = businessResults.success && businessResults.results.length > 0
      ? [...businessResults.results].sort((a, b) => {
          const tierPriority = {
            'qwikker_picks': 0,  // ⭐ QWIKKER PICK - ALWAYS FIRST
            'featured': 1,       // Featured badge
            'free_trial': 1,     // Free trial = Featured tier (same priority)
            'starter': 2,        // No badge
            'recommended': 3
          }
          const aTier = a.business_tier || 'recommended'
          const bTier = b.business_tier || 'recommended'
          const aPriority = tierPriority[aTier] ?? 999
          const bPriority = tierPriority[bTier] ?? 999
          return aPriority - bPriority
        })
      : []
    
    // 🚨 DEBUG: Log sorted order with tiers
    if (sortedBusinessResults.length > 0) {
      console.log('🎯 SORTED BUSINESS ORDER:')
      sortedBusinessResults.forEach((b, idx) => {
        console.log(`  ${idx + 1}. ${b.business_name} [TIER: ${b.business_tier || 'unknown'}]`)
      })
    }
    
    const businessContext = sortedBusinessResults.length > 0
      ? sortedBusinessResults.map(result => {
          const offerCount = result.business_id ? businessOfferCounts[result.business_id] || 0 : 0
          const offerText = offerCount > 0 ? ` [Has ${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} available]` : ''
          return `**${result.business_name}** [TIER: ${result.business_tier || 'standard'}]: ${result.content}${offerText}`
        }).join('\n\n')
      : ''

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
    
    const systemPrompt = `You're the Bournemouth Local—a witty, knowledgeable companion who helps people discover amazing businesses.

PERSONALITY:
- Conversational and natural (like a helpful friend)
- Playful with occasional jokes and wit
- Super clued up about Bournemouth
- Ask follow-up questions to understand what they really want

INTELLIGENCE:
- Use the conversation context to stay on topic
- Remember what you've already mentioned
- Make smart inferences (if discussing cocktails, "sweet" means sweet drinks)
- Build naturally on their answers

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
- Always bold business names like **David's Grill Shack**
- 🚨🚨🚨 CRITICAL: Businesses are listed in TIER ORDER - [TIER: qwikker_picks] businesses MUST be mentioned FIRST when listing multiple options!

🔒 STRICT NO-HALLUCINATION RULES (CRITICAL):
- ONLY mention menu items, specials, or dishes if they EXPLICITLY appear in the AVAILABLE BUSINESSES or CITY INFO sections
- If asked about a specific item/special that's NOT in the data, say "I don't have info about that specific item"
- NEVER make up menu items, chef's specials, or secret dishes based on general restaurant knowledge
- NEVER suggest items with phrases like "might have", "often have", "probably offers", or "could try"
- Secret menu items are exclusive content - they MUST be in the knowledge base to mention them
- If you don't see it in the provided data, it doesn't exist in your knowledge!

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

🚨🚨🚨 CLOSING COPY RULES (LEGAL/BRAND PROTECTION!): 🚨🚨🚨
- ONLY say "These are Qwikker Picks for a reason!" if EVERY SINGLE business you mentioned is [TIER: qwikker_picks]
- If you mention ANY business that is NOT [TIER: qwikker_picks], you MUST use neutral copy like "Want to see them on Atlas?" or "Need more details?"
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

🗺️ ATLAS (MAP) HANDLING:
- When user asks to see places on a map, NEVER say "I can't show you a map"
- Atlas (our interactive map) is available and will appear automatically
- Use phrases like: "Want to see these on Atlas?", "I can show you where they are!", or "Ready to explore on the map?"
- The "Show on Map" button will appear below your message when businesses are available
- Stay conversational—don't over-explain the tech, just offer it naturally

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

    const aiResponse = completion.choices[0]?.message?.content || ''
    
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
    
    if (businessResults.success && businessResults.results.length > 0) {
      // STEP 1: Dedupe by business_id (KB returns multiple rows per business)
      type KBRow = (typeof businessResults.results)[number]
      const bestHitByBusiness = new Map<string, KBRow>()
      
      for (const r of businessResults.results) {
        if (!r.business_id || !r.business_name) continue
        
        const key = r.business_id
        const existing = bestHitByBusiness.get(key)
        
        // Keep highest similarity row per business
        const rScore = (r as any).similarity ?? 0
        const eScore = existing ? ((existing as any).similarity ?? 0) : -Infinity
        
        if (!existing || rScore > eScore) bestHitByBusiness.set(key, r)
      }
      
      const uniqueBusinessIds = Array.from(bestHitByBusiness.keys())
      hasBusinessResults = uniqueBusinessIds.length > 0
      
      // STEP 2: Fetch canonical business data from business_profiles_chat_eligible
      // (Don't trust KB rows for tier/rating/categories/images)
      // CRITICAL: Use subscription-based view to prevent free listing leakage
      // This view computes effective_tier from subscriptions, NOT from stale business_tier column
      const { data: businesses } = await supabase
        .from('business_profiles_chat_eligible')
        .select(`
          id,
          business_name,
          business_tagline,
          system_category,
          display_category,
          effective_tier,
          tier_priority,
          business_address,
          business_town,
          logo,
          business_images,
          rating,
          owner_user_id,
          claimed_at
        `)
        .in('id', uniqueBusinessIds)
      
      const businessById = new Map((businesses || []).map(b => [b.id, b]))
      
      // 🎯 THREE-TIER CHAT SYSTEM: Query Tier 2 & Tier 3
      // TIER 1: Paid/Trial (already queried above via business_profiles_chat_eligible)
      // TIER 2: Claimed-Free "Lite" (query always, append below paid)
      // TIER 3: Unclaimed Fallback (query ONLY if Tier 1 AND Tier 2 are empty)
      
      // Query Tier 2: Claimed-Free businesses with featured items
      console.log('💼 Querying Tier 2: Claimed-Free Lite businesses')
      const { data: liteBusinesses } = await supabase
        .from('business_profiles_lite_eligible')
        .select('*')
        .eq('city', city)
        .limit(3) // Max 3 Lite cards
      
      console.log(`💼 Found ${liteBusinesses?.length || 0} Lite businesses`)
      
      // Query Tier 3: Unclaimed fallback directory (ONLY if Tier 1 AND Tier 2 are empty)
      let fallbackBusinesses: any[] = []
      const hasPaidResults = (businesses && businesses.length > 0)
      const hasLiteResults = (liteBusinesses && liteBusinesses.length > 0)
      
      if (!hasPaidResults && !hasLiteResults && hasBusinessResults) {
        console.log('💡 No paid or lite results - querying Tier 3: Fallback directory')
        
        const { data: fallbackData } = await supabase
          .from('business_profiles_ai_fallback_pool')
          .select('*')
          .eq('city', city)
          .limit(6)
        
        if (fallbackData && fallbackData.length > 0) {
          fallbackBusinesses = fallbackData
          console.log(`💡 Found ${fallbackBusinesses.length} fallback contacts`)
        }
      }
      
      // STEP 3: Tier priority and exclusions
      // ✅ NO LONGER NEEDED: The view business_profiles_chat_eligible already filters out ineligible businesses
      // effective_tier is computed from subscriptions and is NEVER null for eligible businesses
      // If a business appears in this view, it's safe to show in chat
      
      // STEP 4: UI Mode classifier (deterministic carousel gating)
      const msg = userMessage.toLowerCase()
      const wantsMap = /\b(map|atlas|on the map|pins|show.*location|where.*located)\b/.test(msg)
      const wantsList = /\b(show|list|options|recommend|suggest|places|where should|near me|results|give me)\b/.test(msg)
      
      let uiMode: 'conversational' | 'suggestions' | 'map'
      if (wantsMap) {
        uiMode = 'map'
      } else if (wantsList) {
        uiMode = 'suggestions'
      } else {
        uiMode = 'conversational'
      }
      
      const shouldAttachCarousel = uiMode !== 'conversational'
      
      console.log(`🎨 UI Mode: ${uiMode}, shouldAttachCarousel: ${shouldAttachCarousel}`)
      
      // STEP 5: Build final carousel (PAID-ONLY)
      // 🎯 MONETIZATION: Carousel cards are EXCLUSIVE to paid/trial tiers
      // Free tier (Tier 2 & 3) = text-only mentions (clear upsell incentive)
      if (shouldAttachCarousel && uniqueBusinessIds.length > 0) {
        // Build Tier 1 carousel (Paid/Trial ONLY)
        const paidCarousel = uniqueBusinessIds
          .map(id => businessById.get(id))
          .filter(Boolean) // Remove nulls
          .map(b => ({
            id: b!.id,
            business_name: b!.business_name,
            business_tagline: b!.business_tagline || undefined,
            system_category: b!.system_category || undefined,
            display_category: b!.display_category || b!.system_category || undefined,
            business_tier: b!.effective_tier || 'starter',
            tier_priority: b!.tier_priority || 999,
            business_address: b!.business_address || undefined,
            business_town: b!.business_town || city,
            logo: b!.logo || undefined,
            business_images: Array.isArray(b!.business_images) 
              ? b!.business_images 
              : (b!.business_images ? [b!.business_images] : undefined),
            rating: (b!.rating && b!.rating > 0) ? b!.rating : undefined,
            offers_count: businessOfferCounts[b!.id] || 0
          }))
        
        // Sort Tier 1 by tier_priority, then rating, then offers
        paidCarousel.sort((a, b) => {
          if (a.tier_priority !== b.tier_priority) return a.tier_priority - b.tier_priority
          const ar = a.rating ?? 0
          const br = b.rating ?? 0
          if (br !== ar) return br - ar
          return (b.offers_count ?? 0) - (a.offers_count ?? 0)
        })
        
        // Carousel = PAID ONLY (Tier 1)
        businessCarousel = paidCarousel.slice(0, 6)
        
        // Tier 2 & 3: TEXT-ONLY mentions (no carousel cards)
        // This creates clear upsell incentive: want carousel? upgrade!
        
        if (liteBusinesses && liteBusinesses.length > 0) {
          // Add Lite businesses as text-only mentions
          let liteText = "\n\n**Also nearby (basic listings):**\n"
          
          liteBusinesses.slice(0, 3).forEach(b => {
            liteText += `• **${b.business_name}**`
            if (b.display_category) {
              liteText += ` - ${b.display_category}`
            }
            if (b.rating && b.rating > 0) {
              liteText += ` (${b.rating}★)`
            }
            // Show featured items count if they have them
            if (b.menu_preview && Array.isArray(b.menu_preview) && b.menu_preview.length > 0) {
              liteText += ` - ${b.menu_preview.length} featured items`
            }
            // Show offers count if they have any
            if (b.approved_offers_count && b.approved_offers_count > 0) {
              liteText += ` • ${b.approved_offers_count} offer${b.approved_offers_count === 1 ? '' : 's'}`
            }
            liteText += `\n`
          })
          
          liteText += "\n_These businesses have basic listings. Contact them for more details._"
          
          aiResponse = aiResponse + liteText
          
        } else if (fallbackBusinesses && fallbackBusinesses.length > 0) {
          // Add Fallback businesses as text-only mentions (ONLY if no paid and no lite)
          let fallbackText = "\n\n**Other businesses in the area:**\n"
          fallbackText += "_I don't have confirmed menu information for these venues yet — they're imported listings and may be incomplete._\n\n"
          
          fallbackBusinesses.slice(0, 5).forEach(b => {
            fallbackText += `• **${b.business_name}**`
            if (b.display_category) {
              fallbackText += ` - ${b.display_category}`
            }
            if (b.rating && b.review_count) {
              fallbackText += ` (${b.rating}★ from ${b.review_count} Google reviews)`
            }
            if (b.phone) {
              fallbackText += `\n  📞 ${b.phone}`
            }
            fallbackText += `\n`
          })
          
          fallbackText += "\n_Ratings and reviews data provided by Google_"
          
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
    
    return {
      success: true,
      response: aiResponse,
      sources,
      uiMode, // Explicit UI mode for carousel gating
      hasBusinessResults, // For "Show on map" CTA without carousel spam
      businessCarousel, // Only populated when user asks for list/map
      walletActions,
      eventCards,
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

