/**
 * Two-Stage Category Filtering for Google Places Import
 * 
 * Stage 1: Broad Google search (maximizes coverage, keeps API costs predictable)
 * Stage 2: Hard filter before import (ensures quality, prevents category pollution)
 * 
 * Each category has:
 * - Primary type allowlist (Google's official types)
 * - Keyword allowlist (name-based safety net for mis-typed businesses)
 * - Keyword blocklist (explicit exclusions to prevent wrong businesses)
 */

export interface CategoryFilter {
  primaryTypes: string[]
  keywordAllowlist: string[]
  keywordBlocklist: string[]
}

/**
 * Category Filter Rules
 * 
 * These filters are applied AFTER Google search, BEFORE database insert.
 * Only businesses passing these rules get imported.
 */
export const CATEGORY_FILTERS: Record<string, CategoryFilter> = {
  // ========================================
  // TATTOO & PIERCING (High Risk of Pollution)
  // ========================================
  'tattoo-piercing': {
    primaryTypes: [
      'tattoo_shop',
      'tattoo_studio',
      'body_piercing_shop',
      'piercing_shop',
    ],
    keywordAllowlist: [
      'tattoo',
      'piercing',
      'ink',
      'inked',
      'body art',
      'body piercing',
    ],
    keywordBlocklist: [
      'nail',
      'nails',
      'lashes',
      'lash',
      'beauty',
      'aesthetic',
      'cosmetic',
      'brows',
      'eyebrows',
      'hair',
      'salon', // Unless explicitly "tattoo salon"
      'spa',
      'wellness',
      'massage',
    ],
  },

  // ========================================
  // SALON / BARBERSHOP (Moderate Risk)
  // ========================================
  'salon-barbershop': {
    primaryTypes: [
      'hair_salon',
      'hair_care',
      'barber_shop',
      'beauty_salon', // Allow if has hair keywords
    ],
    keywordAllowlist: [
      'hair',
      'barber',
      'barbershop',
      'salon',
      'hairdresser',
      'stylist',
      'cuts',
      'haircut',
    ],
    keywordBlocklist: [
      'nail',
      'nails',
      'tattoo',
      'piercing',
      'lashes',
      'lash',
      'brows',
      'eyebrows',
      'massage',
      'spa', // Unless "hair spa"
      'aesthetic',
    ],
  },

  // ========================================
  // SPA & WELLNESS (Very High Risk)
  // ========================================
  'spa-wellness': {
    primaryTypes: [
      'spa',
      'wellness_center',
      'massage_therapist',
      'day_spa',
    ],
    keywordAllowlist: [
      'spa',
      'wellness',
      'massage',
      'therapy',
      'relaxation',
      'holistic',
      'retreat',
    ],
    keywordBlocklist: [
      'nail',
      'nails',
      'tattoo',
      'piercing',
      'hair',
      'barber',
      'lashes',
      'lash',
      'brows',
      'eyebrows',
      'gym',
      'fitness',
    ],
  },

  // ========================================
  // NAIL SALON (Specific)
  // ========================================
  'nail-salon': {
    primaryTypes: [
      'nail_salon',
      'beauty_salon', // Allow if has nail keywords
    ],
    keywordAllowlist: [
      'nail',
      'nails',
      'manicure',
      'pedicure',
      'mani',
      'pedi',
    ],
    keywordBlocklist: [
      'tattoo',
      'piercing',
      'hair',
      'barber',
      'massage',
      'spa', // Unless "nail spa"
    ],
  },

  // ========================================
  // RESTAURANT (Low Risk, but check anyway)
  // ========================================
  'restaurant': {
    primaryTypes: [
      'restaurant',
      'food',
      'meal_takeaway',
      'meal_delivery',
      // NOTE: Validation also accepts any type ending in '_restaurant'
      // (e.g., 'italian_restaurant', 'chinese_restaurant', etc.)
    ],
    keywordAllowlist: [
      'restaurant',
      'dining',
      'eatery',
      'bistro',
      'grill',
      'kitchen',
      'food',
      'trattoria',
      'pizzeria',
      'steakhouse',
      'brasserie',
      'tavern',
      'diner',
      'gastropub',
    ],
    keywordBlocklist: [
      // Very few false positives for restaurants
      'salon',
      'barber',
      'tattoo',
      'spa',
      'gym',
    ],
  },

  // ========================================
  // CAFE / COFFEE SHOP (Low Risk)
  // ========================================
  'cafe': {
    primaryTypes: [
      'cafe',
      'coffee_shop',
      'bakery', // Can overlap
    ],
    keywordAllowlist: [
      'cafe',
      'coffee',
      'espresso',
      'barista',
      'bakery',
      'patisserie',
    ],
    keywordBlocklist: [
      'salon',
      'barber',
      'tattoo',
      'spa',
      'gym',
    ],
  },

  // ========================================
  // BAR / PUB (Low Risk)
  // ========================================
  'bar-pub': {
    primaryTypes: [
      'bar',
      'night_club',
      'pub',
      'cocktail_bar',
    ],
    keywordAllowlist: [
      'bar',
      'pub',
      'tavern',
      'cocktail',
      'lounge',
      'taproom',
    ],
    keywordBlocklist: [
      'salon',
      'barber',
      'tattoo',
      'spa',
      'gym',
      'restaurant', // Unless explicitly "bar & restaurant"
    ],
  },

  // ========================================
  // GYM / FITNESS (Moderate Risk - overlaps with wellness)
  // ========================================
  'gym-fitness': {
    primaryTypes: [
      'gym',
      'fitness_center',
      'sports_club',
    ],
    keywordAllowlist: [
      'gym',
      'fitness',
      'workout',
      'training',
      'crossfit',
      'yoga', // If gym-focused
      'pilates', // If gym-focused
    ],
    keywordBlocklist: [
      'salon',
      'barber',
      'tattoo',
      'nail',
      'lashes',
      'spa', // Unless "gym & spa"
      'massage',
    ],
  },

  // ========================================
  // ENTERTAINMENT / ATTRACTIONS (Very Broad - High Risk)
  // ========================================
  'entertainment': {
    primaryTypes: [
      'amusement_park',
      'movie_theater',
      'bowling_alley',
      'tourist_attraction',
      'art_gallery',
      'museum',
    ],
    keywordAllowlist: [
      'entertainment',
      'attraction',
      'park',
      'cinema',
      'theater',
      'gallery',
      'museum',
      'bowling',
      'arcade',
    ],
    keywordBlocklist: [
      'salon',
      'barber',
      'tattoo',
      'nail',
      'spa',
      'restaurant', // Unless explicitly entertainment venue
      'cafe',
    ],
  },
}

