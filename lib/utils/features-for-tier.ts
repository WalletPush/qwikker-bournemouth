/**
 * Returns the features JSONB for a given tier.
 * Only Spotlight gets premium features unlocked.
 * All other tiers (starter, featured, free, etc.) get locked features.
 */
export function getFeaturesForTier(tierName: string): Record<string, boolean> {
  if (tierName === 'spotlight') {
    return {
      analytics: true,
      loyalty_cards: true,
      social_wizard: true,
      push_notifications: true,
    }
  }

  return {
    analytics: false,
    loyalty_cards: false,
    social_wizard: false,
    push_notifications: false,
  }
}
