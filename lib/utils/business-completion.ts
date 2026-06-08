/**
 * Shared business-listing completion logic.
 * Used by the admin "Send Completion Reminder" flow so the email preview
 * and the email that actually sends are computed from a single source of truth.
 *
 * Mirrors the required-field checks used in the admin incomplete-listings card.
 */

export interface BusinessCompletionFields {
  business_name?: string | null
  business_type?: string | null
  business_category?: string | null
  business_address?: string | null
  phone?: string | null
  email?: string | null
  business_tagline?: string | null
  business_description?: string | null
  business_hours?: string | null
  business_hours_structured?: unknown
  logo?: string | null
  business_images?: string[] | null
}

export interface BusinessCompletionResult {
  provided: string[]
  missing: string[]
  completionPercentage: number
}

export function getBusinessCompletion(business: BusinessCompletionFields): BusinessCompletionResult {
  const provided: string[] = []
  const missing: string[] = []

  // Core onboarding info (captured at signup)
  if (business.business_name) provided.push('Business Name')
  if (business.business_type) provided.push('Business Type')
  if (business.business_category) provided.push('Business Category')
  if (business.business_address) provided.push('Business Address')
  if (business.phone) provided.push('Phone Number')
  if (business.email) provided.push('Email')

  // Required-for-approval fields
  if (!business.business_tagline) missing.push('Business Tagline')
  else provided.push('Business Tagline')

  if (!business.business_description) missing.push('Business Description')
  else provided.push('Business Description')

  if ((!business.business_hours || business.business_hours.trim() === '') && !business.business_hours_structured) {
    missing.push('Opening Hours')
  } else {
    provided.push('Opening Hours')
  }

  if (!business.logo) missing.push('Business Logo')
  else provided.push('Business Logo')

  if (!business.business_images || business.business_images.length === 0) missing.push('Business Photos')
  else provided.push('Business Photos')

  const total = provided.length + missing.length
  const completionPercentage = total > 0 ? Math.round((provided.length / total) * 100) : 0

  return { provided, missing, completionPercentage }
}
