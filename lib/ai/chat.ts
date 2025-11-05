'use server'

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

/**
 * Extract specific options mentioned by the AI for contextual quick replies
 * E.g., "Italian, Indian, or something else?" → ["Italian", "Indian", "Something else"]
 */
function extractOptionsFromAIResponse(aiResponse: string): string[] {
  if (!aiResponse) return []
  
  const options: string[] = []
  
  // Pattern 1: "A, B, or C?" or "A, B, or something else?"
  // More sophisticated pattern to handle multiple items separated by commas and "or"
  const listPattern = /([A-Z][a-zA-Z\s]*(?:,\s*[A-Z][a-zA-Z\s]*)*),?\s*or\s+([a-zA-Z\s]+)/gi
  let listMatch = listPattern.exec(aiResponse)
  if (listMatch) {
    // Split the first part by commas to get individual items
    const firstPart = listMatch[1]
    const items = firstPart.split(',').map(item => item.trim()).filter(item => item.length > 0)
    items.forEach(item => options.push(item))
    
    // Add the "or" part
    if (listMatch[2] && listMatch[2].trim()) {
      options.push(listMatch[2].trim())
    }
  }
  
  // Fallback: Simple pattern for "A or B" without commas
  if (options.length === 0) {
    const simpleOrPattern = /([A-Z][a-zA-Z\s-]+)\s+or\s+([a-zA-Z\s-]+)/gi
    let simpleMatch = simpleOrPattern.exec(aiResponse)
    if (simpleMatch) {
      options.push(simpleMatch[1].trim())
      options.push(simpleMatch[2].trim())
    }
  }
  
  // Pattern 2: Look for specific cuisine types mentioned
  const cuisineTypes = [
    'Italian', 'Indian', 'Chinese', 'Thai', 'Mexican', 'Japanese', 'French', 'Greek', 
    'American', 'British', 'Mediterranean', 'Asian', 'European', 'Middle Eastern',
    'Korean', 'Vietnamese', 'Spanish', 'Turkish', 'Lebanese', 'Moroccan'
  ]
  
  const foodTypes = [
    'burger', 'burgers', 'pizza', 'pasta', 'sushi', 'tacos', 'sandwiches', 'salads',
    'steaks', 'seafood', 'chicken', 'beef', 'pork', 'vegetarian', 'vegan',
    'coffee', 'drinks', 'cocktails', 'beer', 'wine', 'desserts', 'breakfast'
  ]
  
  // Check for cuisine mentions
  cuisineTypes.forEach(cuisine => {
    if (aiResponse.toLowerCase().includes(cuisine.toLowerCase()) && !options.some(opt => opt.toLowerCase().includes(cuisine.toLowerCase()))) {
      options.push(cuisine)
    }
  })
  
  // Check for food type mentions
  foodTypes.forEach(food => {
    if (aiResponse.toLowerCase().includes(food) && !options.some(opt => opt.toLowerCase().includes(food))) {
      // Capitalize first letter
      options.push(food.charAt(0).toUpperCase() + food.slice(1))
    }
  })
  
  // Pattern 3: "something else" variations
  if (aiResponse.toLowerCase().includes('something else') && !options.some(opt => opt.toLowerCase().includes('something else'))) {
    options.push('Something else')
  }
  
  if (aiResponse.toLowerCase().includes('other options') && !options.some(opt => opt.toLowerCase().includes('other'))) {
    options.push('Other options')
  }
  
  // Pattern 4: Budget-related options
  if (aiResponse.toLowerCase().includes('budget') || aiResponse.toLowerCase().includes('cheap') || aiResponse.toLowerCase().includes('expensive')) {
    if (aiResponse.toLowerCase().includes('budget') && !options.includes('Budget-friendly')) {
      options.push('Budget-friendly')
    }
    if ((aiResponse.toLowerCase().includes('premium') || aiResponse.toLowerCase().includes('expensive')) && !options.includes('Premium')) {
      options.push('Premium')
    }
  }
  
  // Clean up and deduplicate
  const cleanedOptions = options
    .map(opt => {
      const trimmed = opt.trim()
      // Capitalize "something else" and "maybe something else" properly
      if (trimmed.toLowerCase().includes('something else')) {
        return 'Something else'
      }
      return trimmed
    })
    .filter(opt => opt.length > 0 && opt.length < 30) // Increased length limit
    .filter((opt, index, arr) => arr.findIndex(o => o.toLowerCase() === opt.toLowerCase()) === index) // Deduplicate
  
  return cleanedOptions
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatContext {
  city: string
  userName?: string
  walletPassId?: string
  conversationHistory?: ChatMessage[]
}

/**
 * Extract business names from conversation text for context awareness
 */
function extractBusinessNamesFromText(text: string): string[] {
  const businessNames: string[] = []
  const lowerText = text.toLowerCase()
  
  console.log(`🔍 EXTRACTING BUSINESSES FROM: "${text}"`)
  
  // 🎯 PRECISE BUSINESS DETECTION: Use exact business name matching
  const businessMap = [
    { names: ["David's Grill Shack"], keywords: ['david', 'grill shack', "david's grill", "grill shack"] },
    { names: ["Julie's Sports Pub"], keywords: ['julie', 'sports pub', "julie's sports", "sports pub"] },
    { names: ["Alexandra's Café"], keywords: ['alexandra', 'café', 'cafe', "alexandra's café", "alexandra's cafe"] },
    { names: ["Orchid & Ivy"], keywords: ['orchid', 'ivy', 'orchid & ivy', 'orchid and ivy'] },
    { names: ["Mike's Pool Bar"], keywords: ['mike', 'pool bar', "mike's pool", "pool bar"] },
    { names: ["Venezy Burgers"], keywords: ['venezy', 'venezy burgers'] }
  ]
  
  // Check each business for matches
  businessMap.forEach(business => {
    const hasMatch = business.keywords.some(keyword => lowerText.includes(keyword))
    if (hasMatch && !businessNames.includes(business.names[0])) {
      console.log(`✅ FOUND: ${business.names[0]} (matched keyword in text)`)
      businessNames.push(business.names[0])
    }
  })
  
  console.log(`🎯 FINAL EXTRACTED BUSINESSES: [${businessNames.join(', ')}]`)
  return businessNames
}

type ConversationTopic = 'food' | 'drinks' | 'offers' | 'events' | 'general'

function inferConversationTopic(history: ChatMessage[], latestMessage: string): ConversationTopic {
  const recentUserText = history
    ?.filter(msg => msg.role === 'user')
    ?.slice(-6)
    ?.map(msg => msg.content.toLowerCase())
    ?.join(' ') || ''

  const combinedText = `${recentUserText} ${latestMessage.toLowerCase()}`

  const topicMatchers: Array<{ topic: ConversationTopic; keywords: string[] }> = [
    { topic: 'food', keywords: ['food', 'eat', 'restaurant', 'burger', 'pizza', 'curry', 'spicy', 'dinner', 'lunch', 'breakfast', 'brunch', 'bite'] },
    { topic: 'drinks', keywords: ['drink', 'cocktail', 'beer', 'wine', 'pub', 'bar', 'night out', 'pint', 'glass', 'cheers'] },
    { topic: 'offers', keywords: ['offer', 'deal', 'discount', 'voucher', '2-for', 'two for', 'half price', 'save', 'freebie'] },
    { topic: 'events', keywords: ['event', 'gig', 'live', 'show', 'festival', 'activity', 'things to do'] }
  ]

  for (const matcher of topicMatchers) {
    if (matcher.keywords.some(keyword => combinedText.includes(keyword))) {
      console.log(`🎯 INFERRED TOPIC: ${matcher.topic}`)
      return matcher.topic
    }
  }

  return 'general'
}

interface KnowledgeSearchResult {
  business_id?: string
  business_name?: string
  content: string
  similarity: number
  knowledge_type?: string
}

function collectUniqueBusinessResults(results: KnowledgeSearchResult[] = []): KnowledgeSearchResult[] {
  const seen = new Set<string>()
  const unique: KnowledgeSearchResult[] = []

  results.forEach(result => {
    if (!result) return
    const keySource = result.business_id || result.business_name || result.content?.slice(0, 80) || Math.random().toString(36)
    const key = keySource.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(result)
    }
  })

  return unique
}

