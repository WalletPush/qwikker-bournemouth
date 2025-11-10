/**
 * Intent Classifier - Determines query complexity and routes to appropriate AI model
 * 
 * SIMPLE (70% - Use GPT-4o-mini):
 * - Basic searches ("show me restaurants")
 * - Simple questions ("what time do they open?")
 * - Listing requests ("current deals")
 * 
 * COMPLEX (30% - Use GPT-4o):
 * - Multi-criteria comparisons ("which has best veggie burger with gluten-free options?")
 * - Context-heavy follow-ups (deep conversations)
 * - Ambiguous queries needing reasoning
 */

export type QueryComplexity = 'simple' | 'complex'

export interface IntentClassification {
  complexity: QueryComplexity
  reason: string
  confidence: number
}

/**
 * Classify query complexity using rule-based heuristics
 * (Fast and free - no AI call needed!)
 */
export function classifyQueryIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): IntentClassification {
  
  const lowerMessage = userMessage.toLowerCase().trim()
  
  // 🎯 SIMPLE QUERIES (Use cheap model)
  const simplePatterns = [
    // Direct searches
    /^(show|find|list|get|where|what|tell me about)\s+(me\s+)?(restaurants?|cafes?|bars?|pubs?|deals?|offers?)/i,
    
    // Opening hours
    /(what time|when|hours|open|close)/i,
    
    // Single-word or very short queries
    /^(restaurants?|cafes?|bars?|deals?|offers?|food|drinks?)$/i,
    
    // List all requests
    /(list all|show all|all the)/i,
    
    // Simple yes/no or acknowledgments
    /^(yeah|yes|yep|sure|ok|okay|nope|no|nah)$/i,
    
    // Qwikker Picks
    /(qwikker picks?|featured|spotlight)/i,
  ]
  
  // 🎯 COMPLEX QUERIES (Use smart model)
  const complexPatterns = [
    // Multi-criteria comparisons
    /(which|compare|best|better|versus|vs\.?|between).+(and|with|or)/i,
    
    // Multiple requirements
    /(with|that has|that have).+(and|plus|also)/i,
    
    // Dietary/preference combinations
    /(veggie|vegan|gluten.?free|dairy.?free|halal|kosher).+(and|with|plus)/i,
    
    // Ambiguous questions needing reasoning
    /(why|how come|explain|recommend|suggest|advice)/i,
    
    // Context-dependent questions with pronouns
    /(they|them|their|it|its)\s+(also|too|as well)/i,
  ]
  
  // Check for simple patterns
  for (const pattern of simplePatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        complexity: 'simple',
        reason: 'Matches simple query pattern',
        confidence: 0.9
      }
    }
  }
  
  // Check for complex patterns
  for (const pattern of complexPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        complexity: 'complex',
        reason: 'Requires reasoning or multi-criteria matching',
        confidence: 0.85
      }
    }
  }
  
  // 🎯 CONVERSATION DEPTH ANALYSIS
  // If conversation is > 3 exchanges deep, likely getting complex
  if (conversationHistory.length > 6) {
    return {
      complexity: 'complex',
      reason: 'Deep conversation requiring context tracking',
      confidence: 0.8
    }
  }
  
  // 🎯 MESSAGE LENGTH HEURISTIC
  const wordCount = lowerMessage.split(/\s+/).length
  
  if (wordCount <= 5) {
    // Short messages are usually simple
    return {
      complexity: 'simple',
      reason: 'Short, direct query',
      confidence: 0.75
    }
  }
  
  if (wordCount > 15) {
    // Long messages often need reasoning
    return {
      complexity: 'complex',
      reason: 'Long query with multiple requirements',
      confidence: 0.7
    }
  }
  
  // 🎯 DEFAULT: Lean towards simple (cheaper)
  return {
    complexity: 'simple',
    reason: 'No complexity indicators detected',
    confidence: 0.6
  }
}

/**
 * Log classification for analytics and optimization
 */
export function logClassification(
  userMessage: string,
  classification: IntentClassification,
  modelUsed: 'gpt-4o-mini' | 'gpt-4o'
): void {
  console.log(`🤖 INTENT CLASSIFICATION:`)
  console.log(`   Query: "${userMessage.substring(0, 80)}..."`)
  console.log(`   Complexity: ${classification.complexity.toUpperCase()}`)
  console.log(`   Reason: ${classification.reason}`)
  console.log(`   Confidence: ${(classification.confidence * 100).toFixed(0)}%`)
  console.log(`   Model: ${modelUsed}`)
}

