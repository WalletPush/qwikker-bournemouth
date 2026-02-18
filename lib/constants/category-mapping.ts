// Category Mapping for Google Places Import
// Maps our canonical system categories to Google Places API types
// Includes positive allowlists, name keyword filters, and exclusion lists
// CRITICAL: This must stay in sync with system-categories.ts

import { type SystemCategory, SYSTEM_CATEGORY_LABEL } from './system-categories'

export interface CategoryConfig {
  googleTypes: string[]
  displayName: string
  requiredAnyTypes?: string[]
  requiredNameKeywords?: string[]
  excludedTypes?: string[]
}

// Global denylist: if ANY of a place's types[] contains these, reject regardless of category
export const GLOBAL_DENIED_TYPES = [
  'vaporizer_store', 'vape_shop', 'smoke_shop', 'tobacco_shop',
  'liquor_store', 'gas_station', 'atm',
  'car_repair', 'car_wash', 'funeral_home', 'cemetery',
] as const

// Map system_category enum -> Google Places types + validation rules
export const CATEGORY_MAPPING: Record<SystemCategory, CategoryConfig> = {
  restaurant: {
    googleTypes: [
      'restaurant',
      'pizza_restaurant', 'italian_restaurant', 'french_restaurant',
      'spanish_restaurant', 'greek_restaurant', 'turkish_restaurant',
      'chinese_restaurant', 'japanese_restaurant', 'thai_restaurant',
      'indian_restaurant', 'vietnamese_restaurant', 'korean_restaurant',
      'middle_eastern_restaurant', 'lebanese_restaurant', 'mediterranean_restaurant',
      'mexican_restaurant', 'brazilian_restaurant', 'american_restaurant',
      'seafood_restaurant', 'steak_house', 'sushi_restaurant',
      'ramen_restaurant', 'hamburger_restaurant',
      'vegan_restaurant', 'vegetarian_restaurant',
      'brunch_restaurant', 'breakfast_restaurant',
      'fine_dining_restaurant', 'bistro',
    ],
    requiredAnyTypes: [
      'restaurant', 'pizza_restaurant', 'italian_restaurant', 'french_restaurant',
      'spanish_restaurant', 'greek_restaurant', 'turkish_restaurant',
      'chinese_restaurant', 'japanese_restaurant', 'thai_restaurant',
      'indian_restaurant', 'vietnamese_restaurant', 'korean_restaurant',
      'middle_eastern_restaurant', 'lebanese_restaurant', 'mediterranean_restaurant',
      'mexican_restaurant', 'brazilian_restaurant', 'american_restaurant',
      'seafood_restaurant', 'steak_house', 'sushi_restaurant',
      'ramen_restaurant', 'hamburger_restaurant',
      'vegan_restaurant', 'vegetarian_restaurant',
      'brunch_restaurant', 'breakfast_restaurant',
      'fine_dining_restaurant', 'bistro', 'food', 'meal_takeaway',
    ],
    displayName: SYSTEM_CATEGORY_LABEL.restaurant,
  },
  cafe: {
    googleTypes: ['cafe', 'coffee_shop'],
    requiredAnyTypes: ['cafe', 'coffee_shop', 'bakery'],
    excludedTypes: ['gas_station'],
    displayName: SYSTEM_CATEGORY_LABEL.cafe,
  },
  bakery: {
    googleTypes: ['bakery'],
    requiredAnyTypes: ['bakery'],
    displayName: SYSTEM_CATEGORY_LABEL.bakery,
  },
  bar: {
    googleTypes: ['bar', 'night_club', 'wine_bar', 'cocktail_bar', 'sports_bar', 'dive_bar', 'lounge'],
    requiredAnyTypes: ['bar', 'night_club', 'wine_bar', 'cocktail_bar', 'sports_bar', 'dive_bar', 'lounge'],
    displayName: SYSTEM_CATEGORY_LABEL.bar,
  },
  pub: {
    googleTypes: ['pub', 'gastropub'],
    requiredAnyTypes: ['pub', 'gastropub'],
    displayName: SYSTEM_CATEGORY_LABEL.pub,
  },
  dessert: {
    googleTypes: ['ice_cream_shop', 'dessert_shop'],
    requiredAnyTypes: ['ice_cream_shop', 'dessert_shop', 'bakery', 'candy_store'],
    excludedTypes: ['convenience_store'],
    displayName: SYSTEM_CATEGORY_LABEL.dessert,
  },
  takeaway: {
    googleTypes: ['meal_takeaway'],
    requiredAnyTypes: ['meal_takeaway', 'restaurant', 'food'],
    displayName: SYSTEM_CATEGORY_LABEL.takeaway,
  },
  fast_food: {
    googleTypes: ['fast_food_restaurant'],
    requiredAnyTypes: ['fast_food_restaurant', 'restaurant', 'meal_takeaway'],
    displayName: SYSTEM_CATEGORY_LABEL.fast_food,
  },
  salon: {
    googleTypes: ['beauty_salon', 'spa', 'nail_salon'],
    requiredAnyTypes: ['beauty_salon', 'spa', 'nail_salon'],
    displayName: SYSTEM_CATEGORY_LABEL.salon,
  },
  barber: {
    googleTypes: ['hair_care', 'hair_salon', 'barber_shop'],
    requiredAnyTypes: ['hair_care', 'hair_salon', 'barber_shop'],
    displayName: SYSTEM_CATEGORY_LABEL.barber,
  },
  tattoo: {
    googleTypes: ['beauty_salon'],
    requiredAnyTypes: ['beauty_salon'],
    requiredNameKeywords: ['tattoo', 'piercing', 'ink', 'inked', 'body art', 'studio'],
    displayName: SYSTEM_CATEGORY_LABEL.tattoo,
  },
  wellness: {
    googleTypes: ['physiotherapist', 'massage_spa', 'wellness_center', 'acupuncture', 'osteopath', 'chiropractor'],
    requiredAnyTypes: ['physiotherapist', 'massage_spa', 'wellness_center', 'acupuncture', 'osteopath', 'chiropractor', 'spa'],
    displayName: SYSTEM_CATEGORY_LABEL.wellness,
  },
  retail: {
    googleTypes: ['clothing_store', 'shoe_store', 'jewelry_store', 'gift_shop', 'souvenir_store', 'shopping_mall'],
    requiredAnyTypes: ['clothing_store', 'shoe_store', 'jewelry_store', 'gift_shop', 'souvenir_store', 'shopping_mall'],
    displayName: SYSTEM_CATEGORY_LABEL.retail,
  },
  fitness: {
    googleTypes: ['gym', 'fitness_center', 'yoga_studio', 'pilates_studio'],
    requiredAnyTypes: ['gym', 'fitness_center', 'yoga_studio', 'pilates_studio'],
    displayName: SYSTEM_CATEGORY_LABEL.fitness,
  },
  sports: {
    googleTypes: ['sporting_goods_store', 'sports_club', 'sports_complex'],
    requiredAnyTypes: ['sporting_goods_store', 'sports_club', 'sports_complex'],
    displayName: SYSTEM_CATEGORY_LABEL.sports,
  },
  hotel: {
    googleTypes: ['lodging', 'hotel', 'motel', 'bed_and_breakfast'],
    requiredAnyTypes: ['lodging', 'hotel', 'motel', 'bed_and_breakfast'],
    displayName: SYSTEM_CATEGORY_LABEL.hotel,
  },
  venue: {
    googleTypes: ['event_venue', 'banquet_hall', 'wedding_venue', 'conference_center'],
    requiredAnyTypes: ['event_venue', 'banquet_hall', 'wedding_venue', 'conference_center'],
    displayName: SYSTEM_CATEGORY_LABEL.venue,
  },
  entertainment: {
    googleTypes: ['tourist_attraction', 'amusement_park', 'museum', 'art_gallery', 'movie_theater', 'bowling_alley', 'amusement_center'],
    requiredAnyTypes: ['tourist_attraction', 'amusement_park', 'museum', 'art_gallery', 'movie_theater', 'bowling_alley', 'amusement_center'],
    displayName: SYSTEM_CATEGORY_LABEL.entertainment,
  },
  professional: {
    googleTypes: ['lawyer', 'accounting', 'accountant', 'real_estate_agency', 'insurance_agency', 'consultant'],
    requiredAnyTypes: ['lawyer', 'accounting', 'accountant', 'real_estate_agency', 'insurance_agency', 'consultant'],
    displayName: SYSTEM_CATEGORY_LABEL.professional,
  },
  other: {
    googleTypes: [],
    displayName: SYSTEM_CATEGORY_LABEL.other,
  },
} as const

