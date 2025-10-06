import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export async function POST(request: Request) {
  try {
    const { message, profile, conversationHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!openai) {
      return NextResponse.json({ 
        response: "I'm sorry, the AI support system is temporarily unavailable. Please contact support directly for assistance with your business dashboard." 
      })
    }

    // Build context about the business and dashboard
    const businessContext = `
You are a helpful AI assistant for Qwikker Business Dashboard. You help business owners optimize their listings and understand the platform.

BUSINESS PROFILE CONTEXT:
${profile ? `
- Business Name: ${profile.business_name || 'Not set'}
- Business Type: ${profile.business_type || 'Not specified'}
- Category: ${profile.business_category || 'Not specified'}
- Status: ${profile.status || 'Unknown'}
- Profile Completion: ${profile.profile_completion_percentage || 0}%
- Has Logo: ${profile.logo ? 'Yes' : 'No'}
- Has Menu: ${profile.menu_url ? 'Yes' : 'No'}
- Has Business Hours: ${profile.business_hours ? 'Yes' : 'No'}
- Has Offer: ${profile.offer_name ? 'Yes' : 'No'}
- Business Images: ${profile.business_images?.length || 0} uploaded
` : 'Profile information not available'}

QWIKKER BUSINESS DASHBOARD KNOWLEDGE:
- Profile completion is crucial for visibility and customer trust
- High-quality photos significantly impact customer engagement
- Business hours should be accurate and up-to-date
- Offers should be compelling but realistic (10-20% discounts work well)
- Reviews and ratings are key for local discovery
- The platform connects businesses with local customers through AI-powered recommendations
- Analytics show customer engagement, offer performance, and discovery metrics
- Mobile wallet integration allows customers to save offers directly to their phones

HELP CATEGORIES:
1. PROFILE COMPLETION: Guide on adding missing information, photos, business details
2. PHOTO OPTIMIZATION: Tips for taking professional business photos, lighting, angles
3. OFFER CREATION: Best practices for creating attractive offers that convert
4. ANALYTICS: Explaining metrics, performance indicators, and how to improve
5. CUSTOMER ENGAGEMENT: Strategies for getting reviews, repeat customers
6. TECHNICAL SUPPORT: Troubleshooting platform issues, upload problems

Always be helpful, encouraging, and specific. Provide actionable advice tailored to their business type and current profile status.
`

    // Build conversation history for context
    const messages = [
      {
        role: 'system',
        content: businessContext
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.7,
    })

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response right now."

    return NextResponse.json({ response })

  } catch (error) {
    console.error('AI Support API error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
