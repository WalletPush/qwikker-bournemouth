/**
 * Deterministic placeholder image + style selection for unclaimed businesses.
 *
 * VISUAL VARIETY STRATEGY:
 *   base images  x  crop positions  x  color treatments  =  unique looks
 *   6 (restaurant)  x  5 crops  x  4 colors  =  120 combinations
 *   3 (pub)         x  5 crops  x  4 colors  =   60 combinations
 *
 * All derived deterministically from business.id so the same business
 * always renders identically (no flicker between page loads).
 */

// Actual .webp file counts per category folder in /public/placeholders/
const IMAGE_COUNTS: Record<string, number> = {
  restaurant: 6,
  bar: 6,
  tattoo: 6,
  bakery: 5,
  dessert: 5,
  cafe: 4,
  barber: 4,
  wellness: 4,
  pub: 3,
  salon: 3,
  default: 1,
}

// Crop positions applied via Tailwind object-position
const CROP_POSITIONS = [
  'object-center',
  'object-top',
  'object-bottom',
  'object-left',
  'object-right',
] as const

// Color treatments applied via Tailwind filter utilities
const COLOR_TREATMENTS = [
  '',                                          // 0: neutral
  'brightness-105 saturate-[1.1]',             // 1: warm/vivid
  'brightness-[0.97] saturate-[0.9]',          // 2: cool/muted
  'brightness-110 contrast-[1.05]',            // 3: bright/crisp
] as const

// Overlay tints (semi-transparent gradient overlays)
const OVERLAY_TINTS = [
  null,                                                                                       // 0: none
  'bg-gradient-to-t from-amber-900/15 to-transparent',                                        // 1: warm bottom
  'bg-gradient-to-b from-slate-900/10 to-transparent',                                        // 2: cool top
  'bg-gradient-to-tr from-orange-900/10 via-transparent to-blue-900/10',                       // 3: split tone
] as const

function stableHash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
  }
  return Math.abs(hash)
}

function imageCount(category: string): number {
  return IMAGE_COUNTS[category] ?? 0
}

/**
 * Resolve which category folder to use.
 * Falls back to 'default' if the category has no images.
 */
function resolveCategory(systemCategory: string): string {
  const count = imageCount(systemCategory)
  return count > 0 ? systemCategory : 'default'
}

/**
 * Get the placeholder image URL for a business.
 */
export function getPlaceholderUrl(systemCategory: string, businessId: string): string {
  const category = resolveCategory(systemCategory)
  const count = imageCount(category)
  const idx = count <= 1 ? 0 : stableHash(businessId) % count
  return `/placeholders/${category}/${idx.toString().padStart(2, '0')}.webp`
}

/**
 * Full visual variation bundle for a business placeholder.
 * Returns image URL + all CSS classes + optional overlay.
 */
export function getPlaceholderVariation(systemCategory: string, businessId: string): {
  url: string
  imgClass: string
  overlayClass: string | null
} {
  const url = getPlaceholderUrl(systemCategory, businessId)

  const cropIdx = stableHash(businessId + ':crop') % CROP_POSITIONS.length
  const colorIdx = stableHash(businessId + ':color') % COLOR_TREATMENTS.length
  const tintIdx = stableHash(businessId + ':tint') % OVERLAY_TINTS.length

  const crop = CROP_POSITIONS[cropIdx]
  const color = COLOR_TREATMENTS[colorIdx]
  const tint = OVERLAY_TINTS[tintIdx]

  const imgClass = ['object-cover w-full h-full', crop, color].filter(Boolean).join(' ')

  return {
    url,
    imgClass,
    overlayClass: tint ?? null,
  }
}

/**
 * Get the number of available images for a category.
 */
export function getImageCountForCategory(systemCategory: string): number {
  return imageCount(resolveCategory(systemCategory))
}

export function getFallbackPlaceholderUrl(): string {
  return '/placeholders/default/00.webp'
}
