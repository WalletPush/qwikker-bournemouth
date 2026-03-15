/**
 * Tier-based resource limits — single source of truth.
 * Pure functions with no server dependencies, safe to import from client components.
 */

export function getMaxOffers(tier: string): number {
  const limits: Record<string, number> = {
    'free': 1,
    'claimed_free': 1,
    'starter': 3,
    'featured': 5,
    'spotlight': 25,
    'pro': 25
  }
  return limits[tier] || 3
}

export function getMaxSecretMenuItems(tier: string): number {
  const limits: Record<string, number> = {
    'free': 0,
    'claimed_free': 0,
    'starter': 5,
    'featured': 10,
    'spotlight': 25,
    'pro': 25
  }
  return limits[tier] || 0
}

export function getMaxEvents(tier: string): number {
  const limits: Record<string, number> = {
    'free': 0,
    'claimed_free': 0,
    'starter': 3,
    'featured': 5,
    'spotlight': 999,
    'pro': 999
  }
  return limits[tier] || 0
}
