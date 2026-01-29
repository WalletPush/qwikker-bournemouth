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
  
  // +1 for KB content match (weak signal - can be false positive)
  if (kb) {
    for (const category of intent.categories) {
      if (kb.includes(category.toLowerCase())) {
        score += 1
        reasons.push(`kb:${category}`)
        break
      }
    }
    
    for (const keyword of intent.keywords) {
      if (kb.includes(keyword.toLowerCase())) {
        score += 1
        reasons.push(`kb:${keyword}`)
        break
      }
    }
  }
  
  // Debug logging in dev
  if (process.env.NODE_ENV === 'development' && score > 0) {
    console.log(`📊 Relevance: ${business.business_name} = ${score} (${reasons.join(', ')})`)
  }
  
  return score
}

/**
 * Check if a business is relevant (score >= threshold)
 */
export function isRelevant(business: any, intent: IntentResult, kbContent?: string, threshold: number = 2): boolean {
  return scoreBusinessRelevance(business, intent, kbContent) >= threshold
}