function extractBusinessSummary(content: string): string {
  if (!content) return 'Local favourite with plenty going on.'

  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const descriptiveLine = lines.find(line => !/^business:/i.test(line) && !/^category:/i.test(line) && !/^type:/i.test(line) && !/^address:/i.test(line) && !/^opening hours/i.test(line) && !/^timezone/i.test(line))
  const offerLine = lines.find(line => /offer:/i.test(line))

  let summary = descriptiveLine || lines[0] || 'Great local spot.'
  summary = summary.replace(/^[-•]\s*/, '')

  if (offerLine && !summary.toLowerCase().includes('offer')) {
    const cleanedOffer = offerLine.replace(/^[\s*-•]+/, '').replace(/offer:\s*/i, '')
    summary = `${summary} (Deal: ${cleanedOffer.trim()})`
  }

  if (summary.length > 160) {
    summary = `${summary.slice(0, 157)}...`
  }

  return summary
}

function buildAutoRecommendationMessage(city: string, topic: ConversationTopic, picks: KnowledgeSearchResult[], userMessage: string): string {
  const prettyCity = city ? `${city.charAt(0).toUpperCase()}${city.slice(1)}` : 'town'
  const lowerMessage = userMessage.toLowerCase()

  let intro: string
  if (topic === 'food') {
    if (lowerMessage.includes('hearty')) {
      intro = `If you're craving hearty plates in ${prettyCity}, I'd line up:`
    } else if (lowerMessage.includes('casual')) {
      intro = `Keeping it laid-back? Try these local favourites in ${prettyCity}:`
    } else {
      intro = `Here’s what I’d book for food in ${prettyCity}:`
    }
  } else if (topic === 'drinks') {
    intro = `Thirsty work! These spots in ${prettyCity} pour a cracking drink:`
  } else if (topic === 'offers') {
    intro = `Deal radar switched on. These Bournemouth offers are worth a look:`
  } else if (topic === 'events') {
    intro = `Fancy getting out and about? Here’s what’s buzzing around ${prettyCity}:`
  } else {
    intro = `Here’s what I’d shout about in ${prettyCity}:`
  }

  const recommendationLines = picks.map((result, index) => {
    const name = result.business_name ? `**${result.business_name}**` : '**This spot**'
    const summary = extractBusinessSummary(result.content)
    const prefix = index === 0 ? '• First stop' : index === 1 ? '• Next up' : '• Also worth a look'
    return `${prefix}: ${name} — ${summary}`
  })

  const closing = `Want me to pull their menu, add the offer to your wallet, or line up another idea?`

  return `${intro}
${recommendationLines.join('\n')}
${closing}`.trim()
}

function buildKnowledgeSources(
  businessResults: { results?: KnowledgeSearchResult[] } | undefined,
  cityResults: { results?: { content: string; similarity: number }[] } | undefined
) {
  const sources = [
    ...(businessResults?.results || []).map(result => ({
      type: 'business' as const,
      businessName: result.business_name,
      content: result.content,
      similarity: result.similarity
    })),
    ...(cityResults?.results || []).map(result => ({
      type: 'city' as const,
      content: result.content,
      similarity: result.similarity
    }))
  ]

  return sources.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
}

type DetailRequest = 'menu' | 'drinks' | 'offers' | 'hours' | 'kids' | 'vegetarian' | 'pricing'

function detectDetailRequest(text: string): DetailRequest | null {
  if (!text) return null
  const lower = text.toLowerCase()

  if (/(cocktail|drink|bevv|bevvy|bar|pint|wine)/.test(lower)) return 'drinks'
  if (/(menu|food|eat|dish|course|starter|dessert)/.test(lower)) return 'menu'
  if (/(offer|deal|discount|wallet|voucher)/.test(lower)) return 'offers'
  if (/(open|hour|time|closing)/.test(lower)) return 'hours'
  if (/(kid|child|family)/.test(lower)) return 'kids'
  if (/(veggie|vegetarian|vegan|plant)/.test(lower)) return 'vegetarian'
  if (/(price|cost|expensive|cheap|affordable)/.test(lower)) return 'pricing'

  return null
}

/**
 * Generate AI response using RAG (Retrieval-Augmented Generation)
 */
