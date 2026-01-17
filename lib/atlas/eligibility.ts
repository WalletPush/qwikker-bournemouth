/**
 * Atlas Eligibility Helpers
 * 
 * Single source of truth for AI/Atlas eligibility rules.
 * CORE RULE: Never show free_tier businesses in AI or Atlas.
 */

/**
 * Check if a business tier is eligible for AI/Atlas recommendations
 * 
 * @returns true only for paid/trial tiers that can appear in AI/Atlas
 */
export function isAiEligibleTier(tier: string | null | undefined): boolean {
  if (!tier) return false // Conservative: null/undefined = excluded
  
  const eligibleTiers = ['qwikker_picks', 'featured', 'free_trial', 'recommended']
  return eligibleTiers.includes(tier)
}

/**
 * Check if a business is on the free tier
 * 
 * @returns true if business is free_tier (claimed or unclaimed)
 */
export function isFreeTier(tier: string | null | undefined): boolean {
  return tier === 'free_tier'
}

/**
 * Check if a business has valid coordinates for map placement
 * 
 * @returns true only if both latitude and longitude are valid numbers
 */
export function hasValidCoords(
  latitude: any, 
  longitude: any
): boolean {
  // Check if both exist and are numeric
  const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude)
  const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude)
  
  if (isNaN(lat) || isNaN(lng)) return false
  if (lat === null || lng === null) return false
  if (lat === undefined || lng === undefined) return false
  
  // Sanity check: valid coordinate ranges
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  
  return true
}

/**
 * Check if a business is eligible for Atlas map placement
 * 
 * Requirements:
 * 1. AI-eligible tier (paid/trial)
 * 2. Valid coordinates (latitude/longitude)
 * 
 * @returns true only if business can appear in Atlas
 */
export function isAtlasEligible(business: {
  business_tier?: string | null
  latitude?: any
  longitude?: any
}): boolean {
  return (
    isAiEligibleTier(business.business_tier) &&
    hasValidCoords(business.latitude, business.longitude)
  )
}

/**
 * Get tier priority for sorting (lower number = higher priority)
 * 
 * Used to sort businesses by tier when displaying in AI/Atlas
 */
export function getTierPriority(tier: string | null | undefined): number {
  if (!tier) return 99
  
  const priorities: Record<string, number> = {
    'qwikker_picks': 0,  // Spotlight (premium)
    'featured': 1,        // Featured tier
    'free_trial': 2,      // Featured trial
    'recommended': 3,     // Starter tier
    'free_tier': 99       // Should never appear, but lowest priority if leaked
  }
  
  return priorities[tier] ?? 99
}

/**
 * Check if a business is Google verified (has place ID + coords)
 * 
 * @returns true if business has Google Place ID and valid coordinates
 */
export function isGoogleVerified(business: {
  google_place_id?: string | null
  latitude?: any
  longitude?: any
}): boolean {
  return !!(
    business.google_place_id && 
    hasValidCoords(business.latitude, business.longitude)
  )
}

/**
 * Get a human-readable verification status
 */
export function getVerificationStatus(business: {
  google_place_id?: string | null
  latitude?: any
  longitude?: any
}): 'complete' | 'incomplete' | 'missing_coords' {
  if (!business.google_place_id) {
    return 'incomplete'
  }
  
  if (!hasValidCoords(business.latitude, business.longitude)) {
    return 'missing_coords'
  }
  
  return 'complete'
}
