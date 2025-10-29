'use server'

import OpenAI from 'openai'
import { searchBusinessKnowledge, searchCityKnowledge } from './embeddings'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Initialize OpenAI client
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
  conversationHistory?: ChatMessage[]
}

/**
 * Extract business names from conversation text for context awareness
 */
function extractBusinessNamesFromText(text: string): string[] {
  const businessNames: string[] = []
  const lowerText = text.toLowerCase()
  
  console.log(`🔍 EXTRACTING BUSINESSES FROM: "${text}"`)
  console.log(`🔍 LOWERCASE TEXT: "${lowerText}"`)
  
  // 🎯 SMART BUSINESS DETECTION: Check for partial matches first
  
  // David's Grill Shack variations
  if (lowerText.includes('david') || lowerText.includes('grill shack')) {
    businessNames.push("David's Grill Shack")
  }
  
  // Julie's Sports Pub variations  
  if (lowerText.includes('julie') || lowerText.includes('sports pub')) {
    businessNames.push("Julie's Sports Pub")
  }
  
  // Alexandra's Café variations
  if (lowerText.includes('alexandra') || lowerText.includes('café') || lowerText.includes('cafe')) {
    console.log(`✅ FOUND: Alexandra's Café (alexandra=${lowerText.includes('alexandra')}, café=${lowerText.includes('café')}, cafe=${lowerText.includes('cafe')})`)
    businessNames.push("Alexandra's Café")
  }
  
  // Other businesses (exact matches)
  const knownBusinesses = [
    "Orchid & Ivy", "Mike's Pool Bar", "Venezy Burgers", "Alexandra's Café"
  ]
  
  knownBusinesses.forEach(business => {
    if (lowerText.includes(business.toLowerCase())) {
      if (!businessNames.includes(business)) {
        businessNames.push(business)
      }
    }
  })
  
  // Fallback: Common business name patterns
  if (businessNames.length === 0) {
    const patterns = [
      /\b([A-Z][a-z]+'?s?\s+(?:Grill\s+Shack|Sports\s+Pub|Pool\s+Bar))\b/gi,
      /\b([A-Z][a-z]+\s+&\s+[A-Z][a-z]+)\b/gi // "Orchid & Ivy" pattern
    ]
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || []
      matches.forEach(match => {
        const cleaned = match.trim()
        if (cleaned.length > 5 && !businessNames.includes(cleaned)) {
          businessNames.push(cleaned)
        }
      })
    })
  }
  
  console.log(`🎯 FINAL EXTRACTED BUSINESSES: [${businessNames.join(', ')}]`)
  return businessNames
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
  const conversationText = conversationHistory
    ?.slice(-6) // Last 3 exchanges (6 messages)
    ?.map(msg => msg.content)
    ?.join(' ') || ''

  console.log(`🔍 PROCESSED CONVERSATION TEXT: "${conversationText}"`)
  const mentionedBusinesses = extractBusinessNamesFromText(conversationText + ' ' + userMessage)
  console.log(`🎯 Context check: mentioned businesses: ${mentionedBusinesses.join(', ')}`)
  console.log(`🔍 DEBUG: conversationText="${conversationText}", userMessage="${userMessage}"`)
  console.log(`🔍 DEBUG: full text for extraction="${conversationText + ' ' + userMessage}"`)

  // 🎯 SMART: Detect "anywhere else?" type queries (looking for DIFFERENT businesses)
  const isAnywhereElseQuery = userMessage.toLowerCase().includes('anywhere else') ||
                             userMessage.toLowerCase().includes('other places') ||
                             userMessage.toLowerCase().includes('more options') ||
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
  console.log(`🎯 Specific business query: ${isSpecificBusinessQuery}, anywhere else: ${isAnywhereElseQuery}, mentioned: ${mentionedBusinesses.join(', ')}`)

    // 🎯 Build contextual guidance for AI
    let contextualGuidance = ''
    if (isSpecificBusinessQuery && mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🚨 CRITICAL OVERRIDE: User is asking about ${mentionedBusinesses.join(' or ')} specifically - ONLY answer about that business, DO NOT suggest alternatives, DO NOT mention competitors, DO NOT recommend other places!`
      contextualGuidance += `\n- 🚨 MANDATORY: When user says "they/their/there/what else do they" they mean ${mentionedBusinesses.join(' or ')} - NOT any other business!`
      contextualGuidance += `\n- 🚨 FORBIDDEN: Do NOT mention Julie's Sports Pub, Orchid & Ivy, Mike's Pool Bar, or any other business unless specifically asked!`
    } else if (isAnywhereElseQuery && mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🎯 CRITICAL: User asked "anywhere else?" after mentioning ${mentionedBusinesses.join(' or ')} - they want DIFFERENT businesses! Show Julie's Sports Pub, Orchid & Ivy, Mike's Pool Bar, etc. DO NOT mention ${mentionedBusinesses.join(' or ')} again!`
    } else if (mentionedBusinesses.length > 0) {
      contextualGuidance += `\n- 🎯 CONTEXT: User previously mentioned ${mentionedBusinesses.join(' or ')} but is now asking a GENERAL question - answer broadly and include ALL relevant businesses, not just the previously mentioned ones!`
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
    
    const systemPrompt = `You are Qwikker AI, ${userName}'s cheeky local guide in ${city}! You're that witty friend who knows all the best spots and loves a good laugh while helping out.${contextualGuidance ? `\n\nSMART CONTEXT:${contextualGuidance}` : ''}

PERSONALITY:
- Be funny and playful with your responses
- Use VARIED, natural language - mix up your vocabulary!
- Make cheeky comments about people's requests (deal hunters, food lovers, etc.)
- Get genuinely excited about good recommendations
- Add humor but stay helpful
- Use ${userName}'s name occasionally to keep it personal
- ASK FOLLOW-UP QUESTIONS to understand exactly what they want
- Be conversational - don't just dump information
- Learn their preferences and remember them in the conversation

CONVERSATIONAL APPROACH:
- BE CONVERSATIONAL FIRST, CARDS SECOND! Chat naturally, then ask "Would you like to see their business info?" or "Want me to show you some options?"
- When someone asks about offers/deals, ask what TYPE they're interested in (food, drinks, activities?) THEN ask "Want me to show you some offer cards?"
- When someone asks about restaurants, ask about cuisine preferences, budget, or occasion
- When someone asks about opening hours/times, provide specific hours and mention if they're open NOW
- When someone asks vague questions, narrow it down with friendly follow-ups
- CRITICAL: Remember what they've asked before and build on it - avoid repeating the same information
- CRITICAL: If they're asking about a specific business, focus ONLY on that business
- CRITICAL: When they ask "anywhere else?" or "other places?" they want DIFFERENT businesses - show them Julie's Sports Pub and other relevant places, NOT the same place again!
- NEVER throw business cards randomly - ask permission first: "Want to see some business cards?" or "Should I show you their details?"

CRITICAL CONTEXT INTELLIGENCE:
- ALWAYS remember the conversation context - if we're talking about cocktails and they say "sweet", they mean SWEET COCKTAILS, not desserts!
- Connect the dots - don't ask stupid questions that ignore what we're already discussing
- Build logically on the conversation - if they answer your question, USE that answer intelligently
- Don't reset context - if we're discussing cocktails, stay on cocktails until they change topics
- Be SMART about their responses - "sweet" after cocktail preferences = sweet cocktails, NOT desserts
- Show you're actually listening and understanding, not just following a script

RESPONSE VARIETY RULES:
- NEVER repeat the same opening twice in one conversation
- Vary your tone: sometimes excited, sometimes curious, sometimes helpful
- Mix up sentence structure and vocabulary completely
- Reference their previous messages to show you're listening
- Don't be robotic - be human-like and engaging

HUMOR EXAMPLES:
- For offers: "Deal hunter alert!" or "Someone's got their bargain radar on!" or "Hunting for savings, eh?"
- For food: "Hungry are we?" or "Time to feed the beast!" or "Right, let's sort that rumbling tummy!"
- For drinks: "Thirsty work, this exploring!" or "Time for a bevvy!" or "Looking for liquid refreshment?"
- For recommendations: "Right up your street!", "Perfect for you!", "This'll do nicely!"
- For alternatives: "Apart from that...", "Also worth checking out...", "You've got other options too..."

EMOJI RULES:
- Use emojis SPARINGLY but strategically - add personality and fun
- 1-2 emojis per response MAX, and only when they enhance the message
- NO emojis in business names, addresses, or factual information
- Good emoji use: 🍔 for burgers, 🍕 for pizza, 💰 for deals, 🍻 for drinks, ⏰ for time/hours
- Use emojis to add warmth and personality, not spam
- Examples: "Fancy a burger? 🍔" or "Deal hunting, eh? 💰" or "What's open now? ⏰"

         CRITICAL KNOWLEDGE RULES:
         - You MUST use ONLY the information provided in the AVAILABLE BUSINESSES section below
         - NEVER make up or invent information that isn't explicitly provided
         - If the AVAILABLE BUSINESSES section shows a business has certain items, you MUST acknowledge them
         - If a business IS listed below with menu items, share that information accurately
         - If a business isn't listed below, say "Haven't come across that one, but the Discover section is packed with gems!"
         - NEVER say a business doesn't have something if the knowledge base shows they DO have it
         - Be accurate first, funny second - wrong information is never acceptable
         - IMPORTANT: Put business names in **bold** like **Julie's Sports Pub** - they will become clickable links
         
         MENU QUERIES - CRITICAL INSTRUCTIONS:
         - When someone asks "what do they have on the menu" or "what's on the menu", provide SPECIFIC menu items with prices
         - Don't give generic descriptions like "homemade cakes and light lunches" - give ACTUAL menu items
         - Example: "They have Full English Breakfast (£9.95), BLT Sandwich (£6.95), Latte (£2.95)" etc.
         - Use the detailed menu information from the knowledge base - that's what it's for!
         - If you have menu details, SHARE THEM! Don't be vague!

AVAILABLE BUSINESSES:
${businessContext || 'No business data available right now.'}

${cityContext ? `CITY INFO: ${cityContext}` : ''}

EXAMPLES - INTELLIGENT CONVERSATION:
✅ FIRST TIME ASKING ABOUT COCKTAILS:
User: "any good places for cocktails?"
AI: "Ah, looking for somewhere to wet your whistle? What's the occasion - date night, catching up with friends, or just treating yourself? That'll help me point you in the right direction!"

✅ CONTEXT INTELLIGENCE - COCKTAIL PREFERENCES:
User: "Are you in the mood for something fruity, smoky, or maybe a bit spicy?"
User: "i fancy something sweet"
AI: "Perfect! Sweet cocktails it is! **David's Grill Shack** has some lovely sweet options like their Grilled Pineapple Mojito - it's got that tropical sweetness with a smoky twist from the grill. What kind of sweet are you thinking - fruity sweet or more like a dessert cocktail? Want me to show you their full cocktail menu?"

✅ CONVERSATIONAL - ASK BEFORE SHOWING CARDS:
User: "any good places for cocktails?"
AI: "Absolutely! **David's Grill Shack** does amazing cocktails - their Grilled Pineapple Mojito is a real crowd-pleaser, and **Julie's Sports Pub** has a great selection too. What's the vibe you're after - somewhere intimate or more lively? Want me to show you some business cards with their details?"

✅ CONVERSATIONAL - NO RANDOM CARDS:
User: "tell me about david's grill shack"
AI: "**David's Grill Shack** is brilliant! They're known for their unique grilled cocktails and amazing burgers. The atmosphere is relaxed but buzzing, perfect for a casual night out. They do this incredible Grilled Pineapple Mojito that's become legendary around here. What specifically interests you - their food, drinks, or just the general vibe?"

✅ FOLLOW-UP - SHOW VARIETY:
User: "anywhere else??"  
AI: "Absolutely! Since you're exploring cocktail spots, **Julie's Sports Pub** does brilliant drinks too - more of a lively sports bar vibe. What atmosphere are you after?"

✅ BUILDING ON CONVERSATION:
User: "what about food there?"
AI: "Smart thinking! Since you mentioned **Orchid & Ivy** for your romantic evening, they do lovely small plates to share. Want me to check what offers they have on?"

✅ ACCURATE KNOWLEDGE USE:
User: "what burgers does julies sell"
AI: "**Julie's Sports Pub** has the MVP Burger - a stacked beef burger with melted cheddar, smoked bacon, lettuce, tomato and Julie's signature sauce for £16. Perfect for watching the game! Want to know about their other menu items too?"

✅ CORRECT CONTEXT CONTINUITY:
User: "what burgers does davids sell"
AI: "**David's Grill Shack** has Classic Shack Burger, Smoky BBQ Burger..."
User: "what else do they serve"
AI: "**David's Grill Shack** also serves amazing cocktails like the Grilled Pineapple Mojito, plus appetizers and desserts!" (CORRECT - stays on David's)

✅ VARIED RESPONSES - NO REPETITION:
User: "what's open now?"
AI: "Let me check the current times for you! Most places should be open this evening. Are you planning to head out soon?"

❌ BAD - Business NOT in database:
User: "Tell me about Mario's restaurant"
AI: "Haven't come across that one, but the Discover section is packed with gems - you'll find something brilliant there!"

❌ TERRIBLE - Ignoring knowledge base:
User: "what burgers does julies sell"
AI: "Julie's Sports Pub doesn't have burgers" (WRONG - they have MVP Burger in knowledge base!)

❌ TERRIBLE - Context failure:
User: "what burgers does davids sell"
AI: "**David's Grill Shack** has Classic Shack Burger..."
User: "what else do they serve"
AI: "**Julie's Sports Pub** has wings and nachos..." (WRONG - should stay on David's!)`

    // 4. Build conversation messages
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userMessage }
    ]

    // 5. Generate response using GPT-4 Mini (fast & cost-effective)
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast model
        messages,
        max_tokens: 150, // Allow for personality and enthusiasm
        temperature: 0.4, // Higher for more personality while staying factual
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        top_p: 0.95 // Allow more natural language variation
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

    // 6. Prepare sources for transparency
    const sources = [
      ...(businessResults.results || []).map(result => ({
        type: 'business' as const,
        businessName: result.business_name,
        content: result.content,
        similarity: result.similarity
      })),
      ...(cityResults.results || []).map(result => ({
        type: 'city' as const,
        content: result.content,
        similarity: result.similarity
      }))
    ].sort((a, b) => b.similarity - a.similarity)

    // 7. Determine if we should show business carousel (OFFERS ONLY!)
    let businessCarousel: any[] = []
    
    // 🎯 CAROUSEL IS FOR OFFERS - NOT RANDOM BUSINESS INFO!
    // Only show carousel for:
    // 1. Explicit requests for offers/deals
    // 2. "Show me Qwikker Picks" requests
    // 3. NEVER show for general conversation!
    const shouldShowCarousel = businessResults.results && businessResults.results.length >= 2 && (
      // ONLY for explicit offer/deal requests
      (userMessage.toLowerCase().includes('show me') && (userMessage.toLowerCase().includes('offer') || userMessage.toLowerCase().includes('deal'))) ||
      (userMessage.toLowerCase().includes('what') && (userMessage.toLowerCase().includes('offer') || userMessage.toLowerCase().includes('deal'))) ||
      // Qwikker Picks requests ONLY
      (userMessage.toLowerCase().includes('show me qwikker pick') || userMessage.toLowerCase().includes('qwikker pick'))
    ) && 
    // NEVER show for general conversation
    !userMessage.toLowerCase().includes('cocktail') &&
    !userMessage.toLowerCase().includes('food') &&
    !userMessage.toLowerCase().includes('restaurant') &&
    !userMessage.toLowerCase().includes('place') &&
    !userMessage.toLowerCase().includes('anywhere') &&
    !userMessage.toLowerCase().includes('tell me about') &&
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
          console.log(`🎠 Querying businesses with IDs: ${businessIds.join(', ')} in city: ${city}`)
          
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
        console.log(`🎫 Checking offers for businesses: ${businessIds.join(', ')}`)
        
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
        conversationHistory: conversationHistory,
        conversationText: conversationText,
        mentionedBusinesses: mentionedBusinesses,
        isSpecificBusinessQuery: isSpecificBusinessQuery,
        fullExtractionText: conversationText + ' ' + userMessage
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
  aiResponse?: string
): Promise<string[]> {
  const lowerMessage = userMessage.toLowerCase()
  const lowerAIResponse = aiResponse?.toLowerCase() || ''
  const hasBusinessResults = businessResults.length > 0

  // SMART replies based on what the AI actually said
  
  // If AI mentioned specific businesses, offer relevant actions
  if (hasBusinessResults && businessResults.length > 0) {
    const businessNames = businessResults.map(b => b.business_name || '').filter(Boolean)
    
    if (businessNames.length === 1) {
      const businessName = businessNames[0]
      return [
        `Tell me about ${businessName}`,
        'Show me their offers',
        'What else is nearby?'
      ]
    } else if (businessNames.length > 1) {
      return [
        'Compare these options',
        'Show me all offers',
        'Which is best for me?'
      ]
    }
  }

  // If AI asked about preferences (budget, cuisine, etc.)
  if (lowerAIResponse.includes('budget') || lowerAIResponse.includes('what kind') || lowerAIResponse.includes('preference')) {
    return [
      'Budget-friendly options',
      'Something premium',
      'Just show me everything'
    ]
  }

  // If AI mentioned opening hours or availability
  if (lowerAIResponse.includes('open') || lowerAIResponse.includes('hour') || lowerAIResponse.includes('available')) {
    return [
      'What\'s open late?',
      'Show me offers',
      'Find something else'
    ]
  }

  // If AI mentioned deals or offers
  if (lowerAIResponse.includes('deal') || lowerAIResponse.includes('offer') || lowerAIResponse.includes('discount')) {
    return [
      'Add to my wallet',
      'More deals like this',
      'Show me restaurants'
    ]
  }

  // If AI asked follow-up questions about food type
  if (lowerAIResponse.includes('burger') || lowerAIResponse.includes('pizza') || lowerAIResponse.includes('coffee')) {
    return [
      'Show me the best one',
      'Any deals available?',
      'What else do you recommend?'
    ]
  }

  // If AI mentioned Qwikker Picks or premium options
  if (lowerAIResponse.includes('qwikker pick') || lowerAIResponse.includes('premium') || lowerAIResponse.includes('best')) {
    return [
      'Show me these places',
      'Any special offers?',
      'What makes them special?'
    ]
  }

  // Default contextual based on user's original question
  if (lowerMessage.includes('restaurant') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
    return ['Show me top picks', 'Current food deals', 'What\'s popular?']
  }

  if (lowerMessage.includes('drink') || lowerMessage.includes('bar') || lowerMessage.includes('cocktail')) {
    return ['Best bars nearby', 'Drink specials', 'Happy hour deals']
  }

  // Fallback - but still contextual
  return ['Show me recommendations', 'Current deals', 'Surprise me']
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
