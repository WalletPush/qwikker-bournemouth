'use server'

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { categoryDisplayLabel } from '@/lib/utils/category-helpers'
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
    { names: ["David's Grill Shack"], keywords: ['david', 'grill shack', "david's grill", "grill shack", "davids"] },
    { names: ["Julie's Sports Pub"], keywords: ['julie', 'sports pub', "julie's sports", "sports pub", "julies"] },
    { names: ["Alexandra's Café"], keywords: ['alexandra', 'café', 'cafe', "alexandra's café", "alexandra's cafe", "alexandras"] },
    { names: ["Orchid & Ivy"], keywords: ['orchid', 'ivy', 'orchid & ivy', 'orchid and ivy'] },
    { names: ["Mike's Pool Bar"], keywords: ['mike', 'pool bar', "mike's pool", "pool bar", "mikes"] },
    { names: ["Venezy Burgers"], keywords: ['venezy', 'venezy burgers'] },
    { names: ["Adams Cocktail Bar"], keywords: ['adams', 'adams cocktail', 'adams bar', 'adams cocktail bar', 'adam'] }
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

  // 🎯 SMART: Only check the last sentence (where the AI asks the question)
  // This prevents false matches from mentions in earlier parts of the message
  const sentences = lower.split(/[.!?]+/).filter(Boolean)
  const lastSentence = sentences.length > 0 ? sentences[sentences.length - 1].trim() : lower

  // Check for explicit offers/prompts in the last sentence
  if (/(want|fancy|shall|grab|pull|show|get).*?(cocktail|drink|bevv|bevvy|bar menu|cocktail list)/.test(lastSentence)) return 'drinks'
  if (/(want|fancy|shall|grab|pull|show|get).*?(menu|full menu)/.test(lastSentence)) return 'menu'
  if (/(want|fancy|shall|grab|pull|show|get).*?(offer|deal|discount|wallet)/.test(lastSentence)) return 'offers'
  
  // Fallback: check broader patterns in last sentence only
  if (/(cocktail|cocktail list|drinks menu|bar menu)/.test(lastSentence)) return 'drinks'
  if (/(full menu|food menu|their menu)/.test(lastSentence)) return 'menu'
  if (/(offer|deal|discount|wallet|voucher)/.test(lastSentence)) return 'offers'
  if (/(open|hour|time|closing)/.test(lastSentence)) return 'hours'
  if (/(kid|child|family)/.test(lastSentence)) return 'kids'
  if (/(veggie|vegetarian|vegan|plant)/.test(lastSentence)) return 'vegetarian'
  if (/(price|cost|expensive|cheap|affordable)/.test(lastSentence)) return 'pricing'

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
    system_category?: string // Stable enum for filtering
    display_category?: string // User-friendly label
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
  console.log(`\n🔍 ============================================`)
  console.log(`🔍 RAW CONVERSATION HISTORY (${conversationHistory.length} messages):`)
  conversationHistory.forEach((msg, i) => {
    const preview = msg.content.substring(0, 80).replace(/\n/g, ' ')
    console.log(`  ${i}: [${msg.role}] "${preview}..."`)
  })
  console.log(`🔍 ============================================\n`)
  
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
  
  console.log(`\n═══════════════════════════════════════`)
  console.log(`🎯 BUSINESS CONTEXT EXTRACTION`)
  console.log(`═══════════════════════════════════════`)
  console.log(`👤 User said: "${userMessage}"`)
  console.log(`🤖 AI's last message: "${recentAIMessages.substring(0, 100)}..."`)
  console.log(`📋 User mentioned: [${userMentionedBusinesses?.join(', ') || 'NONE'}]`)
  console.log(`📋 AI mentioned: [${aiMentionedBusinesses?.join(', ') || 'NONE'}]`)
  console.log(`🎯 FINAL CONTEXT: [${mentionedBusinesses?.join(', ') || 'NONE'}]`)
  console.log(`═══════════════════════════════════════\n`)

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

  // 🚨 CRITICAL: Only use detail request detection for SIMPLE affirmatives, NOT for "what else" or contextual questions
  const isAskingWhatElse = userMessage.toLowerCase().includes('what else') ||
                          userMessage.toLowerCase().includes('what do they') ||
                          userMessage.toLowerCase().includes('what about') ||
                          userMessage.toLowerCase().includes('tell me more') ||
                          userMessage.toLowerCase().includes('tell me about')
  
  // 🚨 CRITICAL: If user just got a detailed answer about something specific, don't force a detail request on "yeah"
  const lastAIGaveDetailedAnswer = lastAssistantMessage.length > 200 || 
                                   lastAssistantMessage.includes('£') || 
                                   lastAssistantMessage.includes('•') ||
                                   lastAssistantMessage.toLowerCase().includes('this') && lastAssistantMessage.toLowerCase().includes('is')
  
  const lastAssistantDetailRequest = (isAskingWhatElse || lastAIGaveDetailedAnswer) ? null : detectDetailRequest(lastAssistantMessage)
  const simpleAffirmative = /^(yeah!?|yes!?|yep!?|sure!?|ok!?|okay!?|alright!?|do it|go on|please do|sounds good!?|perfect!?|cool!?|let's do it|why not)$/i.test(userMessage.trim())
  
  // 🚨 CRITICAL: Don't force detail if user gave explicit instructions (like "no grab the menu")
  const userGaveExplicitInstruction = userMessage.toLowerCase().includes('no ') || 
                                      userMessage.toLowerCase().includes('actually') ||
                                      userMessage.toLowerCase().includes('instead') ||
                                      (userMessage.split(/\s+/).length > 3 && !simpleAffirmative)
  
  const forceDetailForCurrentBusiness = simpleAffirmative && lastAssistantDetailRequest && mentionedBusinesses.length > 0 && !userGaveExplicitInstruction

  const userGaveOpenChoice = /(whatever|anything|either|you decide|surprise me|not fussed|not bothered|up to you|whatever\'s good|whatever good|whatever you think|i trust you|something else|happy with anything|you pick)/i.test(lowerMessage)
  const isShortAnswer = lowerMessage.replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean).length <= 4 && !lowerMessage.includes('?')
  console.log(`🎯 Topic inference: ${inferredTopic}, assistantClarifying=${assistantWasClarifying}, userOpenChoice=${userGaveOpenChoice}, shortAnswer=${isShortAnswer}`)
 
  // 🎯 SMART: Detect simple follow-up responses that need context
  const isSimpleFollowUp = /^(yeah!?|yes!?|yep!?|sure!?|okay!?|ok!?|alright!?|go on!?|tell me more!?|more info!?|sounds good!?|that sounds great!?|perfect!?|awesome!?|do it!?|please!?)$/i.test(userMessage.trim()) ||
                           /^(what about|tell me about|how about) (them|it|that|those)(\?)?$/i.test(userMessage.trim()) ||
                           userMessage.toLowerCase().trim() === 'more' ||
                           userMessage.toLowerCase().trim() === 'details' ||
                           userMessage.toLowerCase().trim() === 'info'
  
  // 🎯 CRITICAL: Detect "what else do they" type questions (referring to current business)
  const isCurrentBusinessQuery = userMessage.toLowerCase().includes('what else do they') ||
                                 userMessage.toLowerCase().includes('what else does it') ||
                                 userMessage.toLowerCase().includes('what else can they') ||
                                 userMessage.toLowerCase().includes('what else do you') ||
                                 userMessage.toLowerCase().includes('what else have they') ||
                                 userMessage.toLowerCase().includes('what do they') ||
                                 userMessage.toLowerCase().includes('do they') ||
                                 userMessage.toLowerCase().includes('are they') ||
                                 userMessage.toLowerCase().trim() === 'what else?' ||
                                 isSimpleFollowUp

  // 🎯 SMART: Detect "show me more" type queries (looking for EXPANDED results)
  const isExpandedListQuery = userMessage.toLowerCase().includes('list all') ||
                             userMessage.toLowerCase().includes('show all') ||
                             userMessage.toLowerCase().includes('all the offers') ||
                             userMessage.toLowerCase().includes('all offers') ||
                             userMessage.toLowerCase().includes('any more offers') ||
                             userMessage.toLowerCase().includes('are there any more') ||
                             userMessage.toLowerCase().includes('any other offers') ||
                             userMessage.toLowerCase().includes('more deals') ||
                             userMessage.toLowerCase().includes('other deals')

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

    contextualGuidance += `\n- 🚨🚨🚨 ABSOLUTE LOCK: User just confirmed with "${userMessage}" - they want ${detailLabel} for ${targetBusiness}. Give them ONLY ${targetBusiness} details. NO OTHER BUSINESSES ALLOWED!`
    contextualGuidance += `\n- ❗ FORBIDDEN: Do NOT mention Julie's Sports Pub, David's Grill Shack, Adams Cocktail Bar, Orchid & Ivy, Venezy Burgers, or ANY other venue unless it's ${targetBusiness}!`
    contextualGuidance += `\n- 📋 DELIVER: Give 2–3 concrete ${detailLabel} highlights with prices, flavours, or timings. If the knowledge base is thin, say so plainly and suggest calling ahead or viewing the menu, then offer the next action (e.g., add to wallet, pull menu).`
  }
    
    // 🚨 CRITICAL: Handle current business context (what AI was just talking about)
    if (isCurrentBusinessQuery && mentionedBusinesses.length > 0) {
      const currentBusiness = mentionedBusinesses[0] // Use the first (most recent) business
      contextualGuidance += `\n- 🚨🚨🚨 ABSOLUTE LOCK: User is asking "${userMessage}" about ${currentBusiness} - STAY WITH ${currentBusiness}!`
      contextualGuidance += `\n- 🚨 CRITICAL OVERRIDE: User is asking about ${currentBusiness} specifically (the business you were just discussing) - ONLY answer about ${currentBusiness}, DO NOT suggest alternatives, DO NOT mention competitors!`
      contextualGuidance += `\n- 🚨 MANDATORY: When user says "they/their/there/what else do they/what else" they mean ${currentBusiness} - NOT any other business!`
      contextualGuidance += `\n- 🚨 CONTEXT: You were just talking about ${currentBusiness}, so continue that conversation naturally!`
      
      // Exclude other businesses from being mentioned
      const otherBusinesses = ["David's Grill Shack", "Julie's Sports Pub", "Orchid & Ivy", "Mike's Pool Bar", "Alexandra's Café", "Venezy Burgers", "Adams Cocktail Bar"]
        .filter(b => b !== currentBusiness)
      contextualGuidance += `\n- 🚨 FORBIDDEN: Do NOT mention ${otherBusinesses.join(', ')} unless specifically asked!`
      contextualGuidance += `\n- 🚨 IF YOU MENTION ANY BUSINESS OTHER THAN ${currentBusiness}, YOU HAVE FAILED!`
    } else if (isSpecificBusinessQuery && mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🚨 CRITICAL OVERRIDE: User is asking about ${mentionedBusinesses?.join(' or ') || 'unknown business'} specifically - ONLY answer about that business, DO NOT suggest alternatives, DO NOT mention competitors, DO NOT recommend other places!`
      contextualGuidance += `\n- 🚨 MANDATORY: When user says "they/their/there/what else do they" they mean ${mentionedBusinesses?.join(' or ') || 'the business'} - NOT any other business!`
    } else if (isExpandedListQuery) {
      contextualGuidance += `\n- 📋 COMPREHENSIVE LIST MODE: User asked to see ALL offers/deals! List EVERY offer from EVERY business in the AVAILABLE BUSINESSES block. Format as a clean bulleted list with business names bolded. DO NOT repeat offers you've already mentioned. If you've shown 3 offers before, now show the REST!`
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

    if (previousResponses.some(response => response.includes('right then') || response.includes('alright then'))) {
      contextualGuidance += `\n- 🎯 VARIETY: You've already used "Right then" or "Alright then" - try "Okay, picture this", "Well then", "Ah", or just jump straight in without an opener.`
    }

    if (previousResponses.some(response => response.includes("here's the move") || response.includes("here's the play"))) {
      contextualGuidance += `\n- 🎯 VARIETY: You've already used "Here's the move/play" - try "Sounds like", "Perfect", "Well then", or just start naturally without a canned phrase.`
    }

    if (previousResponses.length > 0) {
      contextualGuidance += `\n- 🎯 VARIETY: Vary your greeting and tone from previous responses - don't repeat the same opening phrases`
    }

    const detailQueryHints: Record<string, string> = {
      drinks: 'cocktail list signature drinks bar menu',
      menu: 'menu highlights signature dishes food recommendations',
      offers: 'current offers deals promotions discounts',
      hours: 'opening hours closing time schedule',
      kids: 'kids menu family friendly options',
      vegetarian: 'vegetarian vegan plant-based options',
      pricing: 'pricing average spend cost',
      general: 'top picks highlights'
    }

    const cleanedLowerMessage = lowerMessage.replace(/[^a-z0-9\s]/g, '').trim()
    const isLowSignalMessage = cleanedLowerMessage.length <= 3

    let knowledgeQuery = userMessage
    
    // 🎯 CRITICAL: If user is asking about "they/their/it" (current business), LOCK the search to that business!
    if ((forceDetailForCurrentBusiness || isSimpleFollowUp || isLowSignalMessage || isCurrentBusinessQuery) && mentionedBusinesses.length > 0) {
      const detailHintKey = lastAssistantDetailRequest || 'general'
      const hint = detailQueryHints[detailHintKey] || detailQueryHints.general
      knowledgeQuery = `${mentionedBusinesses[0]} ${hint}`.trim()
      console.log(`🔒 LOCKED SEARCH to business: "${mentionedBusinesses[0]}" (reason: ${forceDetailForCurrentBusiness ? 'forceDetail' : isCurrentBusinessQuery ? 'currentBusinessQuery' : 'simpleFollowUp'})`)
    } else if ((userGaveOpenChoice || isShortAnswer) && inferredTopic !== 'general') {
      knowledgeQuery = `${friendlyTopicLabel} in ${city}`.trim()
    }

    console.log(`🧠 Knowledge query resolved to: "${knowledgeQuery}" (user message: "${userMessage}")`)

    // 🎯 SMART: If user wants ALL offers/businesses, increase the search limit
    const searchLimit = isExpandedListQuery ? 30 : 12
    const runBusinessSearch = async (query: string) => searchBusinessKnowledge(query, city, { matchCount: searchLimit })
    let businessResults = await runBusinessSearch(knowledgeQuery)
    
    console.log(`🔍 Search mode: ${isExpandedListQuery ? 'EXPANDED (30 results)' : 'NORMAL (12 results)'} for query: "${knowledgeQuery}"`)
    
    // 🚨 FALLBACK: If no results and a business was mentioned, try searching for that business name directly
    if (businessResults.success && businessResults.results.length === 0 && mentionedBusinesses.length > 0) {
      console.log(`⚠️ No results for "${knowledgeQuery}", trying direct business name search for: ${mentionedBusinesses[0]}`)
      const directBusinessResults = await runBusinessSearch(mentionedBusinesses[0])
      if (directBusinessResults.success && directBusinessResults.results.length > 0) {
        console.log(`✅ Found ${directBusinessResults.results.length} results with direct business name search`)
        businessResults = directBusinessResults
      }
    }
    
    // Original fallback to user message
    if (businessResults.success && businessResults.results.length === 0 && knowledgeQuery !== userMessage) {
      const fallbackResults = await runBusinessSearch(userMessage)
      if (fallbackResults.success) {
        businessResults = fallbackResults
      }
    }

    const runCitySearch = async (query: string) => searchCityKnowledge(query, city, { matchCount: 6 })
    let cityResults = await runCitySearch(knowledgeQuery)
    if (cityResults.success && cityResults.results.length === 0 && knowledgeQuery !== userMessage) {
      const fallbackCity = await runCitySearch(userMessage)
      if (fallbackCity.success) {
        cityResults = fallbackCity
      }
    }
 
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
    
    const systemPrompt = `You're the Bournemouth Local—Qwikker's cheeky concierge who mixes real hospitality with seaside swagger. Speak like a trusted mate, never like a call centre script, and NEVER open with "Hi Explorer" or any robotic greeting.${contextualGuidance ? `\n\nCONTEXT: ${contextualGuidance}` : ''}

${isSimpleFollowUp ? `\nUser just said "${userMessage}" — they're clearly replying to your last point. Pick up that thread naturally and keep the vibe flowing.` : ''}

