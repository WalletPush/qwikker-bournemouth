/**
 * Acquisition Engine v2 — explainable confidence scoring.
 *
 * Turns the real signals we already produce in generateAcquisitionDraft into a
 * transparent 0-100 score + a per-signal checklist + human-readable warning flags.
 * There is deliberately NO model/LLM call here — the score is a deterministic,
 * auditable function of grounding signals, so an admin can always see WHY a draft
 * is 96% vs 61%.
 *
 * Server-used (called from the enrich route). HIGH_CONFIDENCE lives in the
 * client-safe pipeline-stage module so the board and the score agree.
 */

import type { AcquisitionResult } from './generate-acquisition-draft'
import { HIGH_CONFIDENCE } from './pipeline-stage'

export { HIGH_CONFIDENCE }

export interface ConfidenceResult {
  score: number
  signals: {
    website: boolean
    menu: boolean
    description_grounded: boolean
    reviews: boolean
    offers_grounded: boolean
    email: boolean
  }
  flags: string[]
}

/** Weights sum to 100. Tune here — everything downstream reads the resulting score. */
const WEIGHTS = {
  website: 25,
  menu: 20,
  description_grounded: 15,
  reviews: 15,
  offers_grounded: 15,
  email: 10,
} as const

export function scoreConfidence(r: AcquisitionResult): ConfidenceResult {
  const website = !!r.signals?.usedWebsite && (r.signals?.websiteChars || 0) > 300
  const menu =
    (r.signals?.menuItems?.length || 0) > 0 ||
    (r.listing?.featured_items || []).some((f) => f.source === 'website')
  const description_grounded = r.listing?.business_description?.source === 'website'
  const reviews = !!r.signals?.usedReviews
  const offers = r.offers || []
  const offers_grounded = offers.length >= 3 && offers.every((o) => (o.rationale?.trim()?.length ?? 0) > 0)
  const email = (r.contact?.emails?.length || 0) > 0

  const signals = { website, menu, description_grounded, reviews, offers_grounded, email }

  let score = 0
  ;(Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>).forEach((k) => {
    if (signals[k]) score += WEIGHTS[k]
  })

  const flags: string[] = []
  if (!website) flags.push('No website content')
  if (!menu) flags.push('No menu')
  if (!description_grounded) flags.push('Description inferred')
  if (!reviews) flags.push('No reviews')
  if (!offers_grounded) flags.push('Offer inferred')
  if (!email) flags.push('No email')

  return { score: Math.min(100, Math.max(0, score)), signals, flags }
}