/**
 * Validate if a Google Place matches the category filter rules
 * 
 * @param place - Google Place Details result
 * @param categoryKey - QWIKKER category key (e.g., 'tattoo-piercing')
 * @returns { valid: boolean, reason?: string }
 */
export function validateCategoryMatch(
  place: {
    name: string
    types?: string[]
    primary_type?: string
  },
  categoryKey: string
): { valid: boolean; reason?: string } {
  const filter = CATEGORY_FILTERS[categoryKey]
  
  if (!filter) {
    // No filter defined = allow (for simple categories)
    return { valid: true }
  }

  const name = place.name.toLowerCase()
  const primaryType = place.primary_type?.toLowerCase()
  const types = place.types?.map(t => t.toLowerCase()) || []

  // Step 1: Check primary type allowlist
  let hasPrimaryType = primaryType && filter.primaryTypes.includes(primaryType)
  
  // SPECIAL CASE: Restaurant category accepts any cuisine-specific restaurant type
  // Google uses types like 'italian_restaurant', 'chinese_restaurant', etc.
  // Instead of listing all possible cuisines, accept any type ending in '_restaurant'
  if (!hasPrimaryType && categoryKey === 'restaurant' && primaryType) {
    hasPrimaryType = primaryType.endsWith('_restaurant') || primaryType === 'restaurant'
  }
  
  // Step 2: Check keyword allowlist (name-based safety net)
  const hasTattooKeyword = filter.keywordAllowlist.some(keyword => 
    name.includes(keyword.toLowerCase())
  )

  // Step 3: Check keyword blocklist (explicit exclusions)
  const hasBlockedKeyword = filter.keywordBlocklist.some(keyword => 
    name.includes(keyword.toLowerCase())
  )

  // Decision Logic:
  // ✅ Allow if: has primary type OR has allowed keyword
  // ❌ Block if: has blocked keyword AND no allowed signals
  
  if (hasPrimaryType || hasTattooKeyword) {
    // Clearly matches category
    if (hasBlockedKeyword) {
      // But also has conflicting signals - be cautious
      // Only allow if primary type is strong match
      if (hasPrimaryType) {
        return { valid: true }
      } else {
        return { 
          valid: false, 
          reason: `Name contains blocked keyword and no strong primary type match` 
        }
      }
    }
    return { valid: true }
  }

  if (hasBlockedKeyword) {
    return { 
      valid: false, 
      reason: `Name contains blocked keyword: "${name}"` 
    }
  }

  // No strong signals either way - reject for safety
  return { 
    valid: false, 
    reason: `No primary type match and no keyword match` 
  }
}

/**
 * Get filter statistics for a category (for preview UI)
 */
export function getCategoryFilterInfo(categoryKey: string) {
  const filter = CATEGORY_FILTERS[categoryKey]
  
  if (!filter) {
    return {
      hasFilter: false,
      primaryTypeCount: 0,
      allowedKeywordCount: 0,
      blockedKeywordCount: 0,
    }
  }

  return {
    hasFilter: true,
    primaryTypeCount: filter.primaryTypes.length,
    allowedKeywordCount: filter.keywordAllowlist.length,
    blockedKeywordCount: filter.keywordBlocklist.length,
    primaryTypes: filter.primaryTypes,
    allowedKeywords: filter.keywordAllowlist,
    blockedKeywords: filter.keywordBlocklist,
  }
}

