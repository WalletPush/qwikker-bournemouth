import type { SystemCategory } from '@/lib/constants/system-categories'

/**
 * Deterministic Tagline Generation for Auto-Imported Businesses
 *
 * Goals:
 * - Fill Discover card taglines for unclaimed imports
 * - Never misrepresent businesses
 * - Stay deterministic (same business -> same tagline)
 * - Allow owner override later
 * - Use cuisine-specific, location-based copy for restaurants (factual + safe)
 *
 * Restaurant Pattern:
 * - "Italian dining in Bournemouth" (not generic "Comfort food, done right")
 * - "{Cuisine} cuisine in {City}" (factual, location-based, AI-placeholder tone)
 *
 * NOTE (future): If you add re-import/update flows, never overwrite owner taglines.
 * Only overwrite when (business_tagline IS NULL OR tagline_source='generated').
 */

const BASE_TEMPLATES: Record<SystemCategory, string[]> = {
  // NOTE: Restaurants now use cuisine-specific pattern (see generateTagline function)
  // These fallbacks only apply if displayCategory is not provided
  restaurant: [
    'Local favourites, made fresh',
    'Great food, welcoming atmosphere',
    'Fresh ingredients, bold flavours',
    'Food worth sharing',
    'Comfort food, done right',
  ],
  cafe: [
    'Great coffee, cozy vibes',
    'Fresh brews and sweet treats',
    'Your local coffee stop',
    'Coffee, cake, and a warm welcome',
    'Take a break—grab a brew',
  ],
  bakery: [
    'Fresh bakes, warm welcomes',
    'Daily bakes, made with care',
    'Sweet treats and savoury bites',
    'From our oven to your table',
    'Quality bakes, every day',
  ],
  bar: [
    'Good drinks, great atmosphere',
    'Cocktails and good times',
    'Your local spot for a drink',
    'Relaxed vibes and great pours',
    'Where the night starts',
  ],
  pub: [
    'Pints, food, and good company',
    'A proper local pub',
    'Great ales, hearty food',
    'Your neighbourhood spot',
    'Classic pub, warm welcome',
  ],
  dessert: [
    'Sweet treats, made fresh',
    'Indulgence done right',
    'Desserts worth the trip',
    'Sweet moments, served daily',
    'Treat yourself today',
  ],
  takeaway: [
    'Quick, tasty, and ready to go',
    'Great food, grab and go',
    'Fresh food, fast service',
    'Quality takeaway, done right',
    'Great food, ready when you are',
  ],
  fast_food: [
    'Quick bites, great flavours',
    'Fast, fresh, and tasty',
    'Food on the go',
    'Quick meals, big taste',
    'Speedy service, quality food',
  ],
  salon: [
    'Fresh cuts, friendly service',
    'Style that suits you',
    'Look good, feel confident',
    'Quality care, every visit',
    'Your style, our expertise',
  ],
  barber: [
    'Classic cuts, modern style',
    'Fresh fades and sharp cuts',
    'Look sharp, feel confident',
    'Gents cuts done right',
    'Walk-ins welcome',
  ],
  tattoo: [
    'Bold ink, clean studio',
    'Great work, friendly artists',
    'Quality tattoos and piercings',
    'Your next piece starts here',
    'Clean lines, great vibes',
  ],
  wellness: [
    'Relax, restore, rejuvenate',
    'Your wellness sanctuary',
    'Self-care done right',
    'Treatments worth booking',
    'Feel better, naturally',
  ],
  retail: [
    'Quality products, expert advice',
    'Find what you need',
    'Your local shopping stop',
    'Great products, friendly service',
    'Shopping made simple',
  ],
  fitness: [
    'Train hard, feel stronger',
    'Your fitness journey starts here',
    'Build strength, build confidence',
    'Get fit, feel great',
    'Where goals become results',
  ],
  sports: [
    'Play hard, have fun',
    'Where sport happens',
    'Get active, stay fit',
    'Great facilities, friendly faces',
    'Your local sports hub',
  ],
  hotel: [
    'Comfortable stays, great service',
    'Your home away from home',
    'Rest easy with us',
    'Quality accommodation',
    'Stay well, sleep better',
  ],
  venue: [
    'Great events, memorable moments',
    'Your event, our space',
    'Book us for your next event',
    'Where celebrations happen',
    'Spaces that work for you',
  ],
  entertainment: [
    'Great times, lasting memories',
    'Fun for all ages',
    'Where excitement lives',
    'Create memories worth sharing',
    'Your next adventure awaits',
  ],
  professional: [
    'Professional service, personal touch',
    'Experts you can trust',
    'Quality service, every time',
    'Your reliable local provider',
    'Service excellence, guaranteed',
  ],
  other: [
    'Serving the local community',
    'Quality service, trusted locally',
    'Your neighbourhood choice',
    'Local expertise, personal care',
    'Here to help, here to serve',
  ],
}

