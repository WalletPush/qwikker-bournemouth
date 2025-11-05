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
 * Filter offers to only include active (approved and non-expired) ones
 */
export function filterActiveOffers<T extends { status?: string; offer_end_date?: string | null }>(
  offers: T[]
): T[] {
  return offers.filter(offer => {
    // Must be approved
    if (offer.status !== 'approved') return false
    
    // Must not be expired
    if (isOfferExpired(offer.offer_end_date)) return false
    
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
