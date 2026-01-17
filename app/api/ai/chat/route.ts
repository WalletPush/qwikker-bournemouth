import { NextRequest, NextResponse } from 'next/server'
import { generateHybridAIResponse } from '@/lib/ai/hybrid-chat'
import { generateQuickReplies, categorizeUserMessage } from '@/lib/ai/chat'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { getValidatedUser } from '@/lib/utils/wallet-pass-security'

export async function POST(request: NextRequest) {
  try {
    const { message, walletPassId, conversationHistory } = await request.json()

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

    // 🚀 Generate AI response using HYBRID system (GPT-4o-mini + GPT-4o)
    const result = await generateHybridAIResponse(message, {
      city,
      userName,
      walletPassId
    }, conversationHistory || [])

    if (!result.success) {
      console.error('❌ AI response generation failed:', result.error)
      return NextResponse.json({
        response: "I'm having trouble accessing my knowledge base right now. Please try again in a moment, or explore the Discover page to find great local businesses!",
        sources: [],
        quickReplies: ['Show me offers', 'Find restaurants', 'What\'s new?']
      })
    }

    // Generate quick reply suggestions based on AI response
    const quickReplies = await generateQuickReplies(
      message,
      result.sources?.filter(s => s.type === 'business') || [],
      result.sources?.filter(s => s.type === 'city') || [],
      result.response, // Pass the AI response for context
      conversationHistory // Pass conversation history for context-aware suggestions
    )

    // Categorize the message for analytics
    const messageCategory = await categorizeUserMessage(message)
    console.log(`📊 Message category: ${messageCategory.category} (confidence: ${messageCategory.confidence})`)

    console.log('🎯 API RESPONSE:', {
      eventCardsCount: result.eventCards?.length || 0,
      eventCards: result.eventCards
    })

    return NextResponse.json({
      response: result.response,
      sources: result.sources || [],
      quickReplies,
      hasBusinessResults: result.hasBusinessResults, // For Atlas "earned moment"
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
        debug_eventCardsCount: result.eventCards?.length || 0
      }
    })

  } catch (error) {
    console.error('❌ AI Chat API error:', error)
    
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties right now. Please try again in a moment! In the meantime, you can explore the Discover page to find amazing local businesses and offers.",
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
