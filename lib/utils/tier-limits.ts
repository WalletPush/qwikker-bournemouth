/**
 * Tier-based resource limits and display features — single source of truth.
 * Pure functions with no server dependencies, safe to import from client components.
 */

/**
 * Marketing feature bullets per tier.
 * Used by business-facing pages (onboarding, claim, dashboard) to show
 * what a trial/plan includes. Must match the pricing card defaults.
 */
export function getTierFeatures(tier: string): string[] {
  const features: Record<string, string[]> = {
    'free': [
      'Listed in Discover directory',
      'Basic AI chat visibility',
      'Up to 5 featured menu items',
      '1 active offer'
    ],
    'claimed_free': [
      'Listed in Discover directory',
      'Basic AI chat visibility',
      'Up to 5 featured menu items',
      '1 active offer'
    ],
    'starter': [
      'Carousel card in AI chat',
      'Full menu/service indexing',
      'AI-powered discovery',
      '3 active offers',
      '5 secret menu items',
      '3 events'
    ],
    'featured': [
      'Higher AI ranking',
      'Featured badge on listing',
      '5 active offers',
      '10 secret menu items',
      '5 events'
    ],
    'spotlight': [
      'Qwikker Pick badge & top AI ranking',
      'Unlimited offers',
      '25 secret menu items',
      'Unlimited events',
      'White-label digital stamp card',
      'Push notifications',
      'Social wizard',
      'Premium analytics'
    ]
  }
  return features[tier] || features['starter']
}

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
