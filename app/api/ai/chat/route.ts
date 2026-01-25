import { NextRequest, NextResponse } from 'next/server'
import { generateHybridAIResponse } from '@/lib/ai/hybrid-chat'
import { generateQuickReplies, categorizeUserMessage } from '@/lib/ai/chat'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'

/**
 * Detect "near me" intent from user message
 */
function detectNearMeIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  const nearMePatterns = [
    'near me',
    'close by',
    'nearby',
    'around here',
    'walking distance',
    'close to me',
    'around me',
    'in my area',
    'local to me',
    'closest',
    'nearest'
  ]
  return nearMePatterns.some(pattern => lowerMessage.includes(pattern))
}

/**
 * Detect primary intent from user message
 */
function detectIntent(message: string): 'near_me' | 'browse' | 'events' | 'offers' | 'unknown' {
  const lowerMessage = message.toLowerCase()
  
  if (detectNearMeIntent(message)) return 'near_me'
  if (lowerMessage.includes('event') || lowerMessage.includes('happening')) return 'events'
  if (lowerMessage.includes('offer') || lowerMessage.includes('deal') || lowerMessage.includes('discount')) return 'offers'
  if (lowerMessage.includes('find') || lowerMessage.includes('show') || lowerMessage.includes('restaurant') || lowerMessage.includes('bar') || lowerMessage.includes('cafe')) return 'browse'
  
  return 'unknown'
}

/**
 * Generate deterministic quick replies based on context
 */
function generateDeterministicQuickReplies(
  intent: string,
  needsLocation: boolean,
  hasBusinessResults: boolean,
  hasEventCards: boolean
): string[] {
  if (needsLocation) {
    return ["Use my location", "Show city centre instead"]
  }
  
  if (hasBusinessResults) {
    return ["Show me on Atlas", "More like this", "Filter options"]
  }
  
  if (hasEventCards) {
    return ["More events", "This weekend", "Family-friendly"]
  }
  
  // Default suggestions
  if (intent === 'offers') {
    return ["Current deals", "Qwikker Picks", "Near me"]
  }
  
  return ["Find restaurants", "Current deals", "Qwikker Picks"]
}

export async function POST(request: NextRequest) {
  try {
    const { message, walletPassId, conversationHistory, userLocation } = await request.json()

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    // Get franchise city from request
    const city = await getFranchiseCityFromRequest()
    console.log(`🤖 AI Chat request for city: ${city}`)

    // Validate user if wallet pass ID provided
    let userName = 'there'
    if (walletPassId) {
      const { user, isValid } = await getValidatedUser(walletPassId)
      if (isValid && user) {
        userName = user.name || 'there'
        console.log(`✅ Validated user: ${userName}`)
      } else {
        console.warn(`⚠️ Invalid wallet pass ID in AI chat: ${walletPassId}`)
      }
    }
    
    // Detect intent
    const intent = detectIntent(message)
    const isNearMeQuery = intent === 'near_me'
    const hasUserLocation = !!(userLocation?.lat && userLocation?.lng)
    
    console.log(`🎯 Intent: ${intent}, NearMe: ${isNearMeQuery}, HasLocation: ${hasUserLocation}`)
    
    // Gate near-me queries: if user asks "near me" but no location, block results and ask for permission
    const needsLocation = isNearMeQuery && !hasUserLocation
    
    if (needsLocation) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚫 Near-me query without location - GATE ACTIVE')
        console.log('   businessCarousel: undefined ✅')
        console.log('   eventCards: [] ✅')
        console.log('   hasBusinessResults: false ✅')
        console.log('   showAtlasCta: false ✅')
      }
      console.log('🚫 Near-me query without location - requesting permission')
      return NextResponse.json({
        response: `I'd love to show you places nearby! To find the best options within walking distance, I'll need to use your location.`,
        intent,
        needsLocation: true,
        showAtlasCta: false,
        locationReason: 'to show you places within walking distance',
        quickReplies: ["Use my location", "Show city centre instead"],
        hasBusinessResults: false,
        businessCarousel: undefined, // CRITICAL: No cards until location granted
        eventCards: [], // CRITICAL: No events until location granted
        sources: [],
        metadata: { city, userName, intent, needsLocationGate: true }
      })
    }

    // 🚀 Generate AI response using HYBRID system (GPT-4o-mini + GPT-4o)
    const result = await generateHybridAIResponse(message, {
      city,
      userName,
      walletPassId
    }, conversationHistory || [])

    if (!result.success) {
      console.error('❌ AI response generation failed:', result.error)
      
      // If the error is about missing API key, show a more specific message
      const isConfigurationError = result.error?.includes('not configured')
      
      return NextResponse.json({
        response: isConfigurationError 
          ? "I'm sorry, but the AI companion is temporarily unavailable for this city. Our team is working on getting it set up! In the meantime, explore the Discover page to find amazing local businesses."
          : "I'm having trouble accessing my knowledge base right now. Please try again in a moment, or explore the Discover page to find great local businesses!",
        intent: 'unknown',
        needsLocation: false,
        showAtlasCta: false,
        sources: [],
        quickReplies: ['Show me offers', 'Find restaurants', 'What\'s new?']
      })
    }
    
    // Determine if we should show Atlas CTA
    const showAtlasCta = !!(result.hasBusinessResults || isNearMeQuery)
    
    // Generate deterministic quick replies (NOT from model)
    const quickReplies = generateDeterministicQuickReplies(
      intent,
      false, // needsLocation is already handled above
      !!result.hasBusinessResults,
      !!(result.eventCards && result.eventCards.length > 0)
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✨ Quick replies (server-generated, NOT from model):', quickReplies)
    }

    // Categorize the message for analytics
    const messageCategory = await categorizeUserMessage(message)
    console.log(`📊 Message category: ${messageCategory.category} (confidence: ${messageCategory.confidence})`)

    console.log('🎯 API RESPONSE:', {
      intent,
      needsLocation: false,
      showAtlasCta,
      hasBusinessResults: result.hasBusinessResults,
      businessCarouselCount: result.businessCarousel?.length || 0,
      eventCardsCount: result.eventCards?.length || 0
    })

    return NextResponse.json({
      response: result.response,
      intent,
      needsLocation: false,
      showAtlasCta,
      sources: result.sources || [],
      quickReplies,
      hasBusinessResults: result.hasBusinessResults,
      businessCarousel: result.businessCarousel,
      walletActions: result.walletActions,
      eventCards: result.eventCards,
      metadata: {
        city,
        userName,
        category: messageCategory.category,
        sourceCount: result.sources?.length || 0,
        modelUsed: result.modelUsed,
        complexity: result.classification?.complexity,
        intent
      }
    })

  } catch (error) {
    console.error('❌ AI Chat API error:', error)
    
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties right now. Please try again in a moment! In the meantime, you can explore the Discover page to find amazing local businesses and offers.",
      intent: 'unknown',
      needsLocation: false,
      showAtlasCta: false,
      sources: [],
      quickReplies: ['Show me offers', 'Find restaurants', 'Try again'],
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
