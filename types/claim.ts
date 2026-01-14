/**
 * Shared types for the business claim flow
 */

export interface ClaimBusiness {
  id: string
  name?: string
  business_name?: string
  address?: string
  business_address?: string
  category?: string
  business_category?: string
  type?: string
  business_type?: string
  phone?: string
  website?: string
  description?: string
  business_description?: string
  hours?: string
  rating?: number
  reviewCount?: number
  review_count?: number
  image?: string
  status?: string
}

export function getDisplayName(business: ClaimBusiness): string {
  return business.name ?? business.business_name ?? ''
}

export function getDisplayAddress(business: ClaimBusiness): string {
  return business.address ?? business.business_address ?? ''
}

export function getDisplayCategory(business: ClaimBusiness): string {
  return business.category ?? business.business_category ?? ''
}

export function getDisplayType(business: ClaimBusiness): string {
  return business.type ?? business.business_type ?? ''
}

export function getDisplayDescription(business: ClaimBusiness): string {
  return business.description ?? business.business_description ?? ''
}

export function getDisplayReviewCount(business: ClaimBusiness): number {
  return business.reviewCount ?? business.review_count ?? 0
}

