/**
 * Business Label Utilities
 * 
 * Smart labeling for business profiles that uses Google Place types
 * to generate accurate, user-friendly labels like "Nepalese restaurant"
 * instead of generic "Restaurant" or blank strings.
 * 
 * Priority order:
 * 1. Cuisine-specific types from google_types (e.g., 'nepalese_restaurant')
 * 2. google_primary_type (if available)
 * 3. display_category (admin override)
 * 4. system_category (stable enum)
 * 5. 'Local business' (fallback)
 */

interface BusinessProfile {
  business_tagline?: string | null
  business_town?: string | null
  city?: string | null
  google_types?: string[] | null
  google_primary_type?: string | null
  display_category?: string | null
  system_category?: string | null
}

/**
 * Humanize a Google Place type into a readable label
 * Examples:
 * - 'nepalese_restaurant' => 'Nepalese restaurant'
 * - 'coffee_shop' => 'Coffee shop'
 * - 'hair_care' => 'Hair care'
 * - 'NEPALESE_RESTAURANT' => 'Nepalese restaurant'
 */
function humanizeGoogleType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word, index) => {
      // Capitalize first word only (e.g., 'Nepalese restaurant', not 'Nepalese Restaurant')
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}

/**
 * Check if a type is a cuisine-specific restaurant type
 * These are richer than just 'restaurant' and should be prioritized
 */
function isCuisineType(type: string): boolean {
  const cuisinePatterns = [
    '_restaurant',
    '_cuisine',
    '_food',
    '_cafe',
    '_bakery',
    '_deli',
  ]
  
  return cuisinePatterns.some(pattern => type.toLowerCase().includes(pattern))
}

/**
 * Get the best primary label for a business
 * 
 * @returns Human-readable label like 'Nepalese restaurant' or 'Coffee shop'
 */
export function getPrimaryLabel(business: BusinessProfile): string {
  // Priority 1: Cuisine-specific types from google_types
  // Look for types like 'nepalese_restaurant', 'italian_restaurant', etc.
  if (business.google_types && Array.isArray(business.google_types)) {
    const cuisineType = business.google_types.find(isCuisineType)
    if (cuisineType) {
      return humanizeGoogleType(cuisineType)
    }
  }

  // Priority 2: google_primary_type (if it exists and is meaningful)
  if (business.google_primary_type) {
    const humanized = humanizeGoogleType(business.google_primary_type)
    // Don't use generic types like 'point_of_interest' or 'establishment'
    const genericTypes = ['point of interest', 'establishment', 'premise']
    if (!genericTypes.includes(humanized.toLowerCase())) {
      return humanized
    }
  }

  // Priority 3: display_category (admin override)
  if (business.display_category) {
    return business.display_category
  }

  // Priority 4: system_category (stable enum, humanized)
  if (business.system_category) {
    // Capitalize first letter
    return business.system_category.charAt(0).toUpperCase() + 
           business.system_category.slice(1).toLowerCase()
  }

  // Priority 5: Fallback
  return 'Local business'
}

/**
 * Get the hero line for a business (used in cards, detail pages)
 * 
 * Logic:
 * - If business has a tagline, use it
 * - Otherwise, generate: "{Primary Label} in {Town/City}"
 * 
 * @returns Hero line like "Authentic Nepalese cuisine" or "Nepalese restaurant in Bournemouth"
 */
export function getHeroLine(business: BusinessProfile): string {
  // If business has a custom tagline, use it
  if (business.business_tagline && business.business_tagline.trim()) {
    return business.business_tagline.trim()
  }

  // Otherwise, generate descriptive line
  const primaryLabel = getPrimaryLabel(business)
  const location = business.business_town || titleCase(business.city || '')
  
  if (location) {
    return `${primaryLabel} in ${location}`
  }
  
  return primaryLabel
}

/**
 * Convert string to title case
 * Examples: 'bournemouth' => 'Bournemouth', 'new york' => 'New York'
 */
function titleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Get a display-friendly plan label for CRM/admin views
 * Handles the plan vs business_tier confusion
 * 
 * @param plan - Subscription plan (e.g., 'free', 'starter', 'featured')
 * @param isUnclaimed - Whether the business is unclaimed (auto_imported with no owner)
 * @returns Display label like 'Free (Unclaimed)' or 'Featured'
 */
export function getPlanDisplayLabel(
  plan: string | null | undefined,
  isUnclaimed: boolean
): string {
  const planLabel = plan?.charAt(0).toUpperCase() + (plan?.slice(1) || '')
  
  if (isUnclaimed) {
    return `${planLabel || 'Free'} (Unclaimed)`
  }
  
  return planLabel || 'Unknown'
}

/**
 * Check if a business is imported and unclaimed
 * Used to determine if special "unclaimed" UI should be shown
 */
export function isImportedUnclaimed(business: {
  auto_imported?: boolean | null
  owner_user_id?: string | null
}): boolean {
  return business.auto_imported === true && !business.owner_user_id
}
