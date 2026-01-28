/**
 * Safe Social Proof Generation for AI Chat
 * 
 * CRITICAL RULE: Only use Google rating + review count as NUMERICAL data.
 * NEVER derive themes or insights from Google review TEXT.
 * 
 * Safe theme sources:
 * - business_highlights (owner-provided)
 * - menu_derived_themes (from actual menu data)
 * - Future: Qwikker-native reviews
 */

export interface Business {
  rating?: number | null
  reviewCount?: number | null
  review_count?: number | null
  business_highlights?: string[] | null
  menu_derived_themes?: string[] | null
}

/**
 * Build safe social proof context from rating/count ONLY (math-based)
 * 
 * Returns social proof text that's compliant with Google Places ToS.
 * Never uses review text content - only numerical thresholds.
 */
export function buildSocialProofContext(business: Business): string {
  const rating = business.rating ?? null
  const reviewCount = business.reviewCount ?? business.review_count ?? 0

  let socialProof = ''

  // ✅ SAFE: Math-based social proof from rating thresholds
  if (rating && rating >= 4.5) {
    if (reviewCount > 200) {
      socialProof = 'Highly rated and very popular'
    } else if (reviewCount > 100) {
      socialProof = 'Highly rated with strong review volume'
    } else if (reviewCount > 50) {
      socialProof = 'Highly rated'
    }
  } else if (rating && rating >= 4.0) {
    if (reviewCount > 100) {
      socialProof = 'Solid ratings with good review volume'
    } else {
      socialProof = 'Solid ratings'
    }
  }

  // ✅ SAFE: Only add themes from non-Google sources
  const safeThemes = business.business_highlights ?? business.menu_derived_themes ?? []
  
  if (safeThemes.length > 0) {
    const themeList = safeThemes.slice(0, 3).join(', ')
    socialProof += socialProof ? `. Highlights: ${themeList}` : `Highlights: ${themeList}`
  }

  return socialProof
}

/**
 * Get rating display with social proof label
 * 
 * Examples:
 * - "⭐ 4.8 (124 reviews) - Highly rated"
 * - "⭐ 4.2 (45 reviews)"
 */
export function getRatingDisplay(business: Business): string {
  const rating = business.rating ?? null
  const reviewCount = business.reviewCount ?? business.review_count ?? 0

  if (!rating) return ''

  let display = `⭐ ${rating.toFixed(1)}`
  
  if (reviewCount > 0) {
    display += ` (${reviewCount} reviews)`
  }

  // Add social proof label based on thresholds
  if (rating >= 4.5 && reviewCount > 100) {
    display += ' - Highly rated'
  } else if (rating >= 4.5 && reviewCount > 50) {
    display += ' - Well-reviewed'
  } else if (rating >= 4.7 && reviewCount > 200) {
    display += ' - Very popular'
  }

  return display
}

/**
 * Check if business should show "highly rated" badge
 */
export function isHighlyRated(business: Business): boolean {
  const rating = business.rating ?? null
  const reviewCount = business.reviewCount ?? business.review_count ?? 0
  
  return !!(rating && rating >= 4.5 && reviewCount >= 50)
}

/**
 * Check if business should show "popular" badge
 */
export function isPopular(business: Business): boolean {
  const reviewCount = business.reviewCount ?? business.review_count ?? 0
  return reviewCount >= 100
}

/**
 * Get comparative rating context (safe - computed from numerical data)
 * 
 * Example: "One of the top-rated Italian restaurants in Bournemouth"
 */
export function getComparativeContext(
  business: Business,
  category: string,
  city: string,
  allBusinesses: Business[]
): string | null {
  const rating = business.rating ?? null
  if (!rating) return null

  // Calculate percentile within category
  const categoryBusinesses = allBusinesses.filter(b => 
    // This would filter by actual category in real implementation
    (b.rating ?? 0) > 0
  )

  const rankedBusinesses = categoryBusinesses
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  
  const rank = rankedBusinesses.findIndex(b => b === business)
  const percentile = rank / rankedBusinesses.length

  if (percentile <= 0.1) {
    return `One of the top-rated ${category} in ${city}`
  } else if (percentile <= 0.25) {
    return `Highly-rated among ${category} in ${city}`
  }

  return null
}

/**
 * NEVER use this - example of what NOT to do
 * 
 * @deprecated DO NOT USE - violates Google Places ToS
 */
export function extractThemesFromReviews_UNSAFE(reviews: any[]): string[] {
  throw new Error(
    'UNSAFE: Cannot derive themes from Google review text. ' +
    'Use business_highlights or menu_derived_themes instead.'
  )
}
