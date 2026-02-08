import { NextRequest, NextResponse } from 'next/server'
import { generateHybridAIResponse } from '@/lib/ai/hybrid-chat'
import { generateQuickReplies, categorizeUserMessage } from '@/lib/ai/chat'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'

/**
 * Helper: Force each business link to start a new paragraph
 * MECHANICAL FIX: Handles both linked and unlinked bold business names
 */
function forceNewParagraphPerBusinessLink(text: string): string {
  if (!text) return text

  // Match BOTH formats:
  // 1. Full link: **[Business Name](/user/business/slug)**
  // 2. Plain bold: **Business Name** (when model forgets links)
  const linkRe = /\*\*\[([^\]]+)\]\(\/user\/business\/[a-z0-9-]+\)\*\*/g
  const boldRe = /\*\*([A-Z][^*]{2,}?(?:'s)?[^*]*?)\*\*/g
  
  // First collect all business mentions (linked or not)
  const mentions: Array<{ text: string; index: number }> = []
  
  // Find all linked businesses
  let m: RegExpExecArray | null
  const linkedText = text
  while ((m = linkRe.exec(linkedText)) !== null) {
    mentions.push({ text: m[0], index: m.index })
  }
  
  // Find all bold text that looks like business names (Title Case, reasonable length)
  // But ONLY if we have < 2 linked mentions (fallback mode)
  if (mentions.length < 2) {
    const boldMatches = text.match(boldRe) || []
    // Filter to likely business names: starts with capital, has reasonable words
    const likelyBusinessNames = boldMatches.filter(m => {
      const inner = m.replace(/\*\*/g, '')
      // Business names typically: Title Case, 2-50 chars, not generic phrases
      return inner.length >= 5 && 
             inner.length <= 60 &&
             !/^(The|A|An|Good|Great|Best|Perfect|Love|Want|Curious|Check|Try|Visit)\b/.test(inner)
    })
    
    if (likelyBusinessNames.length >= 2) {
      // Re-scan to get positions
      likelyBusinessNames.forEach(pattern => {
        const idx = text.indexOf(pattern)
        if (idx >= 0 && !mentions.some(m => m.index === idx)) {
          mentions.push({ text: pattern, index: idx })
        }
      })
    }
  }
  
  if (mentions.length < 2) return text.trimEnd()
  
  // Sort by index (earliest first)
  mentions.sort((a, b) => a.index - b.index)
  
  // Insert \n\n before each mention except the first
  let result = text
  let offset = 0
  
  for (let i = 1; i < mentions.length; i++) {
    const mention = mentions[i]
    const insertPos = mention.index + offset
    
    // Check if already has proper spacing
    const before = result.substring(Math.max(0, insertPos - 2), insertPos)
    if (before !== '\n\n') {
      result = result.substring(0, insertPos) + '\n\n' + result.substring(insertPos)
      offset += 2
    }
  }
  
  return result
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

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
    
    // 🗺️ ATLAS CTA LOGIC: Use server-computed metadata (don't recompute here)
    // hybrid-chat already checked coords and set atlasAvailable based on RELEVANT candidates
    const atlasAvailable = result.metadata?.atlasAvailable ?? false
    const coordsCandidateCount = result.metadata?.coordsCandidateCount ?? 0
    
    // CRITICAL FIX: Show Atlas CTA when we have EITHER carousel OR map pins
    const hasActualBusinessResults = !!(
      (result.businessCarousel && result.businessCarousel.length > 0) ||
      (result.mapPins && result.mapPins.length > 0)
    )
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🗺️ ATLAS CTA CHECK:')
      console.log(`   atlasAvailable (from hybrid-chat): ${atlasAvailable}`)
      console.log(`   coordsCandidateCount: ${coordsCandidateCount}`)
      console.log(`   hasActualBusinessResults: ${hasActualBusinessResults}`)
    }
    
    // Show Atlas CTA only if hybrid-chat says it's available (has 2+ valid coords)
    const showAtlasCta = atlasAvailable && hasActualBusinessResults
    
    // 🔧 POST-PROCESS: Remove Atlas mentions from AI response if model mentioned it but shouldn't have
    // This is a safety net - the prompt should already prevent this via atlasAvailable flag
    let finalResponse = result.response || ''
    if (!atlasAvailable && finalResponse) {
      // Remove map-related phrases (be aggressive - catch generic phrasing)
      const mapPhrases = [
        /Want to explore.*?Qwikker Atlas.*?👇/gi,
        /Want to check out.*?Qwikker Atlas.*?👇/gi,
        /Curious where.*?Qwikker Atlas.*?👇/gi,
        /Jump into Qwikker Atlas.*?👇/gi,
        /explore.*?on Qwikker Atlas.*?👇/gi,
        /check out.*?on Qwikker Atlas.*?👇/gi,
        /see.*?on Qwikker Atlas.*?👇/gi,
        /view.*?on Qwikker Atlas.*?👇/gi,
        /Just tap below.*?👇/gi,
        /Tap below.*?👇/gi,
        /Show me on Qwikker Atlas/gi,
        // Generic map phrasing (when model doesn't use "Atlas" keyword)
        /The map below helps you compare\.?/gi,
        /Want to see how these are spaced out\?/gi,
        /the map view makes it easy/gi,
        /map.*helps you compare/gi,
        /spaced out.*map/gi
      ]
      
      mapPhrases.forEach(pattern => {
        finalResponse = finalResponse.replace(pattern, '')
      })
      
      // Clean up ONLY excessive whitespace, preserve paragraph breaks
      finalResponse = finalResponse
        .replace(/  +/g, ' ') // Multiple spaces → single space
        .replace(/\?\s+\?/g, '?') // Fix double question marks
        .replace(/\n{4,}/g, '\n\n') // Collapse 4+ newlines to 2 (preserve paragraph breaks!)
        .trim()
      
      if (process.env.NODE_ENV === 'development' && finalResponse !== result.response) {
        console.log('🔧 Stripped Atlas mentions from response (atlasAvailable=false)')
      }
    }
    
    // 🎯 FINAL FORMATTING: Force business paragraphs (MUST BE LAST STEP)
    // This runs AFTER all text mutations (Atlas stripping, etc.)
    finalResponse = forceNewParagraphPerBusinessLink(finalResponse)
    
    // 🔍 DEV-ONLY: Verify paragraph spacing is preserved
    if (process.env.NODE_ENV === 'development') {
      const hasDoubleNewlines = finalResponse.includes('\n\n')
      const businessLinkCount = (finalResponse.match(/\*\*\[[^\]]+\]\(\/user\/business\/[a-z0-9-]+\)\*\*/g) || []).length
      console.log(`✅ [FINAL] Paragraph spacing preserved: ${hasDoubleNewlines}, ${businessLinkCount} business links`)
      
      // Warn if 2+ businesses but no paragraph breaks (should never happen now)
      if (businessLinkCount >= 2 && !hasDoubleNewlines) {
        console.warn(`⚠️  [FINAL] ${businessLinkCount} business links but NO paragraph breaks - formatter may have failed!`)
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