🚨🚨🚨 STOP - READ THIS BEFORE RESPONDING 🚨🚨🚨

The user asked: "${userMessage}"
Conversation history length: ${conversationHistory.length} messages

${conversationHistory.length <= 2 && (userMessage.toLowerCase().includes('best place') || userMessage.toLowerCase().includes('where should') || userMessage.toLowerCase().includes('find me')) && !userMessage.toLowerCase().match(/(discount|deal|offer|italian|pizza|burger|chinese|indian|thai|mexican|japanese|cheap|expensive|fancy|casual|upscale|cocktail)/i) ? `

❌ DO NOT RECOMMEND BUSINESSES YET ❌
❌ DO NOT MENTION SPECIFIC RESTAURANT NAMES ❌
❌ DO NOT GIVE SUGGESTIONS YET ❌

THIS IS YOUR FIRST RESPONSE TO A BROAD QUERY.
YOU MUST ASK WHAT THEY'RE LOOKING FOR FIRST.

REQUIRED RESPONSE FORMAT:
"Hey [name]! Before I point you in the right direction—quick question: are you hunting for deals and discounts tonight, or just want me to show you the absolute best spots? Any specific cuisine you're craving?"

REQUIRED QUICK REPLIES:
- "I want deals/discounts"
- "Just the best spots"
- "Italian food"
- "Surprise me"

DO NOT DEVIATE FROM THIS. ASK FIRST, RECOMMEND SECOND.
` : `User has given preferences or this is a follow-up. You may proceed with specific recommendations.`}

