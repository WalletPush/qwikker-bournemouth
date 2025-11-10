/**
 * Conversation State Management
 * Tracks what the user is doing, what they've seen, and their preferences
 */

export interface ConversationState {
  // Current focus
  currentBusiness: {
    id: string
    name: string
    contextType: 'browsing' | 'detailed_view' | 'comparing'
  } | null
  
  // What they've seen (to avoid repetition)
  shownOffers: string[]
  shownBusinesses: string[]
  answeredQuestions: string[]
  
  // User preferences (learned during conversation)
  userPreferences: {
    dietaryRestrictions?: string[]
    budget?: 'budget' | 'mid' | 'premium'
    favoriteCategories?: string[]
    avoidCategories?: string[]
  }
  
  // Conversation flow tracking
  conversationPhase: 'greeting' | 'browsing' | 'focused' | 'actioning'
  lastIntent: 'search' | 'details' | 'compare' | 'list_all' | 'question' | null
  messageCount: number
}

/**
 * Initialize fresh conversation state
 */
export function createInitialState(): ConversationState {
  return {
    currentBusiness: null,
    shownOffers: [],
    shownBusinesses: [],
    answeredQuestions: [],
    userPreferences: {},
    conversationPhase: 'greeting',
    lastIntent: null,
    messageCount: 0
  }
}

/**
 * Update state based on user message and AI response
 */
export function updateConversationState(
  state: ConversationState,
  userMessage: string,
  aiResponse: string,
  extractedBusinesses: string[] = []
): ConversationState {
  
  const newState = { ...state }
  newState.messageCount++
  
  // Update current business focus
  if (extractedBusinesses.length > 0) {
    // If user mentions a specific business, focus on it
    newState.currentBusiness = {
      id: extractedBusinesses[0], // Use first mentioned
      name: extractedBusinesses[0],
      contextType: userMessage.toLowerCase().includes('compare') ? 'comparing' : 'detailed_view'
    }
  } else if (userMessage.toLowerCase().includes('anywhere else') || 
             userMessage.toLowerCase().includes('other places')) {
    // User wants to see different businesses
    newState.currentBusiness = null
  }
  
  // Track shown businesses (from AI response)
  const businessMentions = extractBusinessesFromText(aiResponse)
  businessMentions.forEach(business => {
    if (!newState.shownBusinesses.includes(business)) {
      newState.shownBusinesses.push(business)
    }
  })
  
  // Track shown offers
  if (aiResponse.toLowerCase().includes('% off') || 
      aiResponse.toLowerCase().includes('deal') ||
      aiResponse.toLowerCase().includes('offer')) {
    // Extract offer mentions (simplified)
    const offerMatches = aiResponse.match(/\d+%\s*off/gi) || []
    offerMatches.forEach(offer => {
      if (!newState.shownOffers.includes(offer)) {
        newState.shownOffers.push(offer)
      }
    })
  }
  
  // Learn user preferences
  const lowerMessage = userMessage.toLowerCase()
  
  // Dietary restrictions
  if (lowerMessage.includes('veggie') || lowerMessage.includes('vegetarian')) {
    if (!newState.userPreferences.dietaryRestrictions) {
      newState.userPreferences.dietaryRestrictions = []
    }
    if (!newState.userPreferences.dietaryRestrictions.includes('vegetarian')) {
      newState.userPreferences.dietaryRestrictions.push('vegetarian')
    }
  }
  
  if (lowerMessage.includes('vegan')) {
    if (!newState.userPreferences.dietaryRestrictions) {
      newState.userPreferences.dietaryRestrictions = []
    }
    if (!newState.userPreferences.dietaryRestrictions.includes('vegan')) {
      newState.userPreferences.dietaryRestrictions.push('vegan')
    }
  }
  
  if (lowerMessage.includes('gluten') || lowerMessage.includes('coeliac')) {
    if (!newState.userPreferences.dietaryRestrictions) {
      newState.userPreferences.dietaryRestrictions = []
    }
    if (!newState.userPreferences.dietaryRestrictions.includes('gluten-free')) {
      newState.userPreferences.dietaryRestrictions.push('gluten-free')
    }
  }
  
  // Budget preferences
  if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('affordable')) {
    newState.userPreferences.budget = 'budget'
  }
  if (lowerMessage.includes('premium') || lowerMessage.includes('fancy') || lowerMessage.includes('upscale')) {
    newState.userPreferences.budget = 'premium'
  }
  
  // Category preferences
  const categories = ['burger', 'pizza', 'sushi', 'indian', 'italian', 'chinese', 'thai', 'mexican', 'seafood', 'steak']
  categories.forEach(category => {
    if (lowerMessage.includes(category)) {
      if (!newState.userPreferences.favoriteCategories) {
        newState.userPreferences.favoriteCategories = []
      }
      if (!newState.userPreferences.favoriteCategories.includes(category)) {
        newState.userPreferences.favoriteCategories.push(category)
      }
    }
  })
  
  // Update conversation phase
  if (newState.messageCount === 1) {
    newState.conversationPhase = 'browsing'
  } else if (newState.currentBusiness) {
    newState.conversationPhase = 'focused'
  } else if (newState.shownBusinesses.length > 3) {
    newState.conversationPhase = 'actioning'
  }
  
  // Detect intent
  if (lowerMessage.includes('compare') || lowerMessage.includes('versus')) {
    newState.lastIntent = 'compare'
  } else if (lowerMessage.includes('list all') || lowerMessage.includes('show all')) {
    newState.lastIntent = 'list_all'
  } else if (lowerMessage.includes('what time') || lowerMessage.includes('open') || lowerMessage.includes('menu')) {
    newState.lastIntent = 'details'
  } else if (lowerMessage.includes('find') || lowerMessage.includes('show') || lowerMessage.includes('search')) {
    newState.lastIntent = 'search'
  } else {
    newState.lastIntent = 'question'
  }
  
  return newState
}

/**
 * Extract business names from text (simplified)
 */
function extractBusinessesFromText(text: string): string[] {
  const businesses: string[] = []
  const businessKeywords = [
    "David's Grill Shack",
    "Julie's Sports Pub",
    "Alexandra's Café",
    "Orchid & Ivy",
    "Mike's Pool Bar",
    "Venezy Burgers",
    "Adams Cocktail Bar"
  ]
  
  businessKeywords.forEach(business => {
    if (text.includes(business)) {
      businesses.push(business)
    }
  })
  
  return businesses
}

/**
 * Generate context summary for AI prompt
 */
export function generateStateContext(state: ConversationState): string {
  const parts: string[] = []
  
  if (state.currentBusiness) {
    parts.push(`Currently discussing: ${state.currentBusiness.name}`)
  }
  
  if (state.shownBusinesses.length > 0) {
    parts.push(`Already shown: ${state.shownBusinesses.slice(0, 5).join(', ')}`)
  }
  
  if (state.userPreferences.dietaryRestrictions && state.userPreferences.dietaryRestrictions.length > 0) {
    parts.push(`Dietary needs: ${state.userPreferences.dietaryRestrictions.join(', ')}`)
  }
  
  if (state.userPreferences.budget) {
    parts.push(`Budget preference: ${state.userPreferences.budget}`)
  }
  
  if (state.userPreferences.favoriteCategories && state.userPreferences.favoriteCategories.length > 0) {
    parts.push(`Interested in: ${state.userPreferences.favoriteCategories.join(', ')}`)
  }
  
  return parts.length > 0 ? parts.join(' | ') : 'New conversation'
}

