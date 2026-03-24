/**
 * Relevance Scoring for Three-Tier Chat System
 * 
 * Scores businesses 0-6 based on how well they match the user's intent.
 * This is deterministic, cheap, and doesn't require embeddings/LLM.
 */

import { IntentResult } from './intent-detector'
import { QueryFacet, isAlcoholCapableCategory, kbHasAlcoholSignal } from './facets'

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
  kbContent?: string,
  kbSimilarityScore?: number,  // ✅ SEMANTIC SEARCH = EVIDENCE (not fallback!)
  facet?: QueryFacet  // 🔒 FACET GATE: Apply category filters for specialized queries
): number {
  // 🔒 FACET GATE: Apply category-aware filtering for specialized queries
  // Prevents semantic search false positives (e.g., cafes matching "cocktails")
  if (facet?.alcohol) {
    const category = (
      business.display_category || 
      business.system_category || 
      business.google_primary_type || 
      ''
    ).toLowerCase()
    
    const categoryOk = isAlcoholCapableCategory(category)
    
    // If business has KB content, check both category AND KB for alcohol signals
    if (kbContent && kbContent.length > 0) {
      const kbOk = kbHasAlcoholSignal(kbContent)
      
      if (!kbOk && !categoryOk) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 FACET GATE (alcohol): filtered ${business.business_name} (category=${category}, categoryOk=${categoryOk}, kbOk=${kbOk})`)
        }
        return 0
      }
    } else {
      // No KB content - rely on category only
      if (!categoryOk) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 FACET GATE (alcohol): filtered ${business.business_name} (category=${category}, no KB)`)
        }
        return 0
      }
    }
  }
  
  // Negation gate: if business matches a negated category, exclude it
  if (intent.negatedCategories && intent.negatedCategories.length > 0) {
    const category = (
      business.display_category || 
      business.system_category || 
      business.google_primary_type || 
      ''
    ).toLowerCase()
    const businessName = (business.business_name || '').toLowerCase()
    
    for (const negated of intent.negatedCategories) {
      if (category.includes(negated) || businessName.includes(negated)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 NEGATION: filtered ${business.business_name} (matches negated "${negated}")`)
        }
        return 0
      }
    }
  }
  
  // 🔥 ARCHITECTURAL RULE: EVIDENCE BEATS INTENT. ALWAYS.
  // Exception: priority queries (kids, family, vegan, etc.) benefit from BOTH paths.
  // A business with "Kids Desserts" in its KB should score higher than one that's
  // merely semantically close. So for priority queries we run keyword scoring too
  // and take the MAX of both scores.
  
  // Calculate semantic score (if above threshold)
  let semanticScore = 0
  if (kbSimilarityScore && kbSimilarityScore > 0.65) {
    const normalized = (kbSimilarityScore - 0.65) / 0.35
    semanticScore = Math.round(Math.min(Math.max(1 + (normalized * 4), 1), 5) * 10) / 10
  }
  
  // Check if this is a priority query that benefits from keyword-based KB matching
  const priorityTerms = ['kids', 'children', 'family', 'vegan', 'vegetarian', 'gluten', 'outdoor', 'patio', 'dog', 'pet', 'indoor']
  const hasPriorityIntent = intent.hasIntent && intent.keywords.some(kw => 
    priorityTerms.some(p => kw.toLowerCase().includes(p))
  )
  
  // For non-priority queries with a semantic score, return it directly
  if (semanticScore > 0 && !hasPriorityIntent) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Relevance: ${business.business_name} = ${semanticScore} (semantic:${kbSimilarityScore?.toFixed(2)})`)
    }
    return semanticScore
  }
  
  // No semantic match and no intent -- nothing to score
  if (!intent.hasIntent) {
    return semanticScore // 0 if no semantic match
  }
  
  let score = 0
  const reasons: string[] = []
  
  const businessName = (business.business_name || '').toLowerCase()
  const displayCategory = (business.display_category || '').toLowerCase()
  const systemCategory = (business.system_category || '').toLowerCase()
  const googlePrimaryType = (business.google_primary_type || '').toLowerCase()
  const kb = (kbContent || '').toLowerCase()
  
  // Intent-to-type expansion: map intent categories to their related google_primary_type values
  const intentTypeExpansion: Record<string, string[]> = {
    bar: ['bar', 'pub', 'night_club', 'wine_bar', 'cocktail_bar', 'sports_bar', 'dive_bar', 'lounge', 'gastropub'],
    cafe: ['cafe', 'coffee_shop'],
    bakery: ['bakery'],
    dessert: ['ice_cream_shop', 'dessert_shop'],
  }
  
  // +3 for category match (strongest signal)
  for (const category of intent.categories) {
    const cat = category.toLowerCase()
    const expandedTypes = intentTypeExpansion[cat] || []
    
    if (
      displayCategory.includes(cat) ||
      systemCategory.includes(cat) ||
      systemCategory === 'pub' && cat === 'bar' ||
      googlePrimaryType.includes(cat) ||
      expandedTypes.some(t => googlePrimaryType === t || systemCategory === t)
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
  
  // For priority queries, take the MAX of keyword and semantic scores.
  // This ensures businesses with "kids" in their KB score 4+ even if their
  // semantic similarity was moderate (0.65-0.75).
  const finalScore = Math.max(score, semanticScore)
  
  if (process.env.NODE_ENV === 'development' && intent.hasIntent) {
    if (finalScore > 0) {
      const parts = reasons.length > 0 ? reasons.join(', ') : `semantic:${kbSimilarityScore?.toFixed(2)}`
      console.log(`📊 Relevance: ${business.business_name} = ${finalScore} (${parts}${semanticScore > 0 && score > 0 ? `, max of keyword:${score} / semantic:${semanticScore}` : ''})`)
    } else if (kb && kb.length > 50) {
      console.log(`📊 Relevance: ${business.business_name} = 0 (has KB but no match for "${intent.keywords.join(', ')}")`)
    }
  }
  
  return finalScore
}

/**
 * Check if a business is relevant (score >= threshold)
 */
export function isRelevant(business: any, intent: IntentResult, kbContent?: string, threshold: number = 2, kbSimilarityScore?: number): boolean {
  return scoreBusinessRelevance(business, intent, kbContent, kbSimilarityScore) >= threshold
}