VOICE & VIBE:
- Keep it brief—2-3 sentences max. Rotate your openers naturally: "Sounds like", "Okay, picture this", "Well then", "Ah", "Perfect". Avoid repeating "Right then", "Alright then", "Here's the move", or "Here's the play" if you've used them recently.
- Never use "Hi Explorer", "Hi there", "Greetings", or similar canned intros. Dive straight into the good stuff.
- Slip in Bournemouth flavour (pier walks, salty breezes, cosy old-town vibes) or a playful quip occasionally—but stay natural, don't force it.
- Mirror their mood: hype them up if they're buzzing, soften things if they're stressed, show real empathy when they vent.
- Emojis are seasoning, not sauce—max one per response, never inside business names or factual details.

FLOW GUARDRAILS:
- 🎯 ASK CLARIFYING QUESTIONS FIRST: When users ask broad questions like "best place for dinner tonight" or "where should I eat", DON'T jump straight to recommendations. First ask about their preferences naturally: "Hey [name]! Before we dive in—are you hunting for discounts, or just want the best spots? Any cuisine you're craving?" Keep quick replies like "I want discounts", "Just the best places", "Italian", "Surprise me".
- One clarifier max. The moment they give you anything ("something sweet", "surprise me"), swing straight into recommendations.
- 🚨 CRITICAL: If they say "yeah", "sure", "ok", "go on" RIGHT AFTER you asked them something about a specific business (like cocktails at David's), STAY WITH THAT EXACT BUSINESS. Do NOT switch to different businesses! Give them the detail they confirmed they want.
- Never repeat the same question. Acknowledge, build, keep momentum.
- 🚨 CONTEXT LOCK: When discussing a specific business, ONLY switch to another business if the user explicitly asks "anywhere else?" or names a different venue. Otherwise STAY PUT.

LOCAL PLAYBOOK:
- Spotlight 2–3 Bournemouth gems with punchy reasons. Lead with Qwikker Picks or true standouts, then offer to pull menus, add to wallet, or fetch another idea.
- When they mention kids menus, veggie bits, pricing, accessibility, or timetables, stick to the knowledge base facts and keep the focus on the current venue unless they ask to branch out.
- If they say "anywhere else?", bring fresh names—don’t rinse and repeat.

AFTERCARE & NEXT STEPS:
- Wrap with an easy next move: "Want me to grab their menu?", "Want me to pull up their drinks list?", "Fancy checking out their offers?".
- Quick replies should always tee up the next logical tap ("Show drinks menu", "Add this offer to my wallet", "Any veggie dishes?").

🚨 KNOWLEDGE GUARDRAILS (CRITICAL - NEVER VIOLATE):
- 🚨 ONLY use facts from the AVAILABLE BUSINESSES block below. DO NOT make up, assume, or infer ANY details.
- 🚨 If information is NOT in the AVAILABLE BUSINESSES block, DO NOT mention it. Say "I don't have that info right now" instead.
- 🚨 NEVER invent amenities (wifi, parking, accessibility) unless explicitly listed in the business data.
- 🚨 If a venue isn't listed in AVAILABLE BUSINESSES, admit it plainly: "I don't have info on that one yet—check out the Discover page!"
- Always bold business names like **Julie's Sports Pub** so they're tappable.

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
        max_tokens: isSimpleFollowUp ? 160 : 240,
        temperature: 0.95,
        presence_penalty: 0.5,
        frequency_penalty: 0.6,
        top_p: 0.92
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
              system_category,
              display_category,
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

    // 🚨 POST-PROCESSING FIX: Ensure business names are always bold
    let processedResponse = response.trim()
    
    // Bold all business names
    const businessNames = ["David's Grill Shack", "Julie's Sports Pub", "Alexandra's Café", "Orchid & Ivy", "Mike's Pool Bar", "Venezy Burgers"]
    businessNames.forEach(name => {
      if (processedResponse.includes(name) && !processedResponse.includes(`**${name}**`)) {
        console.log(`🔧 POST-PROCESSING: Fixing ${name} formatting`)
        processedResponse = processedResponse.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `**${name}**`)
      }
    })
    
    // 🎯 EMOJI FILTER: Remove excessive emojis (max 1 per response)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    const emojis = processedResponse.match(emojiRegex) || []
    if (emojis.length > 1) {
      console.log(`🔧 POST-PROCESSING: Removing ${emojis.length - 1} excessive emojis`)
      let emojiCount = 0
      processedResponse = processedResponse.replace(emojiRegex, (match) => {
        emojiCount++
        return emojiCount === 1 ? match : '' // Keep only the first emoji
      })
    }

    if (!/[.!?…)]$/.test(processedResponse)) {
      processedResponse = `${processedResponse}.`
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
  const hasRecentBusinessMentions = recentConversation.includes('david') || recentConversation.includes('julie') || recentConversation.includes('orchid') || recentConversation.includes('adams')
  const hasRecentOfferMentions = recentConversation.includes('offer') || recentConversation.includes('deal') || recentConversation.includes('discount')
  
  // 🗺️ ATLAS: If AI is conversational but has business results, offer to show them
  const isConversationalButHasResults = hasBusinessResults && 
    !lowerAIResponse.match(/\b(here's|here are|check out|try|recommend)\b/) &&
    !lowerMessage.match(/\b(show|list|map|atlas|options|recommend|suggest)\b/)
  
  if (isConversationalButHasResults) {
    return tidy([
      'Show top picks',
      'See on map',
      'Compare options'
    ])
  }
  
  // 🎯 PRIORITY: Check if AI is asking clarifying questions about preferences
  if (lowerAIResponse.includes('hunting for deals') || lowerAIResponse.includes('any specific cuisine') || lowerAIResponse.includes('before i point you') || lowerAIResponse.includes('before we dive in')) {
    return [
      "I want deals/discounts",
      "Just the best spots",
      "Italian food",
      "Surprise me"
    ]
  }
  
  // 🎯 CURRENT USER INTENT (prioritize this over conversation history!)
  const isCurrentlyAskingLocation = /\b(how do i get|where is|address|location|directions|get there|find it|parking)\b/i.test(lowerMessage)
  const isCurrentlyAskingHours = /\b(what time|when.*open|hours|opening time|close|closing time)\b/i.test(lowerMessage)
  const isCurrentlyAskingMenu = /\b(menu|what.*have|show.*food|dishes|mains|dessert|breakfast)\b/i.test(lowerMessage) && !lowerMessage.includes('cocktail')
  const isCurrentlyAskingDrinks = /\b(cocktail|drink|wine|beer|alcohol|cacha[çc]a|liquor|spirit|mojito|margarita|gin|vodka|rum|whiskey|what.*drink|show.*drink|anywhere.*sell|where.*get)\b/i.test(lowerMessage)
  const isCurrentlyAskingOffers = /\b(deal|offer|discount|promo|bargain|coupon|save|cheap|list.*offer|show.*deal|current deal|what'?s on)\b/i.test(lowerMessage)
  
  // 🎯 CONVERSATION CONTEXT (only use if current intent is unclear)
  const isCocktailConversation = recentConversation.includes('cocktail') || recentConversation.includes('drink') || lowerAIResponse.includes('cocktail')
  const hasRecentFoodMentions = !isCocktailConversation && (recentConversation.includes('food') || recentConversation.includes('burger') || (recentConversation.includes('menu') && !recentConversation.includes('cocktail')))

  const detailIntent = detectDetailRequest(userMessage) || detectDetailRequest(aiResponse || '')

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

  // ⚡ PRIORITY 1: Current user intent (overrides conversation history!)
  if (isCurrentlyAskingLocation) {
    return tidy([
      'What time do they open?',
      'Any parking nearby?',
      'Tell me about their vibe'
    ])
  }

  if (isCurrentlyAskingHours) {
    return tidy([
      'What\'s the address?',
      'Show me their menu',
      'Any current deals?'
    ])
  }

  if (isCurrentlyAskingMenu && !isCurrentlyAskingDrinks) {
    return tidy([
      'What about drinks?',
      'Any signature dishes?',
      'Tell me their opening hours'
    ])
  }

  if (isCurrentlyAskingDrinks) {
    return tidy([
      'Any signature cocktails?',
      'What food pairs well with this?',
      'Show me the full drinks menu'
    ])
  }

  if (isCurrentlyAskingOffers) {
    return tidy([
      'Stack this offer in my wallet',
      'Any other bargains going?',
      'Compare this with other deals'
    ])
  }

  // ⚡ PRIORITY 2: Detail intent from AI parsing
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

  // 🎉 EVENT-SPECIFIC QUICK REPLIES (check first!)
  const isEventConversation = lowerAIResponse.includes('event') || 
                              lowerAIResponse.includes('happening') || 
                              lowerAIResponse.includes('tasting experience') ||
                              lowerAIResponse.includes('jazz night') ||
                              lowerAIResponse.includes('workshop') ||
                              lowerAIResponse.includes('gig') ||
                              recentConversation.includes('event')
  
  if (isEventConversation) {
    // If AI just showed event cards or mentioned specific events
    if (lowerAIResponse.includes('here you go') || lowerAIResponse.includes('pull up') || lowerAIResponse.includes('check out')) {
      return tidy([
        'Any other events?',
        'Who else is hosting events?',
        'What about this weekend?'
      ])
    }
    
    // If AI mentioned an event but hasn't shown details yet
    if (lowerAIResponse.includes('tasting') || lowerAIResponse.includes('jazz') || lowerAIResponse.includes('workshop')) {
      return tidy([
        'Yes, show me details',
        'What else is on?',
        'Any similar events?'
      ])
    }
    
    // General event conversation
    return tidy([
      'What events are coming up?',
      'Any live music?',
      'Show me tasting events'
    ])
  }

  // 🍹 COCKTAIL-SPECIFIC QUICK REPLIES (moved up before offer mentions)
  if (isCocktailConversation) {
    // If AI just explained a specific cocktail, offer related suggestions
    if (lowerAIResponse.includes('this') || lowerAIResponse.includes('brazilian') || lowerAIResponse.includes('mix') || lowerAIResponse.includes('zesty')) {
      return tidy([
        'Any other similar cocktails?',
        'What food pairs well with this?',
        'Show me the full cocktail menu'
      ])
    }
    
    // General cocktail conversation
    return tidy([
      'Any signature cocktails?',
      'What\'s the strongest one?',
      'Best cocktail for my mood?'
    ])
  }

  if (hasRecentFoodMentions) {
    return tidy([
      'Show me the mains',
      'What about dessert options?',
      'Any veggie-friendly picks?'
    ])
  }

  // Only suggest offer-related replies if BOTH:
  // 1. Recent conversation mentions offers
  // 2. AI response explicitly talks about a specific offer/discount
  if (hasRecentOfferMentions && (lowerAIResponse.includes('% off') || lowerAIResponse.includes('discount'))) {
    return tidy([
      'Stack this offer in my wallet',
      'Any other bargains going?',
      'Compare this with other deals'
    ])
  }

  // Disable broken extraction logic - it pulls random words from descriptions
  // console.log('🔍 Analyzing AI response for quick replies:', aiResponse?.substring(0, 100) + '...')
  // const extractedOptions = extractOptionsFromAIResponse(aiResponse || '')
  // console.log('🎯 Extracted options from AI response:', extractedOptions)
  // if (extractedOptions.length > 0) {
  //   console.log('✅ Using extracted options as quick replies:', extractedOptions)
  //   return tidy(extractedOptions)
  // }
  // console.log('⚠️ No options extracted, falling back to contextual replies')

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
    business.display_category ? `Category: ${categoryDisplayLabel(business)}` : '',
    business.business_hours ? `Hours: ${business.business_hours}` : '',
    business.business_address ? `Address: ${business.business_address}` : ''
  ].filter(Boolean)

  return parts.join('\n')
}
