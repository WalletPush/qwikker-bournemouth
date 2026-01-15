/**
 * Deterministic CSS style variants for placeholder images
 * 
 * Provides visual variety using only Tailwind CSS classes
 * (no runtime JavaScript, no extra image generation needed)
 * 
 * 6 style variants applied deterministically based on business ID
 * Kept minimal and clean - no heavy gradients or effects
 */

export interface PlaceholderClasses {
  /** Classes applied to the <img> element */
  imgClass: string
  /** Classes applied to the wrapper <div> */
  wrapperClass: string
  /** Optional: additional overlay elements needed for the style */
  overlay?: 'vignette-subtle'
}

/**
 * Get Tailwind classes for a specific style variant
 * 
 * @param styleIndex - Style variant (0-5)
 * @returns Object with imgClass and wrapperClass strings
 * 
 * @example
 * const classes = getPlaceholderClasses(2)
 * // => { imgClass: '...', wrapperClass: '...' }
 */
export function getPlaceholderClasses(styleIndex: number): PlaceholderClasses {
  switch (styleIndex) {
    case 0:
      // Style 0: Clean default - just cover
      return {
        imgClass: 'object-cover',
        wrapperClass: 'relative overflow-hidden'
      }

    case 1:
      // Style 1: Tiny zoom for slight variety
      return {
        imgClass: 'object-cover scale-[1.03]',
        wrapperClass: 'relative overflow-hidden'
      }

    case 2:
      // Style 2: Slight contrast boost
      return {
        imgClass: 'object-cover contrast-105',
        wrapperClass: 'relative overflow-hidden'
      }

    case 3:
      // Style 3: Tiny saturation boost
      return {
        imgClass: 'object-cover saturate-105',
        wrapperClass: 'relative overflow-hidden'
      }

    case 4:
      // Style 4: Very subtle vignette
      return {
        imgClass: 'object-cover',
        wrapperClass: 'relative overflow-hidden',
        overlay: 'vignette-subtle'
      }

    case 5:
      // Style 5: Slight zoom + translate for crop variety
      return {
        imgClass: 'object-cover scale-[1.05] translate-x-[-1%] translate-y-[1%]',
        wrapperClass: 'relative overflow-hidden'
      }

    default:
      // Fallback to style 0
      return getPlaceholderClasses(0)
  }
}

/**
 * Get overlay element for styles that need it
 * Returns JSX-ready className strings for overlay divs
 * 
 * @param overlayType - Type of overlay needed
 * @returns className string for overlay div
 */
export function getOverlayClass(overlayType: PlaceholderClasses['overlay']): string | null {
  switch (overlayType) {
    case 'vignette-subtle':
      // Very subtle vignette effect (just slightly darkens edges)
      return 'absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_60%,rgba(0,0,0,0.15)_100%)] pointer-events-none z-10'

    default:
      return null
  }
}

