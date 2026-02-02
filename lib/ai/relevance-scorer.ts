/**
 * Relevance Scoring for Three-Tier Chat System
 * 
 * Scores businesses 0-6 based on how well they match the user's intent.
 * This is deterministic, cheap, and doesn't require embeddings/LLM.
 */

import { IntentResult } from './intent-detector'

export interface ScoredBusiness {
  relevanceScore: number
  matchReasons: string[] // For debugging
}

/**
 * Score a business's relevance to the user's intent
 * 
 * Scoring:
 * - +3 if category/type matches intent cuisine
 * - +2 if business name contains intent keyword
 * - +1 if KB content mentions intent keyword
 * 
 * Max score: 6 (category + name match)
 * Min score: 0 (no match)
 */
export function scoreBusinessRelevance(
  business: any,
  intent: IntentResult,
  kbContent?: string
): number {
  if (!intent.hasIntent) {
    return 0 // No intent = no scoring
  }
  
  let score = 0
  const reasons: string[] = []
  
  const businessName = (business.business_name || '').toLowerCase()
  const displayCategory = (business.display_category || '').toLowerCase()
  const systemCategory = (business.system_category || '').toLowerCase()
  const googlePrimaryType = (business.google_primary_type || '').toLowerCase()
  const kb = (kbContent || '').toLowerCase()
  
  // +3 for category match (strongest signal)
  // Check both the mapped category AND the original keywords
  for (const category of intent.categories) {
    const cat = category.toLowerCase()
    
    if (
      displayCategory.includes(cat) ||
      systemCategory.includes(cat) ||
      googlePrimaryType.includes(cat)
    ) {
      score += 3
      reasons.push(`category:${category}`)
      break // Only count once
    }
  }
  
  // Also check if category contains any of the ORIGINAL keywords (e.g., "pizza")
  // This ensures "Pizza restaurant" matches when user asks for "pizza"
  if (score === 0) { // Only if we didn't already get a category match
    for (const keyword of intent.keywords) {
      const kw = keyword.toLowerCase()
      
      if (
        displayCategory.includes(kw) ||
        systemCategory.includes(kw) ||
        googlePrimaryType.includes(kw)
      ) {
        score += 3
        reasons.push(`category:${keyword}`)
        break // Only count once
      }
    }
  }
  
  // +2 for business name match (strong signal)
  for (const category of intent.categories) {
    if (businessName.includes(category.toLowerCase())) {
      score += 2
      reasons.push(`name:${category}`)
      break
    }
  }
  
  for (const keyword of intent.keywords) {
    if (businessName.includes(keyword.toLowerCase())) {
      score += 2
      reasons.push(`name:${keyword}`)
      break
    }
  }
  
  // KB content match - CRITICAL for queries where info lives in KB not in category/name
  // Examples: "kids menu", "vegan options", "outdoor seating", "gluten free"
  // For these queries, KB is the STRONGEST signal (+4), not the weakest
  const kbPriorityKeywords = ['kids', 'children', 'family', 'vegan', 'vegetarian', 'gluten', 'outdoor', 'patio', 'dog', 'pet']
  const isKbPriorityQuery = intent.keywords.some(kw => 
    kbPriorityKeywords.some(priority => kw.toLowerCase().includes(priority))
  )
  
  if (kb) {
    for (const category of intent.categories) {
      if (kb.includes(category.toLowerCase())) {
        const points = isKbPriorityQuery ? 4 : 1
        score += points
        reasons.push(`kb:${category}${isKbPriorityQuery ? '(priority)' : ''}`)
        break
      }
    }
    
    for (const keyword of intent.keywords) {
      const keywordLower = keyword.toLowerCase()
      // Check exact match first
      if (kb.includes(keywordLower)) {
        const points = isKbPriorityQuery ? 4 : 1
        score += points
        reasons.push(`kb:${keyword}${isKbPriorityQuery ? '(priority)' : ''}`)
        break
      }
      // For multi-word keywords, also check if ANY word matches (e.g., "kids menu" → check for "kids")
      if (keywordLower.includes(' ')) {
        const words = keywordLower.split(' ')
        for (const word of words) {
          if (word.length >= 4 && kb.includes(word)) {
            const points = isKbPriorityQuery ? 4 : 1
            score += points
            reasons.push(`kb:${word}(from "${keyword}")${isKbPriorityQuery ? '(priority)' : ''}`)
            break
          }
        }
        if (score > 0) break // Already scored, no need to check more keywords
      }
    }
  }
  
  // Debug logging in dev
  if (process.env.NODE_ENV === 'development' && intent.hasIntent) {
    if (score > 0) {
      console.log(`📊 Relevance: ${business.business_name} = ${score} (${reasons.join(', ')})`)
    } else if (kb && kb.length > 50) {
      // Business has KB content but scored 0 - debug why
      console.log(`📊 Relevance: ${business.business_name} = 0 (has KB but no match for "${intent.keywords.join(', ')}")`)
    }
  }
  
  return score
}

/**
 * Check if a business is relevant (score >= threshold)
 */
export function isRelevant(business: any, intent: IntentResult, kbContent?: string, threshold: number = 2): boolean {
  return scoreBusinessRelevance(business, intent, kbContent) >= threshold
}
