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
 * Generate AI response using RAG (Retrieval-Augmented Generation)
 */
export async function generateAIResponse(
  userMessage: string,
  context: ChatContext
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

    // 1. Search for relevant knowledge using vector similarity (reduced for speed)
    const [businessResults, cityResults] = await Promise.all([
      searchBusinessKnowledge(userMessage, city, { matchCount: 4 }), // Reduced from 8
      searchCityKnowledge(userMessage, city, { matchCount: 2 })      // Reduced from 3
    ])

    // Check if user is asking for Qwikker Picks specifically
    const isQwikkerPicksRequest = userMessage.toLowerCase().includes('qwikker pick') || 
                                  userMessage.toLowerCase().includes('spotlight') ||
                                  userMessage.toLowerCase().includes('featured')

    // Smart context detection for better responses
    const isTimeRequest = userMessage.toLowerCase().includes('now') ||
                         userMessage.toLowerCase().includes('open') ||
                         userMessage.toLowerCase().includes('today') ||
                         userMessage.toLowerCase().includes('tonight') ||
                         userMessage.toLowerCase().includes('current')

    const isDateNightRequest = userMessage.toLowerCase().includes('date') ||
                              userMessage.toLowerCase().includes('romantic') ||
                              userMessage.toLowerCase().includes('special occasion')
    
    const isFamilyRequest = userMessage.toLowerCase().includes('family') ||
                           userMessage.toLowerCase().includes('kids') ||
                           userMessage.toLowerCase().includes('children')

    const isQuickBiteRequest = userMessage.toLowerCase().includes('quick') ||
                              userMessage.toLowerCase().includes('fast') ||
                              userMessage.toLowerCase().includes('grab and go')

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

    // 3. Build smart, context-aware system prompt
    let contextualGuidance = ""
    if (isTimeRequest) {
      contextualGuidance += "\n- PRIORITY: User asking about current availability - focus on opening hours and what's open NOW"
    }
    if (isDateNightRequest) {
      contextualGuidance += "\n- CONTEXT: User wants romantic/date night options - suggest upscale, intimate venues with ambiance"
    }
    if (isFamilyRequest) {
      contextualGuidance += "\n- CONTEXT: User needs family-friendly options - mention kid-friendly venues and family deals"
    }
    if (isQuickBiteRequest) {
      contextualGuidance += "\n- CONTEXT: User wants something quick - focus on fast service, takeaway options, grab-and-go"
    }
    if (isQwikkerPicksRequest) {
      contextualGuidance += "\n- CONTEXT: User specifically wants premium recommendations - highlight Qwikker Picks (spotlight tier) businesses FIRST"
    }

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
- When someone asks about offers/deals, ask what TYPE they're interested in (food, drinks, activities?)
- When someone asks about restaurants, ask about cuisine preferences, budget, or occasion
- When someone asks about opening hours/times, provide specific hours and mention if they're open NOW
- When someone asks vague questions, narrow it down with friendly follow-ups
- Remember what they've asked before and build on it
- Suggest alternatives based on their interests

VOCABULARY VARIETY (mix these up, don't repeat!):
- Greetings: "Hey ${userName}!", "Right then!", "Ooh!", "Well well!", "Ah!", or just dive in
- Friendly terms: "you", "friend", "${userName}", "folks", "you lovely person", or no address at all
- Enthusiasm: "Brilliant!", "Perfect!", "Excellent!", "Great choice!", "Nice one!", "Spot on!", "Love it!", "Yes!", "Absolutely!"
- Casual responses: "For sure", "Definitely", "You bet", "Absolutely", "Course!", "Right you are!"
- Avoid overusing: "superstar", "legend" (use sparingly, maybe 1 in 10 responses)

HUMOR EXAMPLES:
- For offers: "Ah, a deal hunter! I like your style..." or "Someone's got their bargain radar on!" or "Hunting for savings, eh?"
- For food: "Hungry are we?" or "Time to feed the beast!" or "Right, let's sort that rumbling tummy!"
- For drinks: "Fancy a tipple?" or "Thirsty work, this exploring!" or "Time for a bevvy!"
- For recommendations: "Right up your street!", "Perfect for you!", "This'll do nicely!"

EMOJI RULES:
- Use emojis SPARINGLY but strategically - add personality and fun
- 1-2 emojis per response MAX, and only when they enhance the message
- NO emojis in business names, addresses, or factual information
- Good emoji use: 🍔 for burgers, 🍕 for pizza, 💰 for deals, 🍻 for drinks, ⏰ for time/hours
- Use emojis to add warmth and personality, not spam
- Examples: "Fancy a burger? 🍔" or "Deal hunting, eh? 💰" or "What's open now? ⏰"

RULES:
- Use ONLY information from the AVAILABLE BUSINESSES section below
- If you have info, share it with humor and enthusiasm
- If a business isn't listed below, say something like "Haven't come across that one, but the Discover section is packed with gems!"
- Never invent business names, addresses, or details not provided
- Keep responses funny but under 3 sentences
- IMPORTANT: Put business names in **bold** like **Julie's Sports pub** - they will become clickable links

AVAILABLE BUSINESSES:
${businessContext || 'No business data available right now.'}

${cityContext ? `CITY INFO: ${cityContext}` : ''}

EXAMPLES:
✅ GOOD - Conversational and helpful:
User: "What offers are available?"
AI: "Ooh, a deal hunter! What kind of offers are you after? Food deals, drinks, or maybe something else? I've got some brilliant savings to share!"

User: "Tell me about offers"
AI: "Right then! There are loads of great deals around. Are you looking for restaurant discounts, drink specials, or something specific? What's caught your eye?"

User: "Any good burger places?"
AI: "Hungry for burgers, eh? You're in luck! What's your vibe - fancy gourmet or classic comfort food? And are you bothered about deals or just want the best quality?"

User: "Show me offers from David's Grill Shack"
AI: "Brilliant choice! **David's Grill Shack** has two cracking offers: 15% off cocktails and 30% off their Mighty Mixed Grill. Both valid Monday-Friday 9am-6pm. Fancy adding either to your wallet?"

User: "What time are they open today?"
AI: "**David's Grill Shack** is open today 12:30-22:00! Perfect timing - they're open right now if you want to pop in!"

User: "Add to wallet"
AI: "Perfect! I can add these offers directly to your wallet pass - just click the green 'Add to Wallet' buttons below and they'll be ready to use in seconds!"

❌ BAD - Business NOT in database:
User: "Tell me about Mario's restaurant"
AI: "Haven't come across that one, but the Discover section is packed with gems - you'll find something brilliant there!"`

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

    // 7. Determine if we should show business carousel
    let businessCarousel: any[] = []
    
    // Check if we should show a business carousel (MORE RESPONSIVE - show cards when helpful!)
    const shouldShowCarousel = businessResults.results && businessResults.results.length >= 2 && (
      // Direct comparison/choice requests
      (userMessage.toLowerCase().includes('recommend') && userMessage.toLowerCase().includes('place')) ||
      (userMessage.toLowerCase().includes('suggest') && userMessage.toLowerCase().includes('place')) ||
      (userMessage.toLowerCase().includes('show me') && (userMessage.toLowerCase().includes('place') || userMessage.toLowerCase().includes('option') || userMessage.toLowerCase().includes('business'))) ||
      (userMessage.toLowerCase().includes('where can i') && userMessage.toLowerCase().includes('get')) ||
      (userMessage.toLowerCase().includes('best') && userMessage.toLowerCase().includes('place')) ||
      (userMessage.toLowerCase().includes('good') && userMessage.toLowerCase().includes('place')) ||
      // Food/drink discovery requests
      (userMessage.toLowerCase().includes('burger') && (userMessage.toLowerCase().includes('place') || userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('where'))) ||
      (userMessage.toLowerCase().includes('pizza') && (userMessage.toLowerCase().includes('place') || userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('where'))) ||
      (userMessage.toLowerCase().includes('coffee') && (userMessage.toLowerCase().includes('place') || userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('where'))) ||
      (userMessage.toLowerCase().includes('restaurant') && (userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('recommend') || userMessage.toLowerCase().includes('best'))) ||
      (userMessage.toLowerCase().includes('food') && (userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('where') || userMessage.toLowerCase().includes('best'))) ||
      (userMessage.toLowerCase().includes('eat') && (userMessage.toLowerCase().includes('where') || userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('best'))) ||
      (userMessage.toLowerCase().includes('drink') && (userMessage.toLowerCase().includes('where') || userMessage.toLowerCase().includes('good') || userMessage.toLowerCase().includes('best'))) ||
      // Qwikker Picks requests
      isQwikkerPicksRequest ||
      // General discovery
      (userMessage.toLowerCase().includes('show me') && userMessage.toLowerCase().includes('business')) ||
      (userMessage.toLowerCase().includes('what') && userMessage.toLowerCase().includes('available')) ||
      (userMessage.toLowerCase().includes('explore') || userMessage.toLowerCase().includes('discover'))
    ) && 
    // Exclude very specific info requests
    !userMessage.toLowerCase().includes('tell me about') &&
    !userMessage.toLowerCase().includes('what time') &&
    !userMessage.toLowerCase().includes('opening hours') &&
    !userMessage.toLowerCase().includes('address of') &&
    !userMessage.toLowerCase().includes('phone number')
    
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
          
          if (error) {
            console.error('❌ Supabase query error:', error)
          }
          
          console.log(`🎠 Fetched ${businesses?.length || 0} businesses for carousel`)
          
          if (businesses) {
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

    return {
      success: true,
      response,
      sources,
      businessCarousel: businessCarousel.length > 0 ? businessCarousel : undefined,
      walletActions: walletActions.length > 0 ? walletActions : undefined
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