/**
 * Validate a place against the category's allowlist/denylist rules.
 * Returns { valid, matchReason } or { valid: false, rejectReason }.
 *
 * Check order:
 *  1. Global denylist (instant reject)
 *  2. Per-category excludedTypes (instant reject)
 *  3. requiredAnyTypes via primaryType (strongest signal, fast accept)
 *  4. requiredAnyTypes via types[] intersection (fallback)
 *  5. requiredNameKeywords (for tricky categories like tattoo)
 */
export function validatePlaceCategory(
  place: { name: string; types?: string[]; primaryType?: string },
  categoryConfig: CategoryConfig
): { valid: boolean; matchReason?: string; rejectReason?: string } {
  const placeTypes = new Set((place.types || []).map(t => t.toLowerCase()))
  const primaryType = place.primaryType?.toLowerCase()
  const nameLower = place.name.toLowerCase()

  // 1. Global denylist
  for (const denied of GLOBAL_DENIED_TYPES) {
    if (placeTypes.has(denied)) {
      return { valid: false, rejectReason: `denied:${denied}` }
    }
  }

  // 2. Per-category excluded types
  if (categoryConfig.excludedTypes) {
    for (const excluded of categoryConfig.excludedTypes) {
      if (placeTypes.has(excluded.toLowerCase())) {
        return { valid: false, rejectReason: `excluded:${excluded}` }
      }
    }
  }

  // 3 & 4. Required types check
  const required = categoryConfig.requiredAnyTypes
  if (!required || required.length === 0) {
    return { valid: false, rejectReason: 'no requiredAnyTypes defined' }
  }

  const requiredSet = new Set(required.map(t => t.toLowerCase()))
  let typeMatchReason: string | null = null

  // Special case: restaurant category accepts any type ending in _restaurant
  const isRestaurant = required.includes('restaurant')

  if (primaryType && requiredSet.has(primaryType)) {
    typeMatchReason = `primaryType:${primaryType}`
  } else if (isRestaurant && primaryType?.endsWith('_restaurant')) {
    typeMatchReason = `primaryType:${primaryType}`
  } else {
    for (const t of placeTypes) {
      if (requiredSet.has(t)) {
        typeMatchReason = `types:${t}`
        break
      }
      if (isRestaurant && t.endsWith('_restaurant')) {
        typeMatchReason = `types:${t}`
        break
      }
    }
  }

  if (!typeMatchReason) {
    return { valid: false, rejectReason: 'missing:requiredAnyTypes' }
  }

  // 5. Name keyword gate (for tricky categories like tattoo)
  if (categoryConfig.requiredNameKeywords && categoryConfig.requiredNameKeywords.length > 0) {
    const matched = categoryConfig.requiredNameKeywords.find(kw => {
      const kwLower = kw.toLowerCase()
      const idx = nameLower.indexOf(kwLower)
      if (idx === -1) return false
      // Word-boundary check: character before/after must be non-alpha or start/end
      const charBefore = idx > 0 ? nameLower[idx - 1] : ' '
      const charAfter = idx + kwLower.length < nameLower.length ? nameLower[idx + kwLower.length] : ' '
      const isBoundaryBefore = !/[a-z]/.test(charBefore)
      const isBoundaryAfter = !/[a-z]/.test(charAfter)
      return isBoundaryBefore && isBoundaryAfter
    })
    if (!matched) {
      return { valid: false, rejectReason: `missing:requiredNameKeyword` }
    }
    return { valid: true, matchReason: `${typeMatchReason}+name:${matched}` }
  }

  return { valid: true, matchReason: typeMatchReason }
}

// Reverse mapping: Google type -> system_category (for quick lookups)
export const GOOGLE_TYPE_TO_SYSTEM_CATEGORY: Record<string, SystemCategory> = {}
Object.entries(CATEGORY_MAPPING).forEach(([category, config]) => {
  config.googleTypes.forEach(type => {
    GOOGLE_TYPE_TO_SYSTEM_CATEGORY[type] = category as SystemCategory
  })
})
