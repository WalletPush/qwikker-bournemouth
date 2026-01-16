import { verificationSatisfied } from './verification-utils'

/**
 * Calculate the number of required action items based on profile completeness
 * This matches the logic in the ActionItemsPage component for REQUIRED fields
 * INCLUDES the "Submit for Review" action when profile is complete but not submitted
 * INCLUDES verification requirement
 */
export function calculateActionItemsCount(profile: any): number {
  if (!profile) return 0

  // 🔒 CRITICAL: claimed_free businesses have NO action items (profile already approved)
  if (profile.status === 'claimed_free') return 0

  let count = 0

  // REQUIRED fields for user dashboard listing
  if (!profile.business_name) count++
  if (!profile.business_hours && !profile.business_hours_structured) count++
  if (!profile.business_description) count++
  if (!profile.business_tagline) count++
  if (!profile.business_address || !profile.business_town) count++
  if (!profile.display_category && !profile.system_category) count++
  if (!profile.logo) count++
  if (!profile.business_images || (Array.isArray(profile.business_images) && profile.business_images.length === 0)) count++
  
  // VERIFICATION requirement (Google mode only)
  if (profile.verification_method === 'google' && !profile.google_place_id) {
    count++
  }

  // 🚀 SPECIAL: If all required fields + verification complete but not yet submitted, count the submission action
  const isProfileComplete = count === 0
  const isReadyToSubmit = isProfileComplete && profile.status === 'incomplete' && verificationSatisfied(profile)
  
  if (isReadyToSubmit) {
    count = 1 // Show (1) for the "Submit for Review" action
  }

  return count
}
