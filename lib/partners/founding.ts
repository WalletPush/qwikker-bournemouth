import { normalizeClaimStatus } from '@/lib/partners/claim-status'

export const FOUNDING_TOTAL = 100

export interface FoundingClaimRow {
  status: string
  expires_at?: string | null
  is_founding_eligible?: boolean | null
  founding_slot_number?: number | null
  city_slug?: string | null
}

/**
 * securedCount: unique founding territories taken —
 * live franchises + active holds.
 * Converted claims are tracked separately; they become "live" once a franchise exists
 * (avoids orphan converted rows inflating the public counter).
 */
export function computeFoundingCounts(
  claims: FoundingClaimRow[],
  liveOwnedSlugs: string[] = []
): {
  securedCount: number
  convertedFoundingCount: number
  liveOwnedCount: number
  foundingOpen: boolean
} {
  const now = Date.now()
  const securedSlugs = new Set<string>()
  let converted = 0

  for (const slug of liveOwnedSlugs) {
    if (slug) securedSlugs.add(slug)
  }

  for (const c of claims) {
    const eligible = c.is_founding_eligible !== false
    if (!eligible) continue

    const status = normalizeClaimStatus(c.status)
    if (!status) continue

    const slug = c.city_slug || `claim-${status}-${converted + securedSlugs.size}`

    if (status === 'converted') {
      converted += 1
      continue
    }

    if (status === 'held') {
      const exp = c.expires_at ? new Date(c.expires_at).getTime() : 0
      if (exp > now) securedSlugs.add(slug)
    }
  }

  const securedCount = Math.min(FOUNDING_TOTAL, securedSlugs.size)

  return {
    securedCount,
    convertedFoundingCount: converted,
    liveOwnedCount: liveOwnedSlugs.filter(Boolean).length,
    foundingOpen: securedCount < FOUNDING_TOTAL,
  }
}
