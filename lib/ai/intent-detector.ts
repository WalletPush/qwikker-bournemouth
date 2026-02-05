/**
 * Intent Detection for Three-Tier Chat System
 * 
 * Detects:
 * - Browse queries ("show me all restaurants", "more", "next")
 * - Cuisine queries ("greek", "italian", "sushi")
 * - Attribute queries ("vegan", "dog friendly", "outdoor seating")
 */

export interface IntentResult {
  hasIntent: boolean
  categories: string[] // e.g. ["greek", "mediterranean"]
  keywords: string[] // e.g. ["vegan", "gluten-free"]
  confidence: number // 0-1
}

export interface BrowseMode {
  mode: 'browse' | 'browse_more' | 'not_browse'
}

/**
 * Detect if user wants to browse/list all businesses
 * CRITICAL: This should override intent detection
 */
export function detectBrowse(query: string, lastMode?: string): BrowseMode {
  const q = query.toLowerCase().trim()
  
  // Check for pagination first
  const wantsMore = /^(any more|more|next|show more|any others?)\b/i.test(q)
  
  // GUARDRAIL: Only treat "more/next" as browse_more if last mode was browse
  if (wantsMore && lastMode !== 'browse') {
    return { mode: 'not_browse' }
  }
  
  if (wantsMore) {
    return { mode: 'browse_more' }
  }
  
  // Check for "show me all X" / "all restaurants" / "list all" patterns
  const browsePatterns = [
    /\b(show|list|find|see|give me)\s+(me\s+)?(all|every)\b/i,
    /^(all|every)\s+(restaurants?|places?|businesses?|cafes?|bars?)/i,
    /\bwhat'?s\s+(here|available|around|nearby)\b/i,
    // NEW: "show me restaurants" without "all"
    /\b(show|list|find|see)\s+(me\s+)?(restaurants?|places?|businesses?|cafes?|bars?)\b/i,
  ]
  
  const isBrowse = browsePatterns.some(pattern => pattern.test(q))
  
  return { mode: isBrowse ? 'browse' : 'not_browse' }
}

/**
 * Detect specific intent (cuisine, dietary, attributes)
 */
export function detectIntent(query: string): IntentResult {
  const q = query.toLowerCase()
  
  const categories: string[] = []
  const keywords: string[] = []
  
  // Cuisine categories (most common)
  const cuisineMap: Record<string, string[]> = {
    greek: ['greek', 'gyro', 'gyros', 'souvlaki', 'moussaka', 'tzatziki'],
    italian: ['italian', 'pizza', 'pasta', 'risotto', 'carbonara', 'lasagna', 'focaccia'],
    chinese: ['chinese', 'dim sum', 'noodles', 'wonton', 'chow mein'],
    japanese: ['japanese', 'sushi', 'ramen', 'sashimi', 'tempura', 'teriyaki'],
    thai: ['thai', 'pad thai', 'curry', 'tom yum'],
    indian: ['indian', 'curry', 'tandoori', 'biryani', 'naan'],
    mexican: ['mexican', 'tacos', 'burritos', 'enchiladas', 'quesadilla'],
    french: ['french', 'croissant', 'baguette', 'escargot', 'ratatouille'],
    american: ['american', 'burger', 'burgers', 'steak', 'bbq', 'barbecue', 'ribs', 'brisket', 'pulled pork', 'smoked'],
    mediterranean: ['mediterranean', 'mezze', 'falafel', 'hummus', 'kebab'],
    vietnamese: ['vietnamese', 'pho', 'banh mi', 'spring roll'],
    korean: ['korean', 'bibimbap', 'kimchi', 'bulgogi'],
    spanish: ['spanish', 'tapas', 'paella', 'sangria'],
    turkish: ['turkish', 'doner', 'kebab', 'baklava'],
    seafood: ['seafood', 'fish', 'oyster', 'lobster', 'crab', 'shrimp'],
    bakery: ['bakery', 'bakeries', 'bread', 'pastry', 'pastries', 'bake'],
    cafe: ['cafe', 'coffee', 'espresso', 'cappuccino', 'latte'],
  }
  
  // Check cuisines
  for (const [cuisine, terms] of Object.entries(cuisineMap)) {
    if (terms.some(term => q.includes(term))) {
      categories.push(cuisine)
    }
  }
  
  // Dietary/attribute keywords
  const attributeTerms = [
    'vegan', 'vegetarian', 'gluten free', 'gluten-free', 'halal', 'kosher',
    'organic', 'healthy', 'plant based', 'plant-based',
    'dog friendly', 'dog-friendly', 'pet friendly', 'pet-friendly',
    'outdoor seating', 'outdoor', 'patio', 'terrace',
    'romantic', 'date night', 'cozy', 'quiet',
    'family friendly', 'family-friendly', 
    'kids menu', 'kids meal', 'kids meals', 'kids food',
    'children menu', 'children meal', 'children meals', 'childrens menu',
    'brunch', 'breakfast', 'lunch', 'dinner', 'late night'
  ]
  
  for (const term of attributeTerms) {
    if (q.includes(term)) {
      keywords.push(term)
    }
  }
  
  const hasIntent = categories.length > 0 || keywords.length > 0
  
  // Confidence: high if multiple signals, medium if one, low if generic
  let confidence = 0.5
  if (categories.length >= 2 || keywords.length >= 2) {
    confidence = 0.9
  } else if (categories.length === 1 || keywords.length === 1) {
    confidence = 0.7
  }
  
  return {
    hasIntent,
    categories,
    keywords,
    confidence
  }
}
