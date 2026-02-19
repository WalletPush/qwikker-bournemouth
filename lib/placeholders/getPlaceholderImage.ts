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

function resolveCategory(systemCategory: string): string {
  const count = imageCount(systemCategory)
  return count > 0 ? systemCategory : 'default'
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

export function getImageCountForCategory(systemCategory: string): number {
  return imageCount(resolveCategory(systemCategory))
}

export function getFallbackPlaceholderUrl(): string {
  return '/placeholders/default/00.webp'
}
