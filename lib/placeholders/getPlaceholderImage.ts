/**
 * Deterministic placeholder image selection for unclaimed businesses
 * 
 * ASSET STRUCTURE:
 * - /public/placeholders/<system_category>/00.webp
 * - /public/placeholders/<system_category>/01.webp
 * - /public/placeholders/<system_category>/02.webp
 * - Fallback: /public/placeholders/default/00.webp
 * 
 * SELECTION LOGIC:
 * - 3 images per category (indexed 0, 1, 2)
 * - 6 style variants (indexed 0-5) applied via CSS
 * - Both selections derived deterministically from business.id
 * - Same business ID always gets same image + style combination
 */

/**
 * Simple, fast, deterministic hash function (djb2 variant)
 * Returns consistent positive integer for any input string
 * 
 * @param str - Input string to hash (typically business ID)
 * @returns Positive integer hash value
 */
function stableHash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) + char // hash * 33 + char
  }
  return Math.abs(hash)
}

/**
 * Get deterministic placeholder image URL for a business
 * 
 * @param systemCategory - System category (e.g. 'restaurant', 'cafe')
 * @param businessId - Unique business identifier (UUID)
 * @returns Path to placeholder image (e.g. '/placeholders/restaurant/01.webp')
 * 
 * @example
 * getPlaceholderUrl('restaurant', 'abc-123-def-456')
 * // => '/placeholders/restaurant/01.webp' (deterministic)
 */
export function getPlaceholderUrl(systemCategory: string, businessId: string): string {
  // Categories with placeholder images available
  const validCategories = ['restaurant', 'cafe', 'bar', 'barber', 'bakery', 'dessert']
  
  // If category doesn't have images yet, use default
  const category = validCategories.includes(systemCategory) ? systemCategory : 'default'
  
  // Calculate variant index (0, 1, or 2) - only used if not default
  const variantIndex = category === 'default' ? 0 : stableHash(businessId) % 3
  
  // Pad to 2 digits ("00", "01", "02")
  const variantStr = variantIndex.toString().padStart(2, '0')
  
  const finalUrl = `/placeholders/${category}/${variantStr}.webp`
  
  // DEV-only: Log fallback when category has no placeholder images
  if (process.env.NODE_ENV === 'development' && category === 'default' && systemCategory !== 'default' && systemCategory !== 'other') {
    console.warn(`⚠️ Placeholder fallback: "${systemCategory}" → /placeholders/default/00.webp`)
  }
  
  // Return path to image
  return finalUrl
}

/**
 * Get deterministic style variant index for a business
 * 
 * Uses a different seed (':style' suffix) to ensure style index is independent
 * from image index (otherwise same hash would give correlated results)
 * 
 * @param businessId - Unique business identifier (UUID)
 * @returns Style index (0-5)
 * 
 * @example
 * getPlaceholderStyle('abc-123-def-456')
 * // => 3 (deterministic)
 */
export function getPlaceholderStyle(businessId: string): number {
  // Use different seed to avoid correlation with image selection
  const styleIndex = stableHash(businessId + ':style') % 6
  return styleIndex
}

/**
 * Get fallback placeholder URL (used when category folder doesn't exist)
 * 
 * @returns Path to default placeholder
 */
export function getFallbackPlaceholderUrl(): string {
  return '/placeholders/default/00.webp'
}

