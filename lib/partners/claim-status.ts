/** Internal claim statuses. Never expose `rejected` on public partners APIs. */

export const CLAIM_STATUSES = [
  'submitted',
  'email_verified',
  'held',
  'converted',
  'expired',
  'released',
  'rejected',
] as const

export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

/** Legacy DB value still present until migrated rows are rewritten. */
export type LegacyClaimStatus = 'claimed'

export const ACTIVE_CLAIM_STATUSES: ClaimStatus[] = ['submitted', 'email_verified', 'held']

export const PUBLIC_TERRITORY_STATUSES = ['available', 'reserved', 'owned'] as const
export type PublicTerritoryStatus = (typeof PUBLIC_TERRITORY_STATUSES)[number]

const TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  submitted: ['email_verified', 'rejected', 'released'],
  email_verified: ['held', 'rejected', 'released'],
  held: ['converted', 'expired', 'released', 'rejected'],
  converted: [],
  expired: ['released'],
  released: [],
  rejected: ['released'],
}

export function canTransitionClaimStatus(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

/** Map legacy `claimed` rows to `held` for logic. */
export function normalizeClaimStatus(status: string): ClaimStatus | null {
  if (status === 'claimed') return 'held'
  if ((CLAIM_STATUSES as readonly string[]).includes(status)) return status as ClaimStatus
  return null
}

export function isActiveClaimStatus(status: string): boolean {
  const n = normalizeClaimStatus(status)
  return n ? ACTIVE_CLAIM_STATUSES.includes(n) : false
}

export function isPublicReservedHold(status: string, expiresAt: string | null | undefined): boolean {
  const n = normalizeClaimStatus(status)
  if (n !== 'held' || !expiresAt) return false
  return new Date(expiresAt).getTime() > Date.now()
}