export async function generateAIResponse(
  userMessage: string,
  context: ChatContext,
  conversationHistory: ChatMessage[] = []
): Promise<{
  success: boolean
  response?: string
  error?: string
  sources?: Array<{
    type: 'business' | 'city'
    businessName?: string
    content: string
    similarity: number
  }>
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
}> {
  if (!openai) {
    return {
      success: false,
      error: 'AI service temporarily unavailable'
    }
  }

  try {
    const { city, userName = 'there', conversationHistory = [] } = context

  // 🎯 ENHANCED CONTEXT AWARENESS: Detect mentioned businesses from conversation history
  console.log(`🔍 RAW CONVERSATION HISTORY:`, conversationHistory)
  
  // 🚨 CRITICAL FIX: Track the MOST RECENT business mentioned by AI (not user)
  let currentBusinessContext = ''
  const recentAIMessages = conversationHistory
    ?.filter(msg => msg.role === 'assistant')
    ?.slice(-1) // Only the LAST AI message for precision
    ?.map(msg => msg.content)
    ?.join(' ') || ''
  
  console.log(`🤖 MOST RECENT AI MESSAGE: "${recentAIMessages}"`)
  
  // Extract businesses from ONLY the most recent AI response (what AI was just talking about)
  const aiMentionedBusinesses = extractBusinessNamesFromText(recentAIMessages)
  console.log(`🤖 AI was just talking about: [${aiMentionedBusinesses?.join(', ') || 'none'}]`)
  
  // For follow-up questions, ONLY use the business from the immediate previous AI response
  const userMentionedBusinesses = extractBusinessNamesFromText(userMessage)
  console.log(`👤 USER mentioned: [${userMentionedBusinesses?.join(', ') || 'none'}]`)
  
  // 🎯 SMART: Prioritize businesses in this order:
  // 1. User explicitly mentions a business in current message
  // 2. AI was just talking about a business (for follow-ups like "do they sell anything else?")
  const mentionedBusinesses = userMentionedBusinesses.length > 0 ? userMentionedBusinesses : aiMentionedBusinesses
  
  console.log(`🎯 Context check: mentioned businesses: ${mentionedBusinesses?.join(', ') || 'none'}`)
  console.log(`🔍 DEBUG: userMessage="${userMessage}"`)
  console.log(`🔍 DEBUG: recentAIMessages="${recentAIMessages}"`)

  const lowerMessage = userMessage.toLowerCase()
  const inferredTopic = inferConversationTopic(conversationHistory, userMessage)
  const friendlyTopicLabel = {
    food: 'food spots',
    drinks: 'drink spots',
    offers: 'offers worth grabbing',
    events: 'things to do',
    general: 'places'
  }[inferredTopic]

  const clarifierPhrases = [
    'what kind of',
    'what are you in the mood',
    'what you in the mood',
    'what are you after',
    'what you after',
    'looking for',
    'fancy',
    'shall i',
    'want me to'
  ]

  const assistantMessages = conversationHistory
    ?.filter(msg => msg.role === 'assistant')
    ?.slice(-4) || []

  const lastAssistantMessage = assistantMessages.slice(-1)[0]?.content.toLowerCase() || ''
  const assistantWasClarifying = clarifierPhrases.some(phrase => lastAssistantMessage.includes(phrase))

  const lastAssistantOpening = lastAssistantMessage
    ? lastAssistantMessage.trim().split(/\s+/).slice(0, 2).join(' ')
    : ''

  const assistantClarifierCount = assistantMessages.reduce((count, msg) => {
    const content = msg.content.toLowerCase()
    return clarifierPhrases.some(phrase => content.includes(phrase)) ? count + 1 : count
  }, 0)

  const lastAssistantDetailRequest = detectDetailRequest(lastAssistantMessage)
  const simpleAffirmative = /^(yeah!?|yes!?|yep!?|sure!?|ok!?|okay!?|alright!?|do it|go on|please do|sounds good!?|perfect!?|cool!?|let's do it|why not)$/i.test(userMessage.trim())
  const forceDetailForCurrentBusiness = simpleAffirmative && lastAssistantDetailRequest && mentionedBusinesses.length > 0

  const userGaveOpenChoice = /(whatever|anything|either|you decide|surprise me|not fussed|not bothered|up to you|whatever\'s good|whatever good|whatever you think|i trust you|something else|happy with anything|you pick)/i.test(lowerMessage)
  const isShortAnswer = lowerMessage.replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).length <= 4 && !lowerMessage.includes('?')
  console.log(`🎯 Topic inference: ${inferredTopic}, assistantClarifying=${assistantWasClarifying}, userOpenChoice=${userGaveOpenChoice}, shortAnswer=${isShortAnswer}`)
 
  // 🎯 SMART: Detect simple follow-up responses that need context
  const isSimpleFollowUp = /^(yeah!?|yes!?|yep!?|sure!?|okay!?|ok!?|tell me more!?|more info!?|sounds good!?|that sounds great!?|perfect!?|awesome!?)$/i.test(userMessage.trim()) ||
                           /^(what about|tell me about|how about) (them|it|that|those)(\?)?$/i.test(userMessage.trim()) ||
                           userMessage.toLowerCase().trim() === 'more' ||
                           userMessage.toLowerCase().trim() === 'details' ||
                           userMessage.toLowerCase().trim() === 'info'
  
  // 🎯 CRITICAL: Detect "what else do they" type questions (referring to current business)
  const isCurrentBusinessQuery = userMessage.toLowerCase().includes('what else do they') ||
                                 userMessage.toLowerCase().includes('what else does it') ||
                                 userMessage.toLowerCase().includes('what else can they') ||
                                 userMessage.toLowerCase().includes('what do they') ||
                                 userMessage.toLowerCase().includes('do they') ||
                                 userMessage.toLowerCase().includes('are they') ||
                                 isSimpleFollowUp

  // 🎯 SMART: Detect "anywhere else?" type queries (looking for DIFFERENT businesses)
  const isAnywhereElseQuery = userMessage.toLowerCase().includes('anywhere else') ||
                             userMessage.toLowerCase().includes('other places') ||
                             userMessage.toLowerCase().includes('more options') ||
                             userMessage.toLowerCase().includes('alternatives') ||
                             userMessage.toLowerCase().includes('something different') ||
                             // Only "what else" if NOT asking about current business ("what else do they serve")
                             (userMessage.toLowerCase().includes('what else') && 
                              !userMessage.toLowerCase().includes('they') && 
                              !userMessage.toLowerCase().includes('their') &&
                              !userMessage.toLowerCase().includes('there'))

  // 🎯 SMART: Only treat as specific business query if DIRECTLY asking about that business
  const isSpecificBusinessQuery = mentionedBusinesses.length > 0 && !isAnywhereElseQuery && (
    userMessage.toLowerCase().includes('they') ||
    userMessage.toLowerCase().includes('their') ||
    userMessage.toLowerCase().includes('there') ||
    userMessage.toLowerCase().includes('what about them') ||
    userMessage.toLowerCase().includes('tell me about') ||
    userMessage.toLowerCase().includes('how about') ||
    userMessage.toLowerCase().includes('what else do they') ||
    userMessage.toLowerCase().includes('what else does it') ||
    userMessage.toLowerCase().includes('what else can they') ||
    userMessage.toLowerCase().includes('are they') ||
    userMessage.toLowerCase().includes('do they') ||
    userMessage.toLowerCase().includes('can they') ||
    userMessage.toLowerCase().includes('will they') ||
    userMessage.toLowerCase().includes('how much are they') ||
    userMessage.toLowerCase().includes('expensive') && userMessage.toLowerCase().includes('they') ||
    // Direct business name mentions in current message
    mentionedBusinesses.some(business => 
      userMessage.toLowerCase().includes(business.toLowerCase().split(' ')[0]) // First word of business name
    )
  )
  console.log(`🎯 Specific business query: ${isSpecificBusinessQuery}, anywhere else: ${isAnywhereElseQuery}, mentioned: ${mentionedBusinesses?.join(', ') || 'none'}`)

  // 🎯 Build contextual guidance for AI
    let contextualGuidance = ''

  if (lastAssistantOpening) {
    contextualGuidance += `\n- 🔄 Your previous reply opened with "${lastAssistantOpening}". Use a different opening line this time.`
  }

  let shouldAutoRecommend = inferredTopic !== 'general' && (
    userGaveOpenChoice ||
    isSimpleFollowUp ||
    (assistantWasClarifying && (userGaveOpenChoice || isShortAnswer)) ||
    (assistantClarifierCount >= 1 && isShortAnswer)
  )

  if (forceDetailForCurrentBusiness) {
    shouldAutoRecommend = false
    const targetBusiness = mentionedBusinesses[0]
    const detailLabel = {
      drinks: 'drinks and cocktails',
      menu: 'menu items',
      offers: 'current offers',
      hours: 'opening hours',
      kids: 'kids menu',
      vegetarian: 'vegetarian options',
      pricing: 'pricing'
    }[lastAssistantDetailRequest!] || 'details'

    contextualGuidance += `\n- ✅ The user just confirmed they want the ${detailLabel} for ${targetBusiness}. Give them those details immediately using the knowledge base. No more clarifying questions.`
    contextualGuidance += `\n- ❗ Stay with ${targetBusiness}. Do NOT pivot to other businesses unless they ask.`
  }
    
    // 🚨 CRITICAL: Handle current business context (what AI was just talking about)
    if (isCurrentBusinessQuery && mentionedBusinesses.length > 0) {
      const currentBusiness = mentionedBusinesses[0] // Use the first (most recent) business
      contextualGuidance += `\n- 🚨 CRITICAL OVERRIDE: User is asking about ${currentBusiness} specifically (the business you were just discussing) - ONLY answer about ${currentBusiness}, DO NOT suggest alternatives, DO NOT mention competitors!`
      contextualGuidance += `\n- 🚨 MANDATORY: When user says "they/their/there/what else do they/yeah" they mean ${currentBusiness} - NOT any other business!`
      contextualGuidance += `\n- 🚨 CONTEXT: You were just talking about ${currentBusiness}, so continue that conversation naturally!`
      
      // Exclude other businesses from being mentioned
      const otherBusinesses = ["David's Grill Shack", "Julie's Sports Pub", "Orchid & Ivy", "Mike's Pool Bar", "Alexandra's Café"]
        .filter(b => b !== currentBusiness)
      contextualGuidance += `\n- 🚨 FORBIDDEN: Do NOT mention ${otherBusinesses.join(', ')} unless specifically asked!`
    } else if (isSpecificBusinessQuery && mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🚨 CRITICAL OVERRIDE: User is asking about ${mentionedBusinesses?.join(' or ') || 'unknown business'} specifically - ONLY answer about that business, DO NOT suggest alternatives, DO NOT mention competitors, DO NOT recommend other places!`
      contextualGuidance += `\n- 🚨 MANDATORY: When user says "they/their/there/what else do they" they mean ${mentionedBusinesses?.join(' or ') || 'the business'} - NOT any other business!`
    } else if (isAnywhereElseQuery && mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🎯 CRITICAL: User asked "anywhere else?" after mentioning ${mentionedBusinesses?.join(' or ') || 'a business'} - they want DIFFERENT businesses! Show other options but DO NOT mention ${mentionedBusinesses?.join(' or ') || 'that business'} again!`
    } else if (mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🎯 CONTEXT: User previously mentioned ${mentionedBusinesses?.join(' or ') || 'a business'} but is now asking a GENERAL question - answer broadly and include ALL relevant businesses, not just the previously mentioned ones!`
    }
    
    // Check for time/date requests
    const isTimeRequest = userMessage.toLowerCase().includes('open') || 
                         userMessage.toLowerCase().includes('hours') ||
                         userMessage.toLowerCase().includes('time')
    const isDateNightRequest = userMessage.toLowerCase().includes('date') || 
                              userMessage.toLowerCase().includes('romantic') ||
                              userMessage.toLowerCase().includes('couple')
    const isFamilyRequest = userMessage.toLowerCase().includes('family') || 
                           userMessage.toLowerCase().includes('kids') ||
                           userMessage.toLowerCase().includes('children')
    const isPremiumRequest = userMessage.toLowerCase().includes('premium') || 
                            userMessage.toLowerCase().includes('best') ||
                            userMessage.toLowerCase().includes('finest')
    const isQuickBiteRequest = userMessage.toLowerCase().includes('quick') || 
                              userMessage.toLowerCase().includes('fast') ||
                              userMessage.toLowerCase().includes('takeaway')
    const isQwikkerPicksRequest = userMessage.toLowerCase().includes('qwikker pick') || 
                                 userMessage.toLowerCase().includes('spotlight') ||
                                 userMessage.toLowerCase().includes('featured')
    
    if (isTimeRequest) {
      contextualGuidance += "\n- PRIORITY: User asking about current availability - focus on opening hours and what's open NOW"
    }
    if (isDateNightRequest) {
      contextualGuidance += "\n- CONTEXT: User wants romantic/date night options - suggest upscale, intimate venues with ambiance"
    }
    if (isFamilyRequest) {
      contextualGuidance += "\n- CONTEXT: User needs family-friendly options - mention kid-friendly venues and family deals"
    }
    if (isPremiumRequest) {
      contextualGuidance += "\n- CONTEXT: User specifically wants premium recommendations - highlight Qwikker Picks (spotlight tier) businesses FIRST"
    }
    if (isQuickBiteRequest) {
      contextualGuidance += "\n- CONTEXT: User wants something quick - focus on fast service, takeaway options, grab-and-go"
    }
    if (isQwikkerPicksRequest) {
      contextualGuidance += "\n- CONTEXT: User specifically wants premium recommendations - highlight Qwikker Picks (spotlight tier) businesses FIRST"
    }

    // 🎯 CONTEXT INTELLIGENCE: Track conversation topics and user preferences
    const conversationTopics = conversationHistory
      ?.map(msg => msg.content.toLowerCase())
      ?.join(' ') || ''

        // Detect ongoing conversation topics - CHECK CURRENT MESSAGE TOO!
        const fullConversationText = conversationTopics + ' ' + userMessage.toLowerCase()
        const isCocktailConversation = fullConversationText.includes('cocktail') || 
                                      fullConversationText.includes('drink') || 
                                      fullConversationText.includes('fruity') || 
                                      fullConversationText.includes('smoky') || 
                                      fullConversationText.includes('spicy') ||
                                      fullConversationText.includes('beverage') ||
                                      fullConversationText.includes('bar')

    const isFoodConversation = fullConversationText.includes('food') || 
                              fullConversationText.includes('restaurant') || 
                              fullConversationText.includes('burger') || 
                              fullConversationText.includes('pizza')

    // Smart context guidance based on conversation flow
        console.log(`🔍 CONTEXT DEBUG: fullText="${fullConversationText}", isCocktailConversation=${isCocktailConversation}, userMessage="${userMessage}"`)
    
    if (isCocktailConversation && userMessage.toLowerCase().includes('sweet')) {
      console.log(`🎯 CONTEXT INTELLIGENCE TRIGGERED: Sweet cocktails detected!`)
      contextualGuidance += `\n- 🎯 CRITICAL CONTEXT OVERRIDE: User said "sweet" in a COCKTAIL conversation - they want SWEET COCKTAILS, NOT DESSERTS! Focus ONLY on sweet cocktail recommendations from David's Grill Shack and other bars. DO NOT ask about desserts!`
    }
    
    // 🎯 GENERAL COCKTAIL CONVERSATION GUIDANCE
    if (isCocktailConversation) {
      console.log(`🍹 COCKTAIL CONVERSATION DETECTED - Adding cocktail-specific guidance`)
      contextualGuidance += `\n- 🍹 COCKTAIL CONTEXT: This is a conversation about cocktails/drinks - focus on bars, cocktail menus, drink recommendations, and beverage-related offers. Mention David's Grill Shack cocktails and Julie's Sports Pub drinks.`
    }

    if (isFoodConversation && (userMessage.toLowerCase().includes('spicy') || userMessage.toLowerCase().includes('mild'))) {
      contextualGuidance += `\n- 🎯 CONTEXT INTELLIGENCE: User specified spice preference in a FOOD conversation - recommend food options with that spice level.`
    }

    // 🎯 RESPONSE VARIETY: Prevent repetitive responses
    const previousResponses = conversationHistory
      ?.filter(msg => msg.role === 'assistant')
      ?.slice(-3) // Last 3 AI responses
      ?.map(msg => msg.content.toLowerCase()) || []

    if (previousResponses.some(response => response.includes('fancy a tipple'))) {
      contextualGuidance += `\n- 🎯 VARIETY: You've already used "fancy a tipple" - use different phrasing like "thirsty work" or "time for a bevvy" or "looking for liquid refreshment"`
    }

    if (previousResponses.some(response => response.includes('ooh'))) {
      contextualGuidance += `\n- 🎯 VARIETY: You've already used "Ooh" - try "Right then", "Well well", "Ah", "Perfect", or "Brilliant" instead`
    }

    if (previousResponses.length > 0) {
      contextualGuidance += `\n- 🎯 VARIETY: Vary your greeting and tone from previous responses - don't repeat the same opening phrases`
    }

    // 1. Search for relevant knowledge using vector similarity (increased for accuracy)
    const [businessResults, cityResults] = await Promise.all([
      searchBusinessKnowledge(userMessage, city, { matchCount: 12 }), // Increased for chunked content
      searchCityKnowledge(userMessage, city, { matchCount: 6 })       // Increased for better coverage
    ])
 
    const uniqueBusinessResults = collectUniqueBusinessResults(businessResults.results || [])
    const sources = buildKnowledgeSources(businessResults, cityResults)
    const autoRecommendationActive = shouldAutoRecommend && uniqueBusinessResults.length > 0

 
    // 2. Build context from search results (clean format)
    const businessContext = businessResults.success && businessResults.results.length > 0
      ? businessResults.results.map(result => 
          `${result.business_name}: ${result.content}`
        ).join('\n\n')
      : ''

    const cityContext = cityResults.success && cityResults.results.length > 0
      ? cityResults.results.map(result => 
          `${result.title}: ${result.content}`
        ).join('\n\n')
      : ''

    // 3. Build smart, context-aware system prompt (contextualGuidance already built above)

    console.log(`🎯 FINAL CONTEXTUAL GUIDANCE: ${contextualGuidance}`)
    
    const systemPrompt = `You're the Bournemouth Local—the easy-going mate who always knows where to head next. Talk like you're texting a friend: confident, helpful, a bit cheeky when it fits. Never sound like a call centre script.${contextualGuidance ? `\n\nCONTEXT: ${contextualGuidance}` : ''}

${isSimpleFollowUp ? `\nUser just said "${userMessage}" — they're replying to what you told them a moment ago. Pick up the thread naturally.` : ''}

VOICE & VIBE:
- Keep responses to 1–2 punchy sentences. Switch up your openers — "Right then", "Sounds like", "If you fancy", "Alright then" — so it never feels copy-pasted.
- Sprinkle in Bournemouth flavour (seafront strolls, beachy sunsets, cosy town-centre vibes) when it helps paint the picture.
- Emojis sparingly (max two) to add warmth: 🍔 for food, 🍻 for drinks, 💰 for deals, ⏰ for timing. No emojis inside business names or facts.
- Always finish your sentences; never leave the message hanging mid-thought.

FLOW GUARDRAILS:
- One clarifier max. As soon as they give you anything ("something else", "whatever's good", "hearty"), dive straight into recommendations.
- If they confirm with "yeah", "sure", "go on" after you offer more detail, deliver that detail immediately — stay on the same business until they change topic.
- Never ask the same question twice. Acknowledge their answer, build on it, and keep momentum.

LOCAL PLAYBOOK:
- Highlight 2–3 Bournemouth picks with quick reasons. Lead with Qwikker Picks or standout locals, then offer to pull menus, add to wallet, or line up more options.
- When someone asks for kids menus, veggie dishes, pricing, etc., stick to the knowledge base facts and stay with the current business unless they ask to branch out.
- If they say "anywhere else?", pivot to fresh venues — don't repeat yourself.

AFTERCARE & NEXT STEPS:
- Close each response with a gentle next move: offer to pull cards, add to wallet, fetch more options, or drill into menus. Think "Want me to grab their cocktail list?" or "Need another idea up the coast?".
- Quick replies should always suggest the next logical tap (e.g., "Show drinks menu", "Add this offer to my wallet", "Any veggie dishes?").

KNOWLEDGE GUARDRAILS:
- Only use the information in the AVAILABLE BUSINESSES block. If the knowledge base lists menu items or offers, mention them accurately with prices where possible.
- If a business isn't in the list, admit it and nudge them back to Discover — never invent details.
- Always bold business names like **Julie's Sports Pub** so they become tappable.

AVAILABLE BUSINESSES:
${businessContext || 'No business data available right now.'}

${cityContext ? `CITY INFO: ${cityContext}` : ''}`

    if (autoRecommendationActive) {
      const topPicks = uniqueBusinessResults.slice(0, 3)
      const autoResponse = buildAutoRecommendationMessage(city, inferredTopic, topPicks, userMessage)
      const autoSources = topPicks.map(result => ({
        type: 'business' as const,
        businessName: result.business_name,
        content: result.content,
        similarity: result.similarity
      }))

      console.log(`✨ Auto recommendation triggered for topic=${inferredTopic}, picks=${topPicks.length}`)

      return {
        success: true,
        response: autoResponse,
        sources: autoSources,
        businessCarousel: undefined,
        walletActions: undefined,
        debug: {
          conversationHistory,
          recentAIMessages,
          mentionedBusinesses,
          isSpecificBusinessQuery,
          autoRecommendationActive: true,
          assistantClarifierCount,
          forceDetailForCurrentBusiness,
          lastAssistantDetailRequest
        }
      }
    }

    // 4. Build conversation messages with enhanced context
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8), // Keep last 8 messages for better context
      { role: 'user', content: userMessage }
    ]
    
    console.log(`🤖 AI Messages being sent:`)
    console.log(`📋 System prompt length: ${systemPrompt.length} chars`)
    console.log(`💬 Conversation history: ${conversationHistory.length} messages`)
    console.log(`🔍 Is simple follow-up: ${isSimpleFollowUp}`)
    console.log(`🔍 Is current business query: ${isCurrentBusinessQuery}`)
    console.log(`🔍 AI mentioned businesses: [${aiMentionedBusinesses?.join(', ') || 'none'}]`)
    console.log(`🔍 Final mentioned businesses: [${mentionedBusinesses?.join(', ') || 'none'}]`)
    messages.forEach((msg, i) => {
      if (msg.role !== 'system') {
        console.log(`${i}. ${msg.role}: "${msg.content}"`)
      }
    })

    // 5. Generate response using GPT-4 Mini (fast & cost-effective)
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast model
        messages,
        max_tokens: isSimpleFollowUp ? 120 : 80, // Much shorter, punchier responses
        temperature: 0.8, // Much higher for natural, varied responses
        presence_penalty: 0.3, // Avoid repetitive phrases
        frequency_penalty: 0.4, // Encourage varied vocabulary
        top_p: 0.9 // More focused but still natural
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Chat completion timeout after 15 seconds')), 15000)
      )
    ])

    const response = completion.choices[0]?.message?.content

    if (!response) {
      return {
        success: false,
        error: 'Failed to generate response'
      }
    }

    // 7. Determine if we should show business carousel (OFFERS ONLY!)
    let businessCarousel: any[] = []
    
    // 🎯 CAROUSEL IS FOR OFFERS - NOT RANDOM BUSINESS INFO!
    // Only show carousel for:
    // 1. VERY EXPLICIT requests for offers/deals with "show me" 
    // 2. "Show me Qwikker Picks" requests
    // 3. NEVER show for general conversation or vague requests!
    const shouldShowCarousel = businessResults.results && businessResults.results.length >= 2 && (
      // ONLY for VERY explicit "show me" + offer/deal requests
      (userMessage.toLowerCase().includes('show me') && (userMessage.toLowerCase().includes('offer') || userMessage.toLowerCase().includes('deal'))) ||
      // Remove the "what" trigger - too general
      // (userMessage.toLowerCase().includes('what') && (userMessage.toLowerCase().includes('offer') || userMessage.toLowerCase().includes('deal'))) ||
      // Qwikker Picks requests ONLY
      (userMessage.toLowerCase().includes('show me qwikker pick') || userMessage.toLowerCase().includes('qwikker pick'))
    ) && 
    // NEVER show for general conversation, questions, or vague requests
    !userMessage.toLowerCase().includes('cocktail') &&
    !userMessage.toLowerCase().includes('what kind') &&
    !userMessage.toLowerCase().includes('what type') &&
    !userMessage.toLowerCase().includes('food') && // Don't show cards for "what food" questions
    !userMessage.toLowerCase().includes('restaurant') && // Don't show cards for "find restaurants"
    !userMessage.toLowerCase().includes('place') &&
    !userMessage.toLowerCase().includes('anywhere') &&
    !userMessage.toLowerCase().includes('tell me about') &&
    !isSimpleFollowUp && // Never show cards for follow-up responses like "yeah" or "tell me more"
    !userMessage.toLowerCase().includes('what time') &&
    !userMessage.toLowerCase().includes('opening hours')
    
    console.log(`🎠 Carousel check: shouldShow=${shouldShowCarousel}, businessResults=${businessResults.results?.length || 0}, message="${userMessage}"`)
    
    if (shouldShowCarousel) {
      try {
        // Initialize Supabase client
        const supabase = createServiceRoleClient()
        
        // Get business details for carousel
        const businessIds = businessResults.results.slice(0, 6).map(result => result.business_id).filter(Boolean)
        console.log(`🎠 Business IDs for carousel: ${businessIds.length} found`)
        
        if (businessIds.length > 0) {
          console.log(`🎠 Querying businesses with IDs: ${businessIds?.join(', ') || 'none'} in city: ${city}`)
          
          // 🎯 ONLY QWIKKER PICKS AND FEATURED - NO STARTER BUSINESSES!
          const { data: businesses, error } = await supabase
            .from('business_profiles')
            .select(`
              id,
              business_name,
              business_category,
              business_tagline,
              business_town,
              business_images,
              business_tier,
              business_offers(id)
            `)
            .in('id', businessIds)
            .eq('status', 'approved')
            .eq('city', city)
            .in('business_tier', ['qwikker_picks', 'featured']) // 🚨 ONLY PREMIUM BUSINESSES
          
          if (error) {
            console.error('❌ Supabase query error:', error)
          }
          
          console.log(`🎠 Fetched ${businesses?.length || 0} businesses for carousel`)
          console.log(`🎠 Business tiers: ${businesses?.map(b => `${b.business_name}(${b.business_tier})`).join(', ') || 'none'}`)
          
          if (businesses && businesses.length > 0) {
            businessCarousel = businesses.map(business => ({
              ...business,
              offers_count: business.business_offers?.length || 0,
              rating: 4.5 // Mock rating for now
            }))
            
            // Sort by tier priority for carousel
            businessCarousel.sort((a, b) => {
              const tierPriority = {
                'qwikker_picks': 0,
                'featured': 1,
                'recommended': 2,
                'free_trial': 3
              }
              return tierPriority[a.business_tier] - tierPriority[b.business_tier]
            })
            
            console.log(`🎠 Final carousel: ${businessCarousel.length} businesses ready`)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching carousel businesses:', error)
      }
    }

    // 8. Detect wallet actions - check if user wants to add offers to wallet
    let walletActions: any[] = []
    
    // Check if user is asking to add something to wallet
    const isWalletRequest = userMessage.toLowerCase().includes('add to wallet') ||
                           userMessage.toLowerCase().includes('add it to wallet') ||
                           userMessage.toLowerCase().includes('put in wallet') ||
                           userMessage.toLowerCase().includes('wallet please') ||
                           (userMessage.toLowerCase().includes('yes') && 
                            conversationHistory.some(msg => 
                              msg.content.toLowerCase().includes('add') && 
                              msg.content.toLowerCase().includes('wallet')
                            ))
    
    console.log(`🎫 Wallet request check: isWallet=${isWalletRequest}, message="${userMessage}"`)
    
    if (isWalletRequest && businessResults.results && businessResults.results.length > 0) {
      try {
        // Initialize Supabase client for wallet actions
        const supabase = createServiceRoleClient()
        
        // Get offers from businesses mentioned in the context
        const businessIds = businessResults.results.slice(0, 3).map(result => result.business_id).filter(Boolean)
        console.log(`🎫 Checking offers for businesses: ${businessIds?.join(', ') || 'none'}`)
        
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
            .limit(5)
          
          if (!error && offers && offers.length > 0) {
            walletActions = offers.map(offer => ({
              type: 'add_to_wallet',
              offerId: offer.id,
              offerName: `${offer.offer_name} - ${offer.offer_value}`,
              businessName: offer.business_profiles.business_name,
              businessId: offer.business_id
            }))
            
            console.log(`🎫 Found ${walletActions.length} wallet actions available`)
          }
        }
      } catch (error) {
        console.error('❌ Error fetching wallet actions:', error)
      }
    }

    console.log(`✅ Generated AI response for "${userMessage}" in ${city} with ${sources.length} sources${businessCarousel.length > 0 ? ` and ${businessCarousel.length} carousel businesses` : ''}${walletActions.length > 0 ? ` and ${walletActions.length} wallet actions` : ''}`)

    // 🚨 POST-PROCESSING FIX: Ensure David's Grill Shack is always bold
    let processedResponse = response
    if (processedResponse.includes("David's Grill Shack") && !processedResponse.includes("**David's Grill Shack**")) {
      console.log("🔧 POST-PROCESSING: Fixing David's Grill Shack formatting")
      processedResponse = processedResponse.replace(/David's Grill Shack/g, "**David's Grill Shack**")
    }

    return {
      success: true,
      response: processedResponse,
      sources,
      businessCarousel: businessCarousel.length > 0 ? businessCarousel : undefined,
      walletActions: walletActions.length > 0 ? walletActions : undefined,
      // DEBUG INFO
      debug: {
        conversationHistory,
        recentAIMessages,
        mentionedBusinesses,
        isSpecificBusinessQuery,
        fullExtractionText: `${recentAIMessages} ${userMessage}`.trim(),
        autoRecommendationActive: false,
        assistantClarifierCount,
        forceDetailForCurrentBusiness,
        lastAssistantDetailRequest
      }
    }

  } catch (error) {
    console.error('❌ Error generating AI response:', error)
    return {
      success: false,
      error: 'Failed to generate response'
    }
  }
}

/**
 * Categorize user message to determine intent
 */
export async function categorizeUserMessage(message: string): Promise<{
  category: 'menu' | 'offers' | 'hours' | 'location' | 'general' | 'recommendation'
  confidence: number
}> {
  const lowerMessage = message.toLowerCase()

  // Menu-related keywords
  if (lowerMessage.match(/\b(menu|food|eat|drink|pizza|burger|coffee|meal|dish|cuisine)\b/)) {
    return { category: 'menu', confidence: 0.8 }
  }

  // Offers-related keywords
  if (lowerMessage.match(/\b(offer|deal|discount|special|promotion|save|cheap)\b/)) {
    return { category: 'offers', confidence: 0.8 }
  }

  // Hours-related keywords
  if (lowerMessage.match(/\b(open|close|hours|time|when)\b/)) {
    return { category: 'hours', confidence: 0.7 }
  }

  // Location-related keywords
  if (lowerMessage.match(/\b(where|location|address|near|close to|directions)\b/)) {
    return { category: 'location', confidence: 0.7 }
  }

  // Recommendation keywords
  if (lowerMessage.match(/\b(recommend|suggest|best|good|popular|favorite)\b/)) {
    return { category: 'recommendation', confidence: 0.8 }
  }

  return { category: 'general', confidence: 0.5 }
}

/**
 * Generate SMART, contextual quick reply suggestions based on AI response content
 */
export async function generateQuickReplies(
  userMessage: string,
  businessResults: any[],
  cityResults: any[],
  aiResponse?: string,
  conversationHistory?: ChatMessage[]
): Promise<string[]> {
  const lowerMessage = userMessage.toLowerCase()
  const lowerAIResponse = aiResponse?.toLowerCase() || ''
  const hasBusinessResults = businessResults.length > 0
  const primaryBusiness = businessResults[0]?.business_name as string | undefined
  const lastUserMessage = conversationHistory?.filter(msg => msg.role === 'user').slice(-1)[0]?.content.toLowerCase() || ''

  const recentConversation = conversationHistory?.slice(-4)?.map(msg => msg.content.toLowerCase()).join(' ') || ''
  const hasRecentBusinessMentions = recentConversation.includes('david') || recentConversation.includes('julie') || recentConversation.includes('orchid')
  const hasRecentOfferMentions = recentConversation.includes('offer') || recentConversation.includes('deal') || recentConversation.includes('discount')
  const hasRecentFoodMentions = recentConversation.includes('food') || recentConversation.includes('burger') || recentConversation.includes('menu')

  const detailIntent = detectDetailRequest(userMessage) || detectDetailRequest(aiResponse || '') || detectDetailRequest(recentConversation)

  const tidy = (options: string[]) => {
    const seen = new Set<string>()
    return options
      .map(option => option.trim())
      .filter(Boolean)
      .filter(option => {
        const lower = option.toLowerCase()
        if (lower === lowerMessage || lower === lastUserMessage) return false
        if (seen.has(lower)) return false
        seen.add(lower)
        return true
      })
      .slice(0, 3)
  }

  if (detailIntent) {
    const possessive = primaryBusiness ? `${primaryBusiness}'s` : 'their'
    switch (detailIntent) {
      case 'drinks':
        return tidy([
          'Any signature cocktails?',
          `Add ${possessive} cocktail deal to my wallet`,
          'Pair it with some food?'
        ])
      case 'menu':
        return tidy([
          'Highlight the must-try dishes',
          'Do they cater for allergies?',
          'What drinks go with that?'
        ])
      case 'offers':
        return tidy([
          'Add this offer to my wallet',
          'Any other deals like this?',
          'Set a reminder for later'
        ])
      case 'hours':
        return tidy([
          'Open late tonight?',
          'Weekend opening hours?',
          'Any late-night alternatives?'
        ])
      case 'kids':
        return tidy([
          'Do they have high chairs?',
          'Any family bundles?',
          'Show me the dessert options'
        ])
      case 'vegetarian':
        return tidy([
          'Any vegan dishes available?',
          'Gluten-free choices?',
          'Find another meat-free spot'
        ])
      case 'pricing':
        return tidy([
          "What's the average spend?",
          'Any cheaper alternatives nearby?',
          'Can I stack this with a deal?'
        ])
      default:
        break
    }
  }

  if (hasRecentBusinessMentions && !hasBusinessResults) {
    return tidy([
      'Tell me more about it',
      'Any offers there?',
      'Got another option?'
    ])
  }

  if (hasRecentOfferMentions) {
    return tidy([
      'Stack this offer in my wallet',
      'Any other bargains going?',
      'Compare this with other deals'
    ])
  }

  if (hasRecentFoodMentions) {
    return tidy([
      'Show me the mains',
      'What about dessert options?',
      'Any veggie-friendly picks?'
    ])
  }

  console.log('🔍 Analyzing AI response for quick replies:', aiResponse?.substring(0, 100) + '...')
  const extractedOptions = extractOptionsFromAIResponse(aiResponse || '')
  console.log('🎯 Extracted options from AI response:', extractedOptions)
  if (extractedOptions.length > 0) {
    console.log('✅ Using extracted options as quick replies:', extractedOptions)
    return tidy(extractedOptions)
  }
  console.log('⚠️ No options extracted, falling back to contextual replies')

  if (hasBusinessResults && businessResults.length > 0) {
    const businessNames = businessResults.map(b => b.business_name || '').filter(Boolean)

    if (businessNames.length === 1) {
      const businessName = businessNames[0]
      const suggestions = [
        `Anything else at ${businessName}?`,
        'Suggest another local spot'
      ]
      if (lowerAIResponse.includes('offer') || lowerMessage.includes('offer') || lowerAIResponse.includes('discount')) {
        suggestions.splice(1, 0, 'Add this offer to my wallet')
      }
      return tidy(suggestions)
    } else if (businessNames.length > 1) {
      return tidy([
        'Compare these places',
        'Show the top offer',
        'Pick one for me'
      ])
    }
  }

  if (lowerAIResponse.includes('budget') || lowerAIResponse.includes('what kind') || lowerAIResponse.includes('preference')) {
    return tidy([
      'Keep it budget friendly',
      'Show me premium picks',
      'Surprise me with locals'
    ])
  }

  if (lowerAIResponse.includes('open') || lowerAIResponse.includes('hour') || lowerAIResponse.includes('available')) {
    return tidy([
      'Open late tonight?',
      'Weekend hours?',
      'Any 24/7 spots?'
    ])
  }

  if (lowerAIResponse.includes('deal') || lowerAIResponse.includes('offer') || lowerAIResponse.includes('discount')) {
    return tidy([
      'Add this to my wallet',
      'More deals like this',
      'Anything else nearby?'
    ])
  }

  if (lowerAIResponse.includes('burger') || lowerAIResponse.includes('pizza') || lowerAIResponse.includes('coffee')) {
    return tidy([
      'Which one would you pick?',
      'Any deals with that?',
      'What about something different?'
    ])
  }

  if (lowerAIResponse.includes('qwikker pick') || lowerAIResponse.includes('premium') || lowerAIResponse.includes('best')) {
    return tidy([
      'Show me the picks',
      'Any spotlight offers?',
      'Why are they top tier?'
    ])
  }

  if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
    return tidy(['Line up some locals', 'Current food deals', 'Any hidden gems?'])
  }

  if (lowerMessage.includes('drink') || lowerMessage.includes('bar') || lowerMessage.includes('cocktail')) {
    return tidy(['Best bars nearby', 'Any drink specials?', 'Happy hour spots?'])
  }

  return tidy(['Give me a recommendation', 'Show the latest deals', 'Surprise me with something local'])
}

/**
 * Format business information for AI context
 */
export async function formatBusinessForAI(business: any): Promise<string> {
  const parts = [
    business.business_name,
    business.business_tagline,
    business.business_description,
    business.business_category ? `Category: ${business.business_category}` : '',
    business.business_hours ? `Hours: ${business.business_hours}` : '',
    business.business_address ? `Address: ${business.business_address}` : ''
  ].filter(Boolean)

  return parts.join('\n')
}