const SPECIALTY_BY_CATEGORY: Partial<
  Record<SystemCategory, Array<{ keywords: string[]; tagline: string }>>
> = {
  restaurant: [
    { keywords: ['thai'], tagline: 'Thai flavours, made fresh' },
    { keywords: ['sushi', 'japanese', 'ramen'], tagline: 'Japanese favourites, served fresh' },
    { keywords: ['italian', 'pizza', 'pasta'], tagline: 'Italian favourites, made fresh' },
    { keywords: ['indian', 'curry'], tagline: 'Bold spices, comforting classics' },
    { keywords: ['chinese', 'wok', 'noodle'], tagline: 'Classic dishes, cooked to order' },
    { keywords: ['mexican', 'taco', 'burrito'], tagline: 'Big flavours, good vibes' },
    { keywords: ['vegan', 'plant-based'], tagline: 'Plant-based goodness, done right' },
  ],
  cafe: [
    { keywords: ['bakery', 'patisserie'], tagline: 'Fresh bakes, warm welcomes' },
    { keywords: ['espresso', 'coffee'], tagline: 'Great coffee, served fresh' },
  ],
  bar: [
    { keywords: ['cocktail', 'mixology'], tagline: 'Cocktails and late-night vibes' },
    { keywords: ['brewery', 'brew', 'craft beer'], tagline: 'Local pours and great atmosphere' },
  ],
  barber: [
    { keywords: ['barber', 'gents'], tagline: 'Classic cuts, modern style' },
  ],
  tattoo: [
    { keywords: ['tattoo', 'piercing', 'ink'], tagline: 'Great work, clean studio' },
  ],
}

function hashString(input: string): number {
  // Simple deterministic hash (fast + stable)
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function detectSpecialty(businessName: string, systemCategory: SystemCategory): string | null {
  const name = (businessName || '').toLowerCase()
  const rules = SPECIALTY_BY_CATEGORY[systemCategory]
  if (!rules) return null

  for (const rule of rules) {
    if (rule.keywords.some((k) => name.includes(k))) return rule.tagline
  }
  return null
}

export function generateTagline(
  stableId: string,
  businessName: string,
  systemCategory: SystemCategory,
  city?: string,
  displayCategory?: string // NEW: Cuisine-specific label (e.g., "Italian Restaurant")
): string {
  // ✅ RESTAURANT-SPECIFIC LOGIC: Use cuisine + location pattern
  // This is factual, safe, and much better than generic "comfort food" copy
  if (systemCategory === 'restaurant' && displayCategory && city) {
    // Normalize city name for proper casing
    const cityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()
    
    // Pattern: "{Cuisine} dining in {City}"
    // Examples:
    // - "Italian dining in Bournemouth"
    // - "Chinese restaurant in Calgary"  
    // - "Indian cuisine in London"
    
    // Extract cuisine from display_category (e.g., "Italian Restaurant" -> "Italian")
    const cuisineMatch = displayCategory.match(/^(.+?)\s+(restaurant|dining|cuisine)/i)
    const cuisine = cuisineMatch ? cuisineMatch[1] : displayCategory
    
    // Deterministic variant selection (3 options per cuisine)
    const hash = hashString(`${stableId}|${cuisine}|${city}`)
    const variants = [
      `${cuisine} dining in ${cityName}`,
      `${cuisine} cuisine in ${cityName}`,
      `${displayCategory} in ${cityName}`,
    ]
    
    return variants[hash % variants.length]
  }
  
  // 1) category-aware specialty (only if it matches the category)
  const specialty = detectSpecialty(businessName, systemCategory)
  if (specialty) return specialty

  // 2) deterministic pick from base templates
  const templates = BASE_TEMPLATES[systemCategory] || ['Local favourite, easy to discover']
  const seed = `${stableId}|${systemCategory}|${city || ''}`
  const idx = hashString(seed) % templates.length
  return templates[idx]
}

// Optional helper if you need preview UI
export function getTaglineTemplatesForCategory(systemCategory: SystemCategory): string[] {
  return BASE_TEMPLATES[systemCategory] || []
}
