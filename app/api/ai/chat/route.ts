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
      walletPassId,
      userLocation: hasUserLocation ? {
        latitude: userLocation.lat,
        longitude: userLocation.lng
      } : undefined
    }, conversationHistory || [])

    if (!result.success) {
      console.error('❌ AI response generation failed:', result.error)
      
      // If the error is about missing API key or empty knowledge base, show growth message
      const isConfigurationError = result.error?.includes('not configured') || result.error?.includes('knowledge base')
      
      // Get city display name for personalized message
      const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)
      
      return NextResponse.json({
        response: isConfigurationError 
          ? `I'm still getting to know ${cityDisplayName}. As local businesses verify details, I'll be able to recommend specific dishes, offers and hidden spots. For now, explore what's already live in the Discover section and your pass will update automatically.`
          : `I'm still getting to know ${cityDisplayName}. As local businesses verify details, I'll be able to recommend specific dishes, offers and hidden spots. For now, explore what's already live in the Discover section and your pass will update automatically.`,
        intent: 'unknown',
        needsLocation: false,
        showAtlasCta: false,
        sources: [],
        quickReplies: [] // REMOVED: Let users type what they want
      })
    }
    
    // CRITICAL FIX: Show Atlas CTA when we have EITHER carousel OR map pins
    // hasBusinessResults = KB hits (can be non-zero even if carousel is empty after filters)
    // businessCarousel = paid businesses (appear in carousel + map)
    // mapPins = ALL businesses for map (paid + claimed-free + unclaimed)
    const hasActualBusinessResults = !!(
      (result.businessCarousel && result.businessCarousel.length > 0) ||
      (result.mapPins && result.mapPins.length > 0)
    )
    
    // 🗺️ ATLAS CTA LOGIC: Only show if we have businesses with REAL LOCATIONS
    // Mock/test businesses with no coordinates should NOT trigger Atlas CTA
    const hasBusinessesWithLocation = !!(
      (result.businessCarousel?.some((b: any) => b.latitude != null && b.longitude != null)) ||
      (result.mapPins?.some((b: any) => b.latitude != null && b.longitude != null))
    )
    
    if (process.env.NODE_ENV === 'development') {
      const carouselWithCoords = result.businessCarousel?.filter((b: any) => b.latitude != null && b.longitude != null).map((b: any) => b.business_name) || []
      const carouselNoCoords = result.businessCarousel?.filter((b: any) => b.latitude == null || b.longitude == null).map((b: any) => b.business_name) || []
      console.log('🗺️ ATLAS CTA CHECK:')
      console.log(`   hasActualBusinessResults: ${hasActualBusinessResults}`)
      console.log(`   hasBusinessesWithLocation: ${hasBusinessesWithLocation}`)
      if (carouselWithCoords.length > 0) console.log(`   ✅ With coords: ${carouselWithCoords.join(', ')}`)
      if (carouselNoCoords.length > 0) console.log(`   ❌ No coords: ${carouselNoCoords.join(', ')}`)
    }
    
    // Show Atlas CTA only if we have actual businesses AND at least one has valid coordinates
    const showAtlasCta = hasActualBusinessResults && hasBusinessesWithLocation
    
    // 🔧 POST-PROCESS: Remove Atlas mentions from AI response if no CTA should show
    // (AI doesn't know about coordinates, so it might mention Atlas for mock businesses)
    let finalResponse = result.response
    if (!showAtlasCta && finalResponse) {
      // Remove common Atlas mention patterns
      finalResponse = finalResponse
        .replace(/Want to explore.*?Qwikker Atlas.*?👇/gi, '')
        .replace(/Curious where.*?Qwikker Atlas.*?👇/gi, '')
        .replace(/Jump into Qwikker Atlas.*?👇/gi, '')
        .replace(/explore.*?on Qwikker Atlas.*?👇/gi, '')
        .replace(/Show me on Qwikker Atlas/gi, '')
        .replace(/\s+Show me on Qwikker Atlas\s*/gi, ' ')
        .trim()
      
      if (process.env.NODE_ENV === 'development' && finalResponse !== result.response) {
        console.log('🔧 Stripped Atlas mentions from response (no valid coordinates)')
      }
    }
    
    // REMOVED: Quick replies are irrelevant and annoying - users can just type what they want
    const quickReplies: string[] = []
    
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
      response: finalResponse,
      intent,
      needsLocation: false,
      showAtlasCta,
      sources: result.sources || [],
      quickReplies,
      hasBusinessResults: result.hasBusinessResults,
      businessCarousel: result.businessCarousel,
      mapPins: result.mapPins, // ✅ ATLAS: All businesses for map (paid + unclaimed)
      queryCategories: result.queryCategories || [], // ✅ ATLAS: For filtering businesses by query
      queryKeywords: result.queryKeywords || [], // ✅ ATLAS: For filtering businesses by query
      walletActions: result.walletActions,
      eventCards: result.eventCards,
      googleReviewSnippets: result.googleReviewSnippets,
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
    
    // Get city for personalized fallback message
    const city = getFranchiseCityFromRequest() || 'this city'
    const cityDisplayName = city.charAt(0).toUpperCase() + city.slice(1)
    
    return NextResponse.json({
      response: `I'm still getting to know ${cityDisplayName}. As local businesses verify details, I'll be able to recommend specific dishes, offers and hidden spots. For now, explore what's already live in the Discover section and your pass will update automatically.`,
      intent: 'unknown',
      needsLocation: false,
      showAtlasCta: false,
      sources: [],
      quickReplies: [], // REMOVED: Let users type what they want
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
