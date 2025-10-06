/**
 * Calculate the number of required action items based on profile completeness
 * This matches the logic in the ActionItemsPage component for REQUIRED fields
 */
export function calculateActionItemsCount(profile: any): number {
  if (!profile) return 0

  let count = 0

  // REQUIRED fields for user dashboard listing
  if (!profile.business_name) count++
  if (!profile.business_hours && !profile.business_hours_structured) count++ // Check both old and new hours format
  if (!profile.business_description) count++
  if (!profile.business_tagline) count++
  if (!profile.business_address || !profile.business_town) count++
  if (!profile.business_category) count++
  if (!profile.logo) count++
  if (!profile.business_images || (Array.isArray(profile.business_images) && profile.business_images.length === 0)) count++
  // Note: menu_url and menu_preview are now OPTIONAL for universal business types

  return count
}
