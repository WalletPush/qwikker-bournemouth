/**
 * Deterministic placeholder image + style selection for unclaimed businesses.
 *
 * VISUAL VARIETY STRATEGY — four independent axes:
 *
 *   base image  ×  crop/scale  ×  color filter  ×  tint overlay
 *   6 images    ×  8 combos    ×  6 filters     ×  5 tints  =  1440 per category
 *
 * Each axis is hashed independently from business.id so the same business
 * always renders identically across page loads.
 */

// Real on-disk counts (public/placeholders/<cat>/NN.webp). High-volume food/drink
// categories carry more variants so a busy grid doesn't repeat.
// NOTE: health, tours_activities, grocery are pending generation — omitted here so
// they gracefully fall back (see CATEGORY_FALLBACKS) until their art exists.
const IMAGE_COUNTS: Record<string, number> = {
  restaurant: 16,
  cafe: 14,
  bar: 12,
  pub: 10,
  bakery: 10,
  dessert: 10,
  takeaway: 10,
  fast_food: 10,
  salon: 8,
  barber: 8,
  tattoo: 8,
  wellness: 8,
  entertainment: 8,
  fitness: 8,
  hotel: 8,
  other: 8,
  professional: 8,
  retail: 8,
  sports: 8,
  venue: 8,
  rental: 8,
  automotive: 8,
  default: 1,
}

// Crop + zoom combos — scale(1.2+) ensures crop actually shows different content
const CROP_VARIANTS = [
  'object-center scale-100',                       // 0: neutral
  'object-top scale-110',                          // 1: top zoom
  'object-bottom scale-110',                       // 2: bottom zoom
  'object-left scale-125',                         // 3: left deep crop
  'object-right scale-125',                        // 4: right deep crop
  'object-[30%_20%] scale-[1.15]',                 // 5: upper-left region
  'object-[70%_80%] scale-[1.15]',                 // 6: lower-right region
  'object-center scale-[1.35] -scale-x-100',       // 7: flipped + zoomed (mirror)
] as const

// Color filters — noticeably different brightness/hue on dark images
const COLOR_FILTERS = [
  '',                                                              // 0: as-is
  'brightness-125 saturate-[1.2]',                                 // 1: bright & vivid
  'brightness-[0.8] saturate-[0.7] contrast-110',                  // 2: moody & dark
  'brightness-[1.15] saturate-[0.6] sepia-[0.15]',                 // 3: faded warm
  'brightness-[1.1] hue-rotate-[15deg] saturate-[1.15]',           // 4: warm shift
  'brightness-[1.1] hue-rotate-[-10deg] saturate-[0.85]',          // 5: cool shift
] as const

// Tint overlays — visible color washes over the image
const TINT_OVERLAYS = [
  null,                                                                                   // 0: none
  'bg-gradient-to-t from-amber-900/30 via-amber-900/10 to-transparent',                   // 1: warm amber wash
  'bg-gradient-to-b from-blue-950/25 via-slate-900/10 to-transparent',                     // 2: cool blue top
  'bg-gradient-to-tr from-rose-950/20 via-transparent to-cyan-950/15',                     // 3: duotone rose/cyan
  'bg-gradient-to-bl from-emerald-950/20 via-transparent to-amber-950/15',                  // 4: duotone green/amber
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

// Only needed for categories that don't yet have their own art. Everything else
// now has a real folder, so resolveCategory returns it directly.
const CATEGORY_FALLBACKS: Record<string, string[]> = {
  health: ['wellness', 'salon'],
  tours_activities: ['entertainment', 'venue'],
  grocery: ['retail', 'bakery'],
  default: ['restaurant', 'cafe', 'bar'],
}

export function resolveCategory(systemCategory: string): string {
  if (imageCount(systemCategory) > 0) return systemCategory

  const fallbacks = CATEGORY_FALLBACKS[systemCategory] || []
  for (const fb of fallbacks) {
    if (imageCount(fb) > 0) return fb
  }

  return 'default'
}

export function getPlaceholderUrl(systemCategory: string, businessId: string): string {
  const category = resolveCategory(systemCategory)
  const count = imageCount(category)
  const idx = count <= 1 ? 0 : stableHash(businessId) % count
  return `/placeholders/${category}/${idx.toString().padStart(2, '0')}.webp`
}

/**
 * Full visual variation bundle for a business placeholder.
 * Each axis is hashed with a different salt so they vary independently.
 */
export function getPlaceholderVariation(systemCategory: string, businessId: string): {
  url: string
  imgClass: string
  overlayClass: string | null
} {
  const url = getPlaceholderUrl(systemCategory, businessId)

  const cropIdx = stableHash(businessId + ':crop') % CROP_VARIANTS.length
  const colorIdx = stableHash(businessId + ':color') % COLOR_FILTERS.length
  const tintIdx = stableHash(businessId + ':tint') % TINT_OVERLAYS.length

  const crop = CROP_VARIANTS[cropIdx]
  const color = COLOR_FILTERS[colorIdx]
  const tint = TINT_OVERLAYS[tintIdx]

  const imgClass = ['object-cover w-full h-full', crop, color].filter(Boolean).join(' ')

  return {
    url,
    imgClass,
    overlayClass: tint ?? null,
  }
}

/**
 * Same as getPlaceholderVariation but respects an admin-selected variant override.
 * When variantOverride is provided and not null, the image index is forced to that
 * value instead of being hashed from businessId.
 */
export function getPlaceholderVariationWithOverride(
  systemCategory: string,
  businessId: string,
  variantOverride?: number | null,
): { url: string; imgClass: string; overlayClass: string | null } {
  if (variantOverride == null) {
    return getPlaceholderVariation(systemCategory, businessId)
  }

  const category = resolveCategory(systemCategory)
  const count = imageCount(category)
  const idx = count <= 1 ? 0 : variantOverride % count
  const url = `/placeholders/${category}/${idx.toString().padStart(2, '0')}.webp`

  const cropIdx = stableHash(businessId + ':crop') % CROP_VARIANTS.length
  const colorIdx = stableHash(businessId + ':color') % COLOR_FILTERS.length
  const tintIdx = stableHash(businessId + ':tint') % TINT_OVERLAYS.length

  const crop = CROP_VARIANTS[cropIdx]
  const color = COLOR_FILTERS[colorIdx]
  const tint = TINT_OVERLAYS[tintIdx]

  const imgClass = ['object-cover w-full h-full', crop, color].filter(Boolean).join(' ')

  return { url, imgClass, overlayClass: tint ?? null }
}

export function getImageCountForCategory(systemCategory: string): number {
  return imageCount(resolveCategory(systemCategory))
}

export function getFallbackPlaceholderUrl(): string {
  return '/placeholders/default/00.webp'
}
