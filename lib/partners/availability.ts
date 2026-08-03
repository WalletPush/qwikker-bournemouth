import { isPublicReservedHold } from '@/lib/partners/claim-status'

export type AvailabilityResult = 'owned' | 'reserved' | 'available' | 'waitlist_only'

export interface FranchiseTerritoryRow {
  city: string
  status: string | null
  is_hub?: boolean | null
}

export interface PartnerClaimRow {
  city_slug: string
  status: string
  expires_at: string | null
}

export interface MarketFlags {
  blocked?: boolean
  manual_review_only?: boolean
  is_hub?: boolean
  /** partner_markets.status when a catalogue row exists */
  market_status?: 'owned' | 'reserved' | 'available' | null
}

/**
 * Shared availability precedence for list, claim API, and map.
 *
 * Mental model:
 *   owned     = real franchise territory (Live)
 *   reserved  = Tier 1 FOMO / HQ hub / active claim hold — not claimable, shown amber
 *   available = open to enquire
 */
export function resolveTerritoryAvailability(opts: {
  citySlug: string
  franchises: FranchiseTerritoryRow[]
  holds: PartnerClaimRow[]
  flags?: MarketFlags
}): AvailabilityResult {
  const slug = opts.citySlug.toLowerCase().trim()
  const flags = opts.flags || {}

  if (flags.blocked || flags.manual_review_only) return 'waitlist_only'

  const franchise = opts.franchises.find((f) => f.city.toLowerCase() === slug)
  if (franchise) {
    // Any configured franchise city is not open for a new partner hold
    return 'owned'
  }

  // HQ hubs + Tier 1 / catalogue reserved + catalogue owned (no franchise yet)
  // → Reserved (amber), NOT Live. Search must match map.
  if (
    flags.is_hub ||
    flags.market_status === 'reserved' ||
    flags.market_status === 'owned'
  ) {
    return 'reserved'
  }

  const activeHold = opts.holds.find(
    (h) => h.city_slug.toLowerCase() === slug && isPublicReservedHold(h.status, h.expires_at)
  )
  if (activeHold) return 'reserved'

  return 'available'
}

export function slugifyCityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}
