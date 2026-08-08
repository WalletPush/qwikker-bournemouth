/**
 * Client-safe Email Suite template catalogue (no Node/crypto imports).
 * Renderers live in suite-templates.ts.
 *
 * Rule: Templates tab = things franchise ops choose to send.
 * System receipts (welcome, approval, loyalty ready, digest) stay renderable
 * for product events / automations but are hidden from the Suite picker.
 */

export type SuiteTemplateCategory = 'outreach' | 'lifecycle' | 'transactional' | 'marketing' | 'digest'

export type AudiencePreset =
  | 'business_ids'
  | 'live'
  | 'unclaimed_with_email'
  | 'incomplete'
  | 'expired_trial'
  | 'free_tier'

export interface SuiteTemplateDef {
  key: string
  name: string
  category: SuiteTemplateCategory
  description: string
  requiresMarketingUnsub: boolean
  mergeFields: string[]
  /** Show in Templates / Campaigns pickers. False = system-only renderer. */
  visibleInSuite: boolean
  /** Show in Campaigns tab (1:1 / transactional ops stay on Templates). */
  campaignAllowed: boolean
  /** Audiences that make sense for this template in Campaigns. */
  recommendedAudiences: AudiencePreset[]
}

export const SUITE_TEMPLATES: SuiteTemplateDef[] = [
  {
    key: 'claim_invitation',
    name: 'Claim invitation',
    category: 'outreach',
    description: 'First invite (same as Acquisition Engine) — use for 1:1, not campaigns',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name', 'claim_url', 'demo_url'],
    visibleInSuite: true,
    campaignAllowed: false,
    recommendedAudiences: ['unclaimed_with_email'],
  },
  {
    key: 'claim_reminder',
    name: 'Claim reminder',
    category: 'outreach',
    description: 'Follow-up for unclaimed listings — shorter than the first invite (use in Campaigns)',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name', 'claim_url', 'demo_url'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['unclaimed_with_email'],
  },
  {
    key: 'completion_reminder',
    name: 'Completion reminder',
    category: 'lifecycle',
    description: 'Remind an incomplete listing to finish setup',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name', 'missing_items'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['incomplete'],
  },
  {
    key: 'business_welcome',
    name: 'Business welcome',
    category: 'transactional',
    description: 'System: sent on signup — not shown in Suite',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name'],
    visibleInSuite: false,
    campaignAllowed: false,
    recommendedAudiences: ['business_ids'],
  },
  {
    key: 'business_approval',
    name: 'Listing approved',
    category: 'transactional',
    description: 'System: sent on admin approve — not shown in Suite',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name'],
    visibleInSuite: false,
    campaignAllowed: false,
    recommendedAudiences: ['business_ids'],
  },
  {
    key: 'free_trial_nudge',
    name: 'Free → trial nudge',
    category: 'marketing',
    description: 'Encourage free listings to start a trial (re-nudge / campaign)',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['free_tier'],
  },
  {
    key: 'spotlight_benefits',
    name: 'Spotlight benefits',
    category: 'marketing',
    description: 'Pitch Spotlight features and upgrade CTA',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['free_tier', 'expired_trial', 'live'],
  },
  {
    key: 'try_qwikker_loyalty',
    name: 'Try Qwikker loyalty',
    category: 'marketing',
    description: 'Pitch digital stamp cards as part of Spotlight / trial',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['free_tier', 'expired_trial', 'live'],
  },
  {
    key: 'offer_suggestions',
    name: 'New offer suggestions',
    category: 'marketing',
    description: 'Share AI-drafted offer ideas from the Acquisition Engine draft',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name', 'offers'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['live', 'free_tier'],
  },
  {
    key: 'trial_extension',
    name: 'Free trial extension',
    category: 'lifecycle',
    description: 'Notify that their trial has been extended (set days when sending)',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name', 'trial_days'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['expired_trial', 'business_ids'],
  },
  {
    key: 'loyalty_card_ready',
    name: 'Loyalty card ready',
    category: 'lifecycle',
    description: 'System: auto-sent when admin activates a loyalty card',
    requiresMarketingUnsub: false,
    mergeFields: ['business_name', 'loyalty_url'],
    visibleInSuite: false,
    campaignAllowed: false,
    recommendedAudiences: ['business_ids'],
  },
  {
    key: 'weekly_digest',
    name: 'Weekly ROI digest',
    category: 'digest',
    description: 'System: Automations only — not a one-shot template',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name', 'stats'],
    visibleInSuite: false,
    campaignAllowed: false,
    recommendedAudiences: ['live'],
  },
  {
    key: 'custom',
    name: 'Custom message',
    category: 'marketing',
    description: 'Write your own subject and body (still uses the Qwikker email shell)',
    requiresMarketingUnsub: true,
    mergeFields: ['business_name', 'body'],
    visibleInSuite: true,
    campaignAllowed: true,
    recommendedAudiences: ['live', 'unclaimed_with_email', 'incomplete', 'expired_trial', 'free_tier'],
  },
]

/** Templates franchise ops can pick in the Suite UI. */
export function getSuiteManualTemplates(): SuiteTemplateDef[] {
  return SUITE_TEMPLATES.filter((t) => t.visibleInSuite)
}

export const AUDIENCE_LABELS: Record<AudiencePreset, string> = {
  business_ids: 'Selected businesses',
  live: 'Live / approved',
  unclaimed_with_email: 'Unclaimed with email',
  incomplete: 'Incomplete / pending',
  expired_trial: 'Expired trial',
  free_tier: 'Free tier',
}
