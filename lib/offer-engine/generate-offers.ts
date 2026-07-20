/**
 * AI Offer Engine — proving spike (Jul 2026)
 *
 * Generates 3 grounded, margin-aware offer ideas for a single business using
 * ONLY real signals we already hold or can fetch on demand:
 *   - menu_preview items (claimed businesses)
 *   - rating + review_count (google-verified for most imports)
 *   - Google review text, fetched transiently at generation time to derive
 *     insight (signature dishes / recurring praise) — NOT stored, NOT displayed
 *   - category playbook (archetypes that convert for that vertical)
 *
 * The whole point of the spike is to prove offers are specific (not "10% off
 * everything") and honest (rationale explains reasoning, never fabricated stats).
 *
 * Server-only module (imported by admin API routes). Not a 'use server' file
 * because it also exports types + a sync helper.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import { fetchGoogleReviewsOnDemand } from '@/lib/utils/google-reviews-on-demand'
import OpenAI from 'openai'

export type OfferType =
  | 'discount'
  | 'two_for_one'
  | 'freebie'
  | 'buy_x_get_y'
  | 'percentage_off'
  | 'fixed_amount_off'
  | 'other'

export type OfferClaimAmount = 'single' | 'multiple'

export interface GeneratedOffer {
  offer_name: string
  offer_type: OfferType
  offer_value: string
  offer_claim_amount: OfferClaimAmount
  offer_terms: string
  rationale: string
}

export interface OfferInsight {
  summary: string
  signature_items: string[]
  strengths: string[]
}

export interface OfferEngineResult {
  business: {
    id: string
    name: string
    category: string
    town: string | null
    city: string | null
    rating: number | null
    reviewCount: number | null
    claimed: boolean
  }
  signals: {
    usedReviews: boolean
    reviewsUsed: number
    menuItems: string[]
    tagline: string | null
    hasDescription: boolean
    currency: string
  }
  insight: OfferInsight
  offers: GeneratedOffer[]
  meta: { model: string; costEstimateUsd: number }
}

/**
 * Cities a given franchise admin covers. Mirrors the legacy mapping used on the
 * admin dashboard so a Bournemouth admin can also see Christchurch/Poole imports.
 * TODO(post-spike): source from franchise_crm_configs / geographic_areas.
 */
const COVERED_CITIES: Record<string, string[]> = {
  bournemouth: ['bournemouth', 'christchurch', 'poole'],
}

export function coveredCitiesFor(city: string): string[] {
  const key = (city || '').toLowerCase()
  return COVERED_CITIES[key] || [key].filter(Boolean)
}

// Minimal per-city currency hint for the spike. The LLM is also told to match
// any currency already present in the menu prices.
// TODO(post-spike): source from franchise config, not a hard-coded map.
const CITY_CURRENCY: Record<string, string> = {
  bournemouth: '£',
  christchurch: '£',
  poole: '£',
  london: '£',
  shrewsbury: '£',
  newport: '£',
  brighton: '£',
  southampton: '£',
  cornwall: '£',
  kefalonia: '€',
  alicante: '€',
  'costa-blanca': '€',
  paris: '€',
}

export function cityCurrency(city: string | null | undefined): string {
  return CITY_CURRENCY[(city || '').toLowerCase()] || '£'
}

// Compact archetype guide per vertical. Steers the model toward structures that
// actually convert (and protect margin) rather than blanket discounts.
const CATEGORY_PLAYBOOK: Record<string, string> = {
  food: 'free signature dessert/side with two mains; happy-hour 2-for-1 drinks; set lunch deal; kids eat free midweek',
  restaurant: 'free signature dessert/side with two mains; happy-hour 2-for-1 drinks; set lunch deal; midweek treat',
  cafe: 'free pastry with any large coffee before 11am; brunch bundle; off-peak treat',
  bar: 'happy-hour 2-for-1; free bar snack with two drinks; cocktail-of-the-week discount',
  beauty: 'first-visit % off; bring-a-friend; off-peak midweek discount; free add-on treatment',
  wellness: 'discounted intro session; bring-a-friend; off-peak package',
  fitness: 'free trial class; first-week pass; bring-a-friend; off-peak membership',
  retail: 'spend-and-save threshold; bundle deal; first-purchase % off',
  accommodation: 'free late checkout; welcome drink/upgrade; stay-3-pay-2 off-peak',
  rental: '3-days-for-2; free helmet/upgrade; group discount; off-peak day rate',
  automotive: 'free check/valet with a service; seasonal service discount',
  health: 'free consultation/check; first-visit discount',
  tours_activities: 'group discount; off-peak departure deal; free add-on',
  services: 'first-service discount; referral reward; bundle',
}

