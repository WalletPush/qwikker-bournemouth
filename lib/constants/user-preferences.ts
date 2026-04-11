/**
 * Canonical user preference constants — single source of truth.
 * Used by: personalization wizard, settings page, feed boost, AI chat profile.
 */

export const CATEGORY_OPTIONS = [
  'Restaurants', 'Cafes', 'Bars', 'Pubs', 'Takeaway',
  'Fine Dining', 'Brunch', 'Late Night', 'Family Friendly', 'Date Night',
  'Bakeries', 'Nightlife', 'Activities', 'Wellness',
] as const

export const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut Allergy', 'Halal', 'Kosher', 'Pescatarian',
  'Egg Allergy', 'Soy Allergy', 'Shellfish Allergy', 'Sesame Allergy',
] as const

/**
 * Maps user-facing category names to tokens matched against display_category,
 * system_category, and business_type via `normalize()` + `.includes()`.
 */
export const CATEGORY_MAP: Record<string, string[]> = {
  'Restaurants': ['restaurant'],
  'Cafes': ['cafe', 'coffee shop'],
  'Bars': ['bar', 'pub', 'cocktail bar'],
  'Pubs': ['pub', 'bar'],
  'Takeaway': ['takeaway', 'fast food'],
  'Fine Dining': ['restaurant', 'fine dining'],
  'Brunch': ['restaurant', 'cafe'],
  'Late Night': ['bar', 'pub', 'night club', 'cocktail bar'],
  'Family Friendly': ['restaurant', 'cafe'],
  'Date Night': ['restaurant', 'bar', 'wine bar', 'cocktail bar'],
  'Bakeries': ['bakery'],
  'Nightlife': ['bar', 'night club', 'cocktail bar', 'night_club'],
  'Activities': ['entertainment', 'arcade', 'gaming', 'bowling', 'escape', 'trampoline'],
  'Wellness': ['wellness', 'spa', 'sauna', 'plunge'],
}

/** Defensive normalizer — handles undefined, trims, lowercases. */
export const normalize = (s?: string) => (s || '').toLowerCase().trim()

export type CategoryOption = typeof CATEGORY_OPTIONS[number]
export type DietaryOption = typeof DIETARY_OPTIONS[number]
