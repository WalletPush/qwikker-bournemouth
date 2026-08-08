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

const MENU_QUERY_STOPWORDS = new Set([
  'anywhere', 'with', 'have', 'find', 'show', 'near', 'me', 'the', 'and', 'for',
  'any', 'some', 'please', 'looking', 'want', 'get', 'where', 'can', 'you',
  'is', 'are', 'do', 'does', 'that', 'this', 'place', 'places', 'spot', 'spots',
  'serving', 'serve', 'food', 'something', 'good', 'best', 'like', 'about',
  'from', 'here', 'there', 'they', 'them', 'know', 'tell', 'recommend',
  'suggestion', 'suggestions', 'around', 'nearby', 'local', 'today', 'tonight',
  // Conversational lead-ins — without these, "what about the best burgers"
  // becomes a multi-word query and skips cuisine/dish matching.
  'what', 'which', 'who', 'how', 'why', 'when',
])

/** Simple plural stem so "burgers" matches menu item "Mel's Burger". */
function stemMenuToken(word: string): string {
  if (word.length >= 5 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length >= 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/**
 * Score enriched featured items (menu_preview) against the user query.
 * Critical for Acquisition: dish names must be findable from day 1.
 */
export function scoreMenuPreviewMatch(
  menuPreview: unknown,
  intent: IntentResult,
  queryText?: string
): number {
  if (!Array.isArray(menuPreview) || menuPreview.length === 0) return 0

  const query = (queryText || '').toLowerCase().trim()
  const terms = new Set<string>()

  for (const term of [...intent.keywords, ...intent.cuisineTerms, ...intent.categories]) {
    const t = String(term || '').toLowerCase().trim()
    if (t.length >= 3) terms.add(t)
  }

  const words = query
    .split(/[^a-z0-9]+/g)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !MENU_QUERY_STOPWORDS.has(w))

  for (const word of words) {
    terms.add(word)
    const stem = stemMenuToken(word)
    if (stem !== word && stem.length >= 3) terms.add(stem)
  }
  for (let i = 0; i < words.length - 1; i++) {
    terms.add(`${words[i]} ${words[i + 1]}`)
  }

  // Strip common lead-ins so "anywhere with beef sambosa" → "beef sambosa"
  const dishPhrase = query
    .replace(/^(anywhere|anyone|any place|any places|looking for|find me|find|show me|got any|do you have|is there|are there)\s+/i, '')
    .replace(/\b(with|serving|that (has|have|serve|serves)|near me|nearby|around here)\b/gi, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (dishPhrase.length >= 4) terms.add(dishPhrase)

  if (terms.size === 0 || words.length === 0) return 0

  // Multi-word dish queries ("shrimp soup", "beef sambosa") must not match
  // every item that only shares a weak single token like "soup".
  const isMultiWordDishQuery = words.length >= 2

  let best = 0
  for (const item of menuPreview) {
    if (!item || typeof item !== 'object') continue
    const name = String((item as any).name || '').toLowerCase().trim()
    const desc = String((item as any).description || '').toLowerCase().trim()
    if (!name && !desc) continue
    const hay = `${name} ${desc}`

    const matchedWords = words.filter(
      (w) => hay.includes(w) || hay.includes(stemMenuToken(w))
    )
    const phraseHit = words.length >= 2 && (
      name.includes(words.join(' ')) ||
      hay.includes(words.join(' ')) ||
      // tolerate plural/spacing drift: "shrimp soup" ≈ "shrimps soup"
      matchedWords.length >= 2
    )

    if (isMultiWordDishQuery) {
      if (phraseHit || matchedWords.length >= 2) {
        best = Math.max(best, 5)
        continue
      }
      // Still score strong cuisine/dish terms (e.g. residual "burgers" + filler)
      for (const term of intent.cuisineTerms) {
        const t = String(term || '').toLowerCase().trim()
        if (t.length < 3) continue
        if (hay.includes(t) || hay.includes(stemMenuToken(t))) {
          best = Math.max(best, 5)
        }
      }
      continue
    }

    for (const term of terms) {
      if (term.length < 3) continue
      if (name === term || name.includes(term)) {
        best = Math.max(best, term.includes(' ') || term.length >= 6 ? 5 : 4)
      } else if (desc.includes(term)) {
        best = Math.max(best, 3)
      }
    }
  }

  return best
}

/**
 * Score a business's relevance to the user's intent
 * 
 * Scoring:
 * - +3 if category/type matches intent cuisine
 * - +2 if business name contains intent keyword
 * - +1 if KB content mentions intent keyword
 * - +3–5 if menu_preview / featured item matches the query (enrichment path)
 * 
 * Max score: 6 (category + name match)
 * Min score: 0 (no match)
 */
export function scoreBusinessRelevance(
  business: any,
  intent: IntentResult,
  kbContent?: string,
  kbSimilarityScore?: number,  // ✅ SEMANTIC SEARCH = EVIDENCE (not fallback!)
  facet?: QueryFacet,  // 🔒 FACET GATE: Apply category filters for specialized queries
  queryText?: string // Raw user message — used to match featured menu items
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
  
  // Check vibe tag matches BEFORE early return — tags are explicit business declarations
  let vibeTagScore = 0
  const vt = business.vibe_tags as { selected?: string[]; custom?: string[] } | null
  if (vt && intent.hasIntent) {
    const allTags = [...(vt.selected || []), ...(vt.custom || [])].map(t => t.toLowerCase())
    for (const keyword of intent.keywords) {
      const kw = keyword.toLowerCase()
      const kwHyphenated = kw.replace(/\s+/g, '-')
      const kwSpaced = kw.replace(/-/g, ' ')
      if (allTags.some(tag => tag === kw || tag === kwHyphenated || tag === kwSpaced || tag.replace(/-/g, ' ') === kw)) {
        vibeTagScore = 4
        break
      }
    }
    if (vibeTagScore === 0) {
      for (const category of intent.categories) {
        const cat = category.toLowerCase()
        const catHyphenated = cat.replace(/\s+/g, '-')
        if (allTags.some(tag => tag === cat || tag === catHyphenated || tag.replace(/-/g, ' ') === cat)) {
          vibeTagScore = 4
          break
        }
      }
    }
  }
  
  // Enriched featured items (menu_preview) — score before early returns so dish
  // queries like "beef sambosa" work even when intent detection finds nothing.
  const menuScore = scoreMenuPreviewMatch(business.menu_preview, intent, queryText)

  // For non-priority, non-cuisine queries with a semantic score AND no tag match, return semantic directly.
  // IMPORTANT: When categories are present (cuisine queries like "Italian", "Greek"), always run
  // keyword scoring — the +3 category match properly identifies restaurants of that cuisine.
  const hasCuisineCategories = intent.categories.length > 0
  if (semanticScore > 0 && !hasPriorityIntent && !hasCuisineCategories && vibeTagScore === 0) {
    const early = Math.max(semanticScore, menuScore, vibeTagScore)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Relevance: ${business.business_name} = ${early} (semantic:${kbSimilarityScore?.toFixed(2)}${menuScore ? `, menu:${menuScore}` : ''})`)
    }
    return early
  }
  
  // No semantic match and no intent -- still allow menu_preview dish matches
  if (!intent.hasIntent) {
    if (process.env.NODE_ENV === 'development' && menuScore > 0) {
      console.log(`📊 Relevance: ${business.business_name} = ${menuScore} (menu_preview match)`)
    }
    return Math.max(semanticScore, menuScore)
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
    restaurant: [
      'restaurant', 'meal_takeaway', 'meal_delivery', 'fine_dining_restaurant',
      'fast_food_restaurant', 'seafood_restaurant', 'steak_house', 'pizza_restaurant',
      'sushi_restaurant', 'indian_restaurant', 'chinese_restaurant', 'italian_restaurant',
      'mexican_restaurant', 'thai_restaurant', 'japanese_restaurant', 'vegan_restaurant',
      'vegetarian_restaurant', 'hamburger_restaurant', 'barbecue_restaurant',
    ],
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
      (systemCategory === 'pub' && cat === 'bar') ||
      (cat === 'restaurant' && ['restaurant', 'fast_food', 'takeaway'].includes(systemCategory)) ||
      googlePrimaryType.includes(cat) ||
      expandedTypes.some(t => googlePrimaryType === t || systemCategory === t)
    ) {
      score += 3
      reasons.push(`category:${category}`)
      break // Only count once
    }
  }
  
  // Also check cuisine synonym terms against categories (e.g., "gyros" in category, "pizza" in category)
  if (score === 0) {
    const categoryTermsToCheck = [...intent.keywords, ...(intent.cuisineTerms || [])]
    for (const term of categoryTermsToCheck) {
      const kw = term.toLowerCase()
      
      if (
        displayCategory.includes(kw) ||
        systemCategory.includes(kw) ||
        googlePrimaryType.includes(kw)
      ) {
        score += 3
        reasons.push(`category:${term}`)
        break
      }
    }
  }
  
  // +2 for business name matching a category (e.g. "Italian" in "Italian Kitchen")
  for (const category of intent.categories) {
    if (businessName.includes(category.toLowerCase())) {
      score += 2
      reasons.push(`name:${category}`)
      break
    }
  }

  // +2 for business name matching a keyword or cuisine synonym (e.g. "gyros" in "Triangle Gyros")
  // This is a SEPARATE loop — a business matching both category AND keyword gets +4
  // Deduplicate: skip terms already checked in the category loop above
  const categorySet = new Set(intent.categories.map(c => c.toLowerCase()))
  const nameKeywords = [...intent.keywords, ...(intent.cuisineTerms || [])].filter(t => !categorySet.has(t.toLowerCase()))
  for (const term of nameKeywords) {
    if (businessName.includes(term.toLowerCase())) {
      score += 2
      reasons.push(`name:${term}`)
      break
    }
  }
  
  // Add vibe tag score to keyword score
  if (vibeTagScore > 0) {
    score += vibeTagScore
    reasons.push(`tag:match`)
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
  // menu_preview dish matches are also first-class evidence.
  if (menuScore > 0) reasons.push(`menu:${menuScore}`)
  const finalScore = Math.max(score, semanticScore, menuScore)
  
  if (process.env.NODE_ENV === 'development' && (intent.hasIntent || menuScore > 0)) {
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
