import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { message, walletPassId, city = 'bournemouth' } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    
    // Get user's city if wallet pass provided
    let userCity = city
    if (walletPassId) {
      const { data: user } = await supabase
        .from('app_users')
        .select('city, name')
        .eq('wallet_pass_id', walletPassId)
        .single()
      
      if (user) {
        userCity = user.city
      }
    }

    // Search knowledge base using text search (no embeddings needed)
    const { data: knowledgeResults, error } = await supabase
      .from('knowledge_base')
      .select(`
        id, title, content, metadata, business_id,
        business_profiles!left(business_name, business_category, business_type)
      `)
      .eq('city', userCity.toLowerCase())
      .eq('status', 'active')
      .textSearch('content', message.replace(/[^a-zA-Z0-9\s]/g, ''), {
        type: 'websearch',
        config: 'english'
      })
      .limit(5)

    if (error) {
      console.error('❌ Error searching knowledge base:', error)
    }

    // Generate simple AI-like response based on found knowledge
    const response = generateSimpleResponse(message, knowledgeResults || [], userCity)

    // Generate quick replies based on content
    const quickReplies = generateQuickReplies(message, knowledgeResults || [])

    return NextResponse.json({
      response,
      quickReplies,
      sources: (knowledgeResults || []).map(item => ({
        title: item.title,
        businessName: item.business_profiles?.business_name,
        content: item.content.substring(0, 200) + '...'
      }))
    })

  } catch (error: any) {
    console.error('❌ AI Chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateSimpleResponse(message: string, knowledge: any[], city: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (knowledge.length === 0) {
    if (lowerMessage.includes('food') || lowerMessage.includes('eat') || lowerMessage.includes('restaurant')) {
      return `I don't have specific information about that, but ${city.charAt(0).toUpperCase() + city.slice(1)} has some great restaurants! Try asking about specific cuisines or check the Discover page for all available options.`
    }
    
    if (lowerMessage.includes('offer') || lowerMessage.includes('deal') || lowerMessage.includes('discount')) {
      return `I don't see any specific offers matching that search, but there are always great deals available in ${city.charAt(0).toUpperCase() + city.slice(1)}! Check the Offers page to see all current promotions.`
    }
    
    return `I don't have specific information about that in my knowledge base for ${city.charAt(0).toUpperCase() + city.slice(1)}. Try asking about restaurants, offers, or specific business names!`
  }

  // Found relevant knowledge
  const businesses = knowledge.filter(k => k.business_id).map(k => k.business_profiles?.business_name).filter(Boolean)
  const uniqueBusinesses = [...new Set(businesses)]
  
  if (uniqueBusinesses.length === 1) {
    const businessName = uniqueBusinesses[0]
    const businessKnowledge = knowledge.find(k => k.business_profiles?.business_name === businessName)
    
    if (lowerMessage.includes('offer') || lowerMessage.includes('deal')) {
      return `Great question! ${businessName} has some excellent offers. ${extractOfferInfo(businessKnowledge.content)} You can claim these offers through the Qwikker app!`
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('food')) {
      return `${businessName} is a fantastic choice! ${extractMenuInfo(businessKnowledge.content)} Check out their full details in the app for more information.`
    }
    
    return `${businessName} is a great local business in ${city.charAt(0).toUpperCase() + city.slice(1)}! ${extractBasicInfo(businessKnowledge.content)} Would you like to know more about their offers or menu?`
  }
  
  if (uniqueBusinesses.length > 1) {
    return `I found several great options in ${city.charAt(0).toUpperCase() + city.slice(1)}: ${uniqueBusinesses.slice(0, 3).join(', ')}${uniqueBusinesses.length > 3 ? ` and ${uniqueBusinesses.length - 3} more` : ''}. Each has something special to offer! Which one interests you most?`
  }
  
  return `Here's what I found in ${city.charAt(0).toUpperCase() + city.slice(1)}: ${knowledge[0].content.substring(0, 150)}... Would you like to know more about any specific business?`
}

function extractOfferInfo(content: string): string {
  const lines = content.split('\n')
  const offerLines = lines.filter(line => 
    line.toLowerCase().includes('offer') || 
    line.toLowerCase().includes('deal') ||
    line.toLowerCase().includes('discount') ||
    line.toLowerCase().includes('%') ||
    line.toLowerCase().includes('free')
  )
  
  if (offerLines.length > 0) {
    return offerLines.slice(0, 2).join(' ')
  }
  
  return "They have some great deals available!"
}

function extractMenuInfo(content: string): string {
  const lines = content.split('\n')
  const menuLines = lines.filter(line => 
    line.toLowerCase().includes('menu') || 
    line.toLowerCase().includes('food') ||
    line.toLowerCase().includes('cuisine') ||
    line.toLowerCase().includes('category:')
  )
  
  if (menuLines.length > 0) {
    return menuLines.slice(0, 2).join(' ')
  }
  
  return "They have a great menu with lots of options!"
}

function extractBasicInfo(content: string): string {
  const lines = content.split('\n').slice(0, 4)
  return lines.join(' ').substring(0, 100) + '...'
}

function generateQuickReplies(message: string, knowledge: any[]): string[] {
  const lowerMessage = message.toLowerCase()
  
  if (knowledge.length === 0) {
    return [
      "Show me restaurants",
      "What offers are available?", 
      "Tell me about local businesses"
    ]
  }
  
  const hasBusinesses = knowledge.some(k => k.business_id)
  
  if (hasBusinesses) {
    if (lowerMessage.includes('offer') || lowerMessage.includes('deal')) {
      return [
        "How do I claim this offer?",
        "Are there more deals?",
        "Show me other businesses"
      ]
    }
    
    if (lowerMessage.includes('menu') || lowerMessage.includes('food')) {
      return [
        "What's their specialty?",
        "Do they have offers?",
        "Show me similar restaurants"
      ]
    }
    
    return [
      "Tell me about their offers",
      "What's on their menu?",
      "Show me more businesses"
    ]
  }
  
  return [
    "Find restaurants",
    "Show me offers", 
    "What's popular here?"
  ]
}
