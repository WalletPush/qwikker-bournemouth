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
    
    // Build knowledge context
    const businessContext = businessResults.success && businessResults.results.length > 0
      ? businessResults.results.map(result => 
          `**${result.business_name}**: ${result.content}`
        ).join('\n\n')
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
        
        // Get business IDs from search results
        const businessIds = businessResults.results
          .slice(0, 10) // Check up to 10 businesses
          .map(result => result.business_id)
          .filter(Boolean)
        
        console.log(`🎫 Fetching offers for ${businessIds.length} businesses`)
        
        if (businessIds.length > 0) {
          const { data: offers, error } = await supabase
            .from('business_offers')
            .select(`
              id,
              offer_name,
              offer_value,
              business_id,
              business_profiles!inner(business_name, city)
            `)
            .in('business_id', businessIds)
            .eq('status', 'approved')
            .eq('business_profiles.city', city)
            .limit(20) // Get more offers
          
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
    
    // Check current message
    const currentMessageMentionsEvents = /\b(event|show|concert|gig|happening|what'?s on|things to do|this weekend|tonight|tasting)\b/i.test(userMessage)
    
    // Check if events were discussed in recent conversation
    const recentConversation = conversationHistory.slice(-4).map(m => m.content).join(' ')
    const conversationMentionsEvents = /\b(event|show|concert|gig|happening|tasting experience)\b/i.test(recentConversation)
    
    // Check if user is showing interest (yes, yeah, sure, etc) after events were mentioned
    const showingInterest = /\b(yes|yeah|yep|sure|sounds good|go on|interested|tell me more|show me|pull up)\b/i.test(userMessage)
    
    const shouldFetchEvents = currentMessageMentionsEvents || (conversationMentionsEvents && showingInterest)
    
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
        
        // Check if user is asking about a specific event mentioned in conversation
        const specificEventMentioned = conversationHistory
          .slice(-3)
          .reverse()
          .find(msg => msg.role === 'assistant' && /\b(event|tasting|concert|show|gig)\b/i.test(msg.content))
        
        let eventTitleFilter: string | null = null
        
        if (specificEventMentioned && showingInterest) {
          // Extract event name from AI's message (look for quoted text or title case phrases)
          const quotedMatch = specificEventMentioned.content.match(/["']([^"']+)["']/i)
          const titleCaseMatch = specificEventMentioned.content.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/)
          
          if (quotedMatch) {
            eventTitleFilter = quotedMatch[1]
          } else if (titleCaseMatch) {
            eventTitleFilter = titleCaseMatch[1]
          }
          
          // Also check for specific event titles we know about
          if (specificEventMentioned.content.includes('Tasting Experience')) {
            eventTitleFilter = 'The Tasting Experience'
          }
        }
        
        console.log(`🔍 Specific event filter:`, eventTitleFilter)
        
        let query = supabase
          .from('business_events')
          .select(`
            id,
            title,
            description,
            event_type,
            start_date,
            start_time,
            end_date,
            end_time,
            location,
            ticket_url,
            image_url,
            business_id,
            business_profiles!inner(business_name, city)
          `)
          .eq('status', 'approved')
          .eq('business_profiles.city', city)
          .gte('start_date', new Date().toISOString().split('T')[0]) // Only future events
          .order('start_date', { ascending: true })
        
        // If specific event mentioned, filter by title
        if (eventTitleFilter) {
          query = query.ilike('title', `%${eventTitleFilter}%`)
        } else {
          query = query.limit(10)
        }
        
        const { data: events, error } = await query
        
        if (!error && events && events.length > 0) {
          eventCards = events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            event_type: event.event_type,
            start_date: event.start_date,
            start_time: event.start_time,
            end_date: event.end_date,
            end_time: event.end_time,
            location: event.location,
            ticket_url: event.ticket_url,
            image_url: event.image_url,
            business_name: event.business_profiles.business_name,
            business_id: event.business_id
          }))
          
          console.log(`🎉 Found ${eventCards.length} event cards to show${eventTitleFilter ? ` (filtered by: ${eventTitleFilter})` : ''}`)
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

