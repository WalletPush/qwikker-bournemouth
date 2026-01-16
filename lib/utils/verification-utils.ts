/**
 * Check if a business profile satisfies verification requirements
 */
export function verificationSatisfied(profile: any): boolean {
  if (!profile) return false
  
  if (profile.verification_method === 'google') {
    return !!profile.google_place_id
  }
  
  if (profile.verification_method === 'manual') {
    return true // Manual always "satisfied" for submission (admin will gate approval)
  }
  
  return false
}

/**
 * Check if a business can be approved by admin
 */
export function canApprove(profile: any, manualOverrideRequested: boolean = false): { 
  canApprove: boolean
  reason?: string 
} {
  if (!profile) {
    return { canApprove: false, reason: 'Profile not found' }
  }
  
  if (profile.verification_method === 'google') {
    if (!profile.google_place_id) {
      return { canApprove: false, reason: 'Google Place ID missing' }
    }
    
    if (profile.rating < 4.4) {
      return { 
        canApprove: false, 
        reason: `QWIKKER requires 4.4+ Google rating. This business has ${profile.rating}★. Reject or request improvements.` 
      }
    }
    
    return { canApprove: true }
  }
  
  if (profile.verification_method === 'manual') {
    if (!manualOverrideRequested) {
      return { 
        canApprove: false, 
        reason: 'Manual listings require explicit manual override checkbox' 
      }
    }
    
    return { canApprove: true }
  }
  
  return { canApprove: false, reason: 'Invalid verification method' }
}

/**
 * Normalize tagline for uniqueness checking
 */
export function normalizeTagline(tagline: string | null | undefined): string | null {
  if (!tagline || !tagline.trim()) return null
  return tagline.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Normalize town name
 */
export function normalizeTown(town: string | null | undefined): string | null {
  if (!town || !town.trim()) return null
  return town.trim().toLowerCase().replace(/\s+/g, ' ')
}
