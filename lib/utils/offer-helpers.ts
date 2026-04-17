/**
 * Utility functions for handling offers
 */

/**
 * Check if an offer is expired
 */
export function isOfferExpired(offerEndDate: string | null | undefined): boolean {
  if (!offerEndDate) return false // No end date means never expires
  
  const endDate = new Date(offerEndDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today
  
  return endDate < today
}

/**
 * Check if an offer hasn't started yet
 */
export function isOfferNotStarted(offerStartDate: string | null | undefined): boolean {
  if (!offerStartDate) return false
  return new Date(offerStartDate) > new Date()
}

/**
 * Filter offers to only include active (approved, started, and non-expired) ones
 */
export function filterActiveOffers<T extends { status?: string; offer_start_date?: string | null; offer_end_date?: string | null }>(
  offers: T[]
): T[] {
  return offers.filter(offer => {
    if (offer.status !== 'approved') return false
    if (isOfferExpired(offer.offer_end_date)) return false
    if (isOfferNotStarted(offer.offer_start_date)) return false
    return true
  })
}

/**
 * Check if an offer is ending soon (within 7 days)
 */
export function isOfferEndingSoon(offerEndDate: string | null | undefined): boolean {
  if (!offerEndDate) return false // No end date means never expires
  
  const endDate = new Date(offerEndDate)
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  
  return endDate <= sevenDaysFromNow && !isOfferExpired(offerEndDate)
}

/**
 * Format offer end date for display
 */
export function formatOfferEndDate(offerEndDate: string | null | undefined): string | null {
  if (!offerEndDate) return null
  
  return new Date(offerEndDate).toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  })
}
