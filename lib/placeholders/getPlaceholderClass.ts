/**
 * CSS-driven visual variation for placeholder images.
 *
 * Combines two independent axes to create distinct looks:
 *   1. Crop position (5 options) — shifts the focal point so the same
 *      image shows different content areas
 *   2. Color temperature (4 options) — warm, cool, bright, or neutral
 *      so adjacent cards feel like different lighting conditions
 *
 * 5 crops x 4 color temps = 20 unique style combos per base image.
 * With 6 base images that's 120 distinct-looking cards from one category.
 */

export interface PlaceholderClasses {
  imgClass: string
  wrapperClass: string
  overlayClass?: string
}

const CROP_POSITIONS = [
  'object-center',
  'object-top',
  'object-bottom',
  'object-[25%_15%]',
  'object-[75%_60%]',
] as const

const COLOR_TEMPS = [
  '',
  'brightness-105 saturate-[1.12]',
  'brightness-[0.97] saturate-[0.92] hue-rotate-[6deg]',
  'brightness-[1.03] hue-rotate-[-4deg]',
] as const

const OVERLAY_TINTS = [
  null,
  null,
  'bg-gradient-to-b from-transparent via-transparent to-amber-950/10',
  'bg-gradient-to-b from-transparent via-transparent to-slate-950/10',
] as const

/**
 * Get Tailwind classes for a style variant index (0–19).
 */
export function getPlaceholderClasses(styleIndex: number): PlaceholderClasses {
  const safeIndex = Math.abs(styleIndex) % (CROP_POSITIONS.length * COLOR_TEMPS.length)
  const cropIdx = safeIndex % CROP_POSITIONS.length
  const colorIdx = Math.floor(safeIndex / CROP_POSITIONS.length) % COLOR_TEMPS.length

  const crop = CROP_POSITIONS[cropIdx]
  const color = COLOR_TEMPS[colorIdx]
  const overlay = OVERLAY_TINTS[colorIdx]

  return {
    imgClass: ['object-cover', crop, color].filter(Boolean).join(' '),
    wrapperClass: 'relative overflow-hidden',
    overlayClass: overlay ?? undefined,
  }
}