export function playbookFor(category: string): string {
  const key = (category || '').toLowerCase()
  return CATEGORY_PLAYBOOK[key] || CATEGORY_PLAYBOOK.services
}

/**
 * Generate 3 grounded offer ideas for a business.
 * @param businessId  business_profiles.id
 * @param requestCity the admin's franchise city (for API keys + tenant scoping)
 * @param coveredCities cities this admin is allowed to touch (tenant guard)
 */
export async function generateOfferIdeas(
  businessId: string,
  requestCity: string,
  coveredCities: string[]
): Promise<OfferEngineResult> {
  const supabase = createAdminClient()

  const { data: biz, error } = await supabase
    .from('business_profiles')
    .select(
      `id, business_name, owner_user_id, city, business_town,
       system_category, business_type, business_category,
       rating, review_count, google_place_id,
       business_description, business_tagline, menu_preview`
    )
    .eq('id', businessId)
    .single()

  if (error || !biz) {
    throw new Error('Business not found')
  }

  // Tenant guard: never let an admin generate for a business outside their patch.
  const allowed = coveredCities.map((c) => c.toLowerCase())
  if (biz.city && allowed.length > 0 && !allowed.includes(biz.city.toLowerCase())) {
    throw new Error('Business is outside your franchise area')
  }

  const franchiseKeys = await getFranchiseApiKeys(requestCity)
  if (!franchiseKeys.openai_api_key) {
    throw new Error('OpenAI API key not configured for this city — add it on the Setup page.')
  }

  const claimed = !!biz.owner_user_id
  const category = biz.system_category || biz.business_type || biz.business_category || 'other'
  const playbook = playbookFor(category)
  const currency = cityCurrency(biz.city || requestCity)

  const menuItems: string[] = Array.isArray(biz.menu_preview)
    ? (biz.menu_preview as Array<Record<string, unknown>>)
        .map((m) => {
          if (!m) return ''
          const name = typeof m.name === 'string' ? m.name.trim() : ''
          const price = typeof m.price === 'string' ? m.price.trim() : ''
          return price ? `${name} (${price})` : name
        })
        .filter(Boolean)
        .slice(0, 20)
    : []

  // On-demand Google reviews: transient insight extraction only. We keep just the
  // review text (drop author/photo), cap length, and never persist it.
  let reviewTexts: string[] = []
  if (biz.google_place_id) {
    try {
      const reviews = await fetchGoogleReviewsOnDemand(biz.google_place_id, biz.city || requestCity)
      if (reviews) {
        reviewTexts = reviews
          .filter((r) => (r.rating ?? 5) >= 4 && r.text)
          .slice(0, 8)
          .map((r) => r.text.replace(/\s+/g, ' ').trim().slice(0, 400))
          .filter(Boolean)
      }
    } catch (e) {
      console.error('offer-engine: review fetch failed (non-fatal):', e)
    }
  }

  const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })

  const system = `You are Qwikker's offer strategist for local businesses. You design compelling, margin-aware promotional offers grounded ONLY in the real data provided.

Hard rules:
- These are ONE-OFF promotional offers ONLY. NEVER generate loyalty schemes, stamp cards, or points/collect-based rewards (no "buy 6 get 1 free", no "collect stamps", no "passport", no membership tiers) — loyalty is handled by a completely separate Qwikker system.
- Offers are redeemed IN PERSON at the venue by showing the Qwikker app. NEVER create offers tied to online ordering, online orders, delivery, click-and-collect, apps, websites, or e-commerce — Qwikker is NOT an ordering or delivery platform. No "first online order", no "order online", no "delivery" offers.
- NEVER invent statistics or uplift claims (no "boosts sales 30%", no made-up footfall numbers). The rationale explains REASONING only — season, margin protection, what customers already praise, category norms.
- Ground every offer in the REAL signals: signature items from the menu or repeatedly praised in reviews, the star rating, and the category playbook.
- TAILOR to THIS business — two venues in the same category must not get the same three offers. The category_playbook is loose STRUCTURAL inspiration ONLY (mechanics), NOT wording to copy; avoid boilerplate like "free side with two mains / free dessert with two mains / 2-for-1 cocktails" for every place.
- Prefer margin-safe structures. A freebie tied to a minimum spend beats a blanket discount. Off-peak > all-day where it fits.
- NEVER name a specific dish/product/item unless that exact item appears in menu_items or review_highlights. If you don't know their actual items, keep the offer GENERIC to the category (e.g. "free dessert with two mains", "20% off your bill") — do NOT invent a specific product like "free lemon meringue pie".
- If (and only if) a signature item is known (from menu or reviews), build at least one offer around it BY NAME.
- Use the currency symbol "${currency}" and match any price format already present in the menu.
- The three offers must be genuinely DIFFERENT from each other (different mechanic and appeal).
- Return STRICT JSON only, no markdown.`

  const payload = {
    business_name: biz.business_name,
    category,
    town: biz.business_town,
    city: biz.city,
    star_rating: biz.rating,
    review_count: biz.review_count,
    tagline: biz.business_tagline || null,
    description: biz.business_description || null,
    menu_items: menuItems,
    review_highlights: reviewTexts,
    category_playbook: playbook,
    currency,
  }

  const instruction = `Using ONLY the data below, first extract a short INSIGHT (what makes this place distinctive, its signature items, and its strengths), then design 3 DISTINCT offers.

Each offer must use exactly these fields:
- offer_name: short, appealing customer-facing headline
- offer_type: one of discount | two_for_one | freebie | buy_x_get_y | percentage_off | fixed_amount_off | other
- offer_value: e.g. "Free dessert", "20% off", "2 for 1", "${currency}10 off"
- offer_claim_amount: "single" (once per customer) or "multiple" (repeatable while live)
- offer_terms: the conditions (minimum spend, days/times, exclusions) — concrete and fair
- rationale: 1-2 sentences on WHY this works for THIS business, citing the real signals above (no fabricated numbers)

DATA:
${JSON.stringify(payload, null, 2)}

Return JSON exactly in this shape:
{"insight":{"summary":"...","signature_items":["..."],"strengths":["..."]},"offers":[{"offer_name":"...","offer_type":"...","offer_value":"...","offer_claim_amount":"single","offer_terms":"...","rationale":"..."}]}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: instruction },
    ],
    temperature: 0.8,
    max_tokens: 1400,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  let parsed: { insight?: OfferInsight; offers?: GeneratedOffer[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The model returned invalid JSON — try again.')
  }

  const insight: OfferInsight = {
    summary: parsed.insight?.summary || '',
    signature_items: Array.isArray(parsed.insight?.signature_items) ? parsed.insight!.signature_items : [],
    strengths: Array.isArray(parsed.insight?.strengths) ? parsed.insight!.strengths : [],
  }

  const offers: GeneratedOffer[] = Array.isArray(parsed.offers) ? parsed.offers.slice(0, 3) : []

  return {
    business: {
      id: biz.id,
      name: biz.business_name,
      category,
      town: biz.business_town,
      city: biz.city,
      rating: biz.rating,
      reviewCount: biz.review_count,
      claimed,
    },
    signals: {
      usedReviews: reviewTexts.length > 0,
      reviewsUsed: reviewTexts.length,
      menuItems,
      tagline: biz.business_tagline || null,
      hasDescription: !!biz.business_description,
      currency,
    },
    insight,
    offers,
    meta: {
      model: 'gpt-4o',
      costEstimateUsd: reviewTexts.length > 0 ? 0.025 : 0,
    },
  }
}
