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
import { createServiceRoleClient } from '@/lib/supabase/server'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

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
  businessCarousel?: Array<{
    id: string
    business_name: string
    business_tagline?: string
    business_category?: string
    business_tier: string
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
  
  if (!openai) {
    return {
      success: false,
      error: 'AI service temporarily unavailable'
    }
  }

  try {
    const { city, userName = 'there' } = context
    
    // Initialize or use existing conversation state
    let state = conversationState || createInitialState()
    
    // 🎯 STEP 1: Classify query complexity
    const classification = classifyQueryIntent(userMessage, conversationHistory)
    const modelToUse = classification.complexity === 'complex' ? 'gpt-4o' : 'gpt-4o-mini'
    
    logClassification(userMessage, classification, modelToUse)
    
    // 🎯 STEP 2: Search knowledge base with context-aware query expansion
    const searchLimit = userMessage.toLowerCase().includes('list all') ? 30 : 12
    
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
    
    const businessResults = await searchBusinessKnowledge(enhancedQuery, city, { matchCount: searchLimit })
    const cityResults = await searchCityKnowledge(userMessage, city, { matchCount: 6 })
    
    // 🎯 Fetch offer counts for businesses to enrich context
    const supabase = createServiceRoleClient()
    const businessOfferCounts: Record<string, number> = {}
    
    if (businessResults.success && businessResults.results.length > 0) {
      const businessIds = businessResults.results
        .map(r => r.business_id)
        .filter(Boolean)
        .slice(0, 5) // Check top 5 businesses only
      
      if (businessIds.length > 0) {
        const { data: offerCounts } = await supabase
          .from('business_offers')
          .select('business_id')
          .in('business_id', businessIds)
          .eq('status', 'approved')
        
        if (offerCounts) {
          offerCounts.forEach(offer => {
            businessOfferCounts[offer.business_id] = (businessOfferCounts[offer.business_id] || 0) + 1
          })
        }
      }
    }
    
    // Build knowledge context with offer availability
    const businessContext = businessResults.success && businessResults.results.length > 0
      ? businessResults.results.map(result => {
          const offerCount = result.business_id ? businessOfferCounts[result.business_id] || 0 : 0
          const offerText = offerCount > 0 ? ` [Has ${offerCount} ${offerCount === 1 ? 'offer' : 'offers'} available]` : ''
          return `**${result.business_name}**: ${result.content}${offerText}`
        }).join('\n\n')
      : ''

    const cityContext = cityResults.success && cityResults.results.length > 0
      ? cityResults.results.map(result => 
          `${result.title}: ${result.content}`
        ).join('\n\n')
      : ''
    
    // 🎯 STEP 3: Build context-aware system prompt (SIMPLE AND CLEAR)
    const stateContext = generateStateContext(state)
    
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

${stateContext ? `\nCONVERSATION CONTEXT:\n${stateContext}\n` : ''}

KNOWLEDGE RULES:
- Read the AVAILABLE BUSINESSES section carefully - all business info is there
- Business names may vary slightly (Adam's vs Adams) - they're the same business
- Opening hours are listed under "Hours:" - read the full entry before saying you don't have info
- Only say "I don't have that info" if you've genuinely checked the business entry and it's missing
- Never make up amenities, addresses, or hours
- Always bold business names like **David's Grill Shack**

🔒 STRICT NO-HALLUCINATION RULES (CRITICAL):
- ONLY mention menu items, specials, or dishes if they EXPLICITLY appear in the AVAILABLE BUSINESSES or CITY INFO sections
- If asked about a specific item/special that's NOT in the data, say "I don't have info about that specific item"
- NEVER make up menu items, chef's specials, or secret dishes based on general restaurant knowledge
- NEVER suggest items with phrases like "might have", "often have", "probably offers", or "could try"
- Secret menu items are exclusive content - they MUST be in the knowledge base to mention them
- If you don't see it in the provided data, it doesn't exist in your knowledge!

💳 OFFER HANDLING:
- If a business entry shows "[Has X offers available]", mention this naturally when relevant
- Example: "I don't have info on that specific special, but they do have 3 current offers I can show you!"
- When mentioning offers, use friendly phrasing like "Want to see their current offers?" or "I can show you what deals they have!"
- The offer cards will appear automatically after your message

🎯 CRITICAL: TIER-BASED PRESENTATION (PAID VISIBILITY!)
- Businesses are sorted by TIER (Spotlight → Featured → Starter)
- When multiple businesses match the query, mention ALL businesses of the SAME TIER together in your response
- SPOTLIGHT businesses are QWIKKER PICKS—they're paying for visibility and MUST be mentioned together and prominently
- When mentioning Spotlight businesses, casually add context like "...and that's why it's a Qwikker Pick!" or "These are Qwikker Picks for a reason!"
- Example: "**David's Grill Shack** and **Ember & Oak** both have excellent kids menus—these are Qwikker Picks for a reason!"
- NEVER drip-feed Spotlight businesses one at a time across multiple messages
- If user asks "any other places?", show the NEXT TIER (Featured), not more Spotlight businesses you forgot to mention!
- NEVER include debug messages like "⚠️ DEBUG:" or "eventCards array" in your responses—users should never see technical information

EVENT HANDLING:
- When asked about events, describe them briefly and conversationally (name, venue, day)
- DO NOT format event details with "Event:", "Date:", "Time:", etc - that's ugly!
- After mentioning, say: "Want me to pull up the event card with full details?"
- When they say yes/interested, just say "Here you go!" - the visual card will appear automatically
- NEVER manually format event info with dashes or structured text - let the cards do that!

FLOW:
${state.currentBusiness ? 
  `You're discussing ${state.currentBusiness.name}. Stay focused unless they explicitly ask about other places.` 
  : 
  'Help them discover what they want, then dive into specifics.'
}

AVAILABLE BUSINESSES:
${businessContext || 'No specific business data available - suggest they check the Discover page.'}

${cityContext ? `\nCITY INFO:\n${cityContext}` : ''}`

    // 🎯 STEP 4: Build conversation messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Last 8 messages
      { role: 'user', content: userMessage }
    ]
    
    // 🎯 STEP 5: Call appropriate model
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
    
    // 🎯 STEP 6: Update conversation state
    const extractedBusinesses = extractBusinessNamesFromText(aiResponse)
    const updatedState = updateConversationState(state, userMessage, aiResponse, extractedBusinesses)
    
    // Build sources for UI
    const sources = businessResults.success ? businessResults.results.map(result => ({
      type: 'business' as const,
      businessName: result.business_name,
      content: result.content,
      similarity: result.similarity
    })) : []
    
    // 🎯 STEP 7: Fetch wallet actions (offers) if user is asking about deals/offers
    let walletActions: ChatResponse['walletActions'] = []
    const isOfferQuery = /\b(deal|offer|discount|promo|current deal|what'?s on|special)\b/i.test(userMessage) ||
                         /\b(show|list|all|any|get|find|see|tell me).*(deal|offer)\b/i.test(userMessage)
    
    if (isOfferQuery && businessResults.success && businessResults.results.length > 0) {
      try {
        const supabase = createServiceRoleClient()
        
        // 🎯 SMART FILTERING: Only fetch offers for the business being discussed
        let targetBusinessIds: string[] = []
        
        // Check recent conversation for business mentions
        const recentContext = conversationHistory.slice(-2).map(m => m.content).join(' ')
        const mentionedBusinesses = businessResults.results.filter(result => 
          recentContext.includes(result.business_name)
        )
        
        if (state.currentBusiness?.id) {
          // User is discussing a specific business - only show their offers
          targetBusinessIds = [state.currentBusiness.id]
          console.log(`🎫 Fetching offers for current business: ${state.currentBusiness.name}`)
        } else if (mentionedBusinesses.length > 0) {
          // Use business mentioned in recent conversation (last 2 messages)
          targetBusinessIds = [mentionedBusinesses[0].business_id]
          console.log(`🎫 Fetching offers for recently mentioned business: ${mentionedBusinesses[0].business_name}`)
        } else {
          // General offer query - use TOP search result
          const topResult = businessResults.results[0]
          if (topResult?.business_id) {
            targetBusinessIds = [topResult.business_id]
            console.log(`🎫 Fetching offers for top result: ${topResult.title}`)
          }
        }
        
        if (targetBusinessIds.length > 0) {
          const { data: offers, error } = await supabase
            .from('business_offers')
            .select(`
              id,
              offer_name,
              offer_value,
              business_id,
              business_profiles!inner(business_name, city)
            `)
            .in('business_id', targetBusinessIds)
            .eq('status', 'approved')
            .eq('business_profiles.city', city)
            .limit(10)
          
          if (!error && offers && offers.length > 0) {
            walletActions = offers.map(offer => ({
              type: 'add_to_wallet',
              offerId: offer.id,
              offerName: `${offer.offer_name} - ${offer.offer_value}`,
              businessName: offer.business_profiles.business_name,
              businessId: offer.business_id
            }))
            
            console.log(`🎫 Found ${walletActions.length} wallet actions`)
          } else if (error) {
            console.error('❌ Error fetching offers:', error)
          } else {
            console.log('ℹ️ No offers found for these businesses')
          }
        }
      } catch (error) {
        console.error('❌ Error fetching wallet actions:', error)
      }
    }
    
    // 🎯 STEP 8: Fetch event cards if user is asking about events OR conversation contains events
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
        const supabase = createServiceRoleClient()
        
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
    
    return {
      success: true,
      response: aiResponse,
      sources,
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

