/**
 * Query facet detection for specialized filtering
 * 
 * Facets are high-signal query types that need category-aware filtering
 * to prevent semantic search false positives (e.g., cafes matching "cocktails")
 */

export interface QueryFacet {
  alcohol: boolean
}

/**
 * Detect if query is explicitly asking for alcohol
 * 
 * IMPORTANT: Keep this list SMALL and high-signal
 * - Include: specific alcohol types (cocktail, wine, beer, spirits)
 * - Exclude: generic words like "drinks" (too broad)
 */
export function detectFacet(message: string): QueryFacet {
  const messageLower = message.toLowerCase()
  
  // Alcohol facet: explicit alcohol-related queries
  const alcoholRegex = /\b(cocktail|cocktails|mocktail|mocktails|wine|beer|lager|ale|cider|spirits|gin|vodka|whisky|whiskey|rum|tequila|prosecco|champagne|shot|shots)\b/i
  const alcohol = alcoholRegex.test(messageLower)
  
  return { alcohol }
}

/**
 * Check if business category can serve alcohol
 * 
 * Includes: bars, pubs, restaurants (restaurants are alcohol-capable to avoid empty results early)
 * Excludes: cafes, bakeries, etc.
 */
export function isAlcoholCapableCategory(categoryRaw: string): boolean {
  const category = (categoryRaw || '').toLowerCase()
  
  // Check for alcohol-capable business types
  const alcoholCapableTypes = [
    'bar',
    'pub',
    'cocktail',
    'speakeasy',
    'wine',
    'taproom',
    'brew',
    'restaurant',
    'bistro',
    'grill',
    'steakhouse',
    'diner',
    'eatery'
  ]
  
  return alcoholCapableTypes.some(type => category.includes(type))
}

/**
 * Check if KB content contains alcohol signals
 * 
 * IMPORTANT: Keep this list SMALL and high-signal
 * Same regex as detectFacet for consistency
 */
export function kbHasAlcoholSignal(kb: string): boolean {
  const kbLower = kb.toLowerCase()
  
  // Same high-signal alcohol keywords
  const alcoholRegex = /\b(cocktail|cocktails|mocktail|mocktails|wine|beer|lager|ale|cider|spirits|gin|vodka|whisky|whiskey|rum|tequila|prosecco|champagne|shot|shots)\b/i
  
  return alcoholRegex.test(kbLower)
}
