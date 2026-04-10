/**
 * Canonical user preference constants — single source of truth.
 * Used by: personalization wizard, settings page, feed boost, AI chat profile.
 */

export const CATEGORY_OPTIONS = [
  'Restaurants', 'Cafes', 'Bars', 'Pubs', 'Takeaway',
  'Fine Dining', 'Brunch', 'Late Night', 'Family Friendly', 'Date Night',
] as const

export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut Allergy', 'Halal', 'Kosher', 'Pescatarian',
] as const

/**
 * Maps user-facing category names to DB display_category tokens.
 * DB values are granular ("Italian restaurant", "Wine bar", "Coffee shop").
 * Use with `normalize()` + `.includes()` matching — NOT exact equality.
 */
export const CATEGORY_MAP: Record<string, string[]> = {
  'Restaurants': ['restaurant'],
  'Cafes': ['cafe', 'coffee shop'],
  'Bars': ['bar', 'pub', 'cocktail bar'],
  'Pubs': ['pub', 'bar'],
  'Takeaway': ['takeaway', 'fast food'],
  'Fine Dining': ['restaurant', 'fine dining'],
  'Brunch': ['restaurant', 'cafe'],
  'Late Night': ['bar', 'pub', 'night club'],
  'Family Friendly': ['restaurant', 'cafe'],
  'Date Night': ['restaurant', 'bar', 'wine bar'],
}

/** Defensive normalizer — handles undefined, trims, lowercases. */
export const normalize = (s?: string) => (s || '').toLowerCase().trim()

export type CategoryOption = typeof CATEGORY_OPTIONS[number]
export type DietaryOption = typeof DIETARY_OPTIONS[number]
