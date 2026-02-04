/**
 * SOCIAL WIZARD v1 — FEATURE FLAGS & TIER GATING
 * 
 * Controls access and limits based on subscription tier
 */

export type SocialWizardTier = 'free' | 'trial' | 'starter' | 'featured' | 'spotlight'

export interface SocialWizardLimits {
  enabled: boolean
  templatesCount: number
  postsPerMonth: number
  campaignPacks: boolean
  secretMenuAllowed: boolean
  aiModel: 'gpt-4o' | 'claude-sonnet-4'
}

/**
 * Check if user can access Social Wizard
 * free, starter → LOCKED
 * trial, featured → LIMITED ACCESS
 * spotlight → FULL ACCESS
 */
export function canAccessSocialWizard(tierName: string): boolean {
  return ['trial', 'featured', 'spotlight'].includes(tierName.toLowerCase())
}

/**
 * Get tier-specific limits and features
 */
export function getSocialWizardLimits(tierName: string): SocialWizardLimits {
  const tier = tierName.toLowerCase() as SocialWizardTier

  const limits: Record<SocialWizardTier, SocialWizardLimits> = {
    free: {
      enabled: false,
      templatesCount: 0,
      postsPerMonth: 0,
      campaignPacks: false,
      secretMenuAllowed: false,
      aiModel: 'gpt-4o'
    },
    starter: {
      enabled: false,
      templatesCount: 0,
      postsPerMonth: 0,
      campaignPacks: false,
      secretMenuAllowed: false,
      aiModel: 'gpt-4o'
    },
    trial: {
      enabled: true,
      templatesCount: 10,
      postsPerMonth: 30,
      campaignPacks: false,
      secretMenuAllowed: false, // Trial = Featured plan trial
      aiModel: 'gpt-4o'
    },
    featured: {
      enabled: true,
      templatesCount: 10,
      postsPerMonth: 30,
      campaignPacks: false,
      secretMenuAllowed: false, // No secret menu for Featured
      aiModel: 'gpt-4o' // OpenAI
    },
    spotlight: {
      enabled: true,
      templatesCount: Infinity,
      postsPerMonth: Infinity,
      campaignPacks: true, // Can generate 5-post campaign packs
      secretMenuAllowed: true, // Secret menu allowed
      aiModel: process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4' : 'gpt-4o' // Claude if key exists, else OpenAI
    }
  }

  return limits[tier] || limits.free
}

/**
 * Get feature flag key for dashboard integration
 */
export function getSocialWizardFeatureKey(): string {
  return 'social_wizard'
}
