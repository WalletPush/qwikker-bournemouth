/**
 * Acquisition Engine — Phase 0 (Jul 2026)
 *
 * One grounded LLM pass that produces BOTH a rich listing draft AND 3 one-off
 * offers for a single business, from real signals only:
 *   - the business's own website (scanned live from website_url)
 *   - Google rating / review count / category / hours
 *   - Google review text (transient, insight only — never stored)
 *   - existing menu_preview (claimed businesses)
 *
 * Every listing field carries a `source` (website | google | ai_inferred) so the
 * review UI can decide what is safe to publish on an UNCLAIMED profile vs what
 * must wait for owner confirmation at claim. Nothing here writes to the DB — this
 * is a draft generator.
 *
 * Offers are ONE-OFF promotions only (no loyalty/stamp cards — that's a separate
 * Qwikker system). Reuses the offer engine's currency + category playbook so the
 * two stay consistent.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getFranchiseApiKeys } from '@/lib/utils/franchise-api-keys'
import { fetchPlaceDetailsForListing } from '@/lib/listing-engine/fetch-place-details'
import { fetchWebsiteText } from '@/lib/listing-engine/fetch-website'
import {
  cityCurrency,
  playbookFor,
  type GeneratedOffer,
} from '@/lib/offer-engine/generate-offers'
import OpenAI from 'openai'

export type FieldSource = 'website' | 'google' | 'ai_inferred'

export interface SourcedText {
  value: string
  source: FieldSource
}

export interface FeaturedItem {
  name: string
  description: string
  source: FieldSource
}

export interface ListingDraft {
  business_description: SourcedText
  business_tagline: SourcedText
  featured_items: FeaturedItem[]
}

export interface AcquisitionResult {
  business: {
    id: string
    name: string
    category: string
    town: string | null
    city: string | null
    rating: number | null
    reviewCount: number | null
    websiteUrl: string | null
    claimed: boolean
  }
  signals: {
    usedWebsite: boolean
    websiteChars: number
    usedReviews: boolean
    reviewsUsed: number
    menuItems: string[]
    currency: string
  }
  insight: {
    summary: string
    signature_items: string[]
    strengths: string[]
  }
  listing: ListingDraft
  offers: GeneratedOffer[]
  /** Contact details discovered while scanning the website (for outreach). */
  contact: { emails: string[] }
  meta: { model: string; costEstimateUsd: number }
}

function coerceSource(v: unknown): FieldSource {
  return v === 'website' || v === 'google' ? v : 'ai_inferred'
}

export async function generateAcquisitionDraft(
  businessId: string,
  requestCity: string,
  coveredCities: string[]
): Promise<AcquisitionResult> {
  const supabase = createAdminClient()

  const { data: biz, error } = await supabase
    .from('business_profiles')
    .select(
      `id, business_name, owner_user_id, city, business_town,
       system_category, business_type, business_category, display_category,
       rating, review_count, google_place_id, website_url,
       business_description, business_tagline, menu_preview`
    )
    .eq('id', businessId)
    .single()

  if (error || !biz) {
    throw new Error('Business not found')
  }

  // Tenant guard
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

  // One Google Place Details call gives us BOTH transient review insight (not
  // stored) AND the website URI (cost-neutral — reviews already set the billing
  // tier). Use the FRANCHISE city for the API-key lookup — the business's own city
  // may be a sub-town (e.g. Poole) with no config row.
  let reviewTexts: string[] = []
  let recoveredWebsite: string | null = null
  if (biz.google_place_id) {
    try {
      const details = await fetchPlaceDetailsForListing(biz.google_place_id, requestCity)
      if (details) {
        reviewTexts = details.reviews
          .filter((r) => (r.rating ?? 5) >= 4 && r.text)
          .slice(0, 8)
          .map((r) => r.text.replace(/\s+/g, ' ').trim().slice(0, 400))
          .filter(Boolean)
        recoveredWebsite = details.website
      }
    } catch (e) {
      console.error('acquisition-engine: place details fetch failed (non-fatal):', e)
    }
  }

  // Many imported businesses have a Google listing but no website_url on file —
  // the #1 reason email discovery finds nothing. Recover it from Google and
  // persist it so the profile + the admin "find email" button benefit next time.
  const effectiveWebsite = biz.website_url || recoveredWebsite
  if (!biz.website_url && recoveredWebsite) {
    try {
      await supabase.from('business_profiles').update({ website_url: recoveredWebsite }).eq('id', businessId)
    } catch (e) {
      console.warn('acquisition-engine: could not persist recovered website', e)
    }
  }

  // Scan the business's own website (best grounding signal we have). Pass the
  // category so the crawler knows whether to hunt a food menu or a services /
  // treatments / price-list page when the site has no obvious link.
  const website = await fetchWebsiteText(effectiveWebsite, {
    category: `${category} ${biz.display_category || ''} ${biz.business_category || ''}`,
  })

  const openai = new OpenAI({ apiKey: franchiseKeys.openai_api_key })

  const system = `You are Qwikker's listing + offer strategist for local businesses. You build a rich, accurate business listing AND design offers, grounded ONLY in the data provided.

CORE HONESTY RULES (critical — these profiles may be shown publicly before the owner claims them):
- Assert ONLY what the provided WEBSITE TEXT or GOOGLE DATA supports. Do NOT invent facts, awards, dishes, services, or superlatives.
- Every listing field must include a "source":
  - "website" = the fact is clearly present in the provided website text
  - "google" = derived from the Google rating/category/hours/menu data
  - "ai_inferred" = a reasonable, generic-but-safe inference (e.g. tone) NOT stated anywhere
- If you don't have real support for something, either omit it or mark it "ai_inferred" and keep it generic and non-specific. When in doubt, omit.
- NEVER fabricate statistics or claims like "award-winning" unless it literally appears in the website text.

FEATURED ITEMS RULES (critical — read carefully):
- featured_items are REAL, specific things the business actually offers — for a FOOD venue that's dishes/drinks; for a SPA/SALON/BARBER/CLINIC/GYM/GARAGE etc. it's TREATMENTS or SERVICES (e.g. "Swedish Massage", "Gel Manicure", "MOT & Service"). Treat a services/treatments/price-list page exactly like a menu.
- ONLY include an item if its name appears in the WEBSITE TEXT (including the [MENU / SERVICES] section) or in existing_menu_items. Its "source" MUST be "website" or "google" — NEVER "ai_inferred".
- DO NOT invent, guess, or infer items. Do NOT list "typical" dishes or "typical" treatments for the category. If the data doesn't name specific items/services, return an EMPTY featured_items array. An empty list is the correct, expected answer for many businesses.
- Never invent prices.

OFFERS RULES:
- ONE-OFF promotional offers ONLY. NEVER loyalty schemes, stamp cards, points, or "collect/passport" mechanics — loyalty is a separate Qwikker system.
- Offers are redeemed IN PERSON at the venue by showing the Qwikker app. NEVER create offers about online ordering, online orders, delivery, click-and-collect, apps, or e-commerce — Qwikker is NOT an ordering/delivery platform (no "first online order", no "order online", no "delivery").
- TAILOR every offer to THIS specific business. Draw on its REAL specifics: the featured/menu items you found, the dishes or experiences customers praise in review_highlights, its cuisine/speciality, its star rating, and its town. Two businesses in the same category should NOT get the same three offers.
- The category_playbook is loose STRUCTURAL inspiration ONLY (mechanics like "freebie with minimum spend", "off-peak deal"). Do NOT copy its example wording or output boilerplate like "free side with two mains / free dessert with two mains / 2-for-1 cocktails" for every venue — that generic set is exactly what we want to AVOID.
- When you have ANY item-level or review signal, at least TWO of the three offers must reference something concrete about this business (a real named item, a praised speciality, its cuisine). Only fall back to fully generic category offers when the DATA genuinely contains no such signal.
- NEVER name a specific dish/product/item in an offer unless that exact item appears in existing_menu_items, the website text, or review_highlights. If you don't know their actual items, keep offers GENERIC to the category (e.g. "free dessert with two mains", "20% off your bill") — do NOT make up a specific product like "free lemon meringue pie".
- Prefer margin-safe structures (a freebie tied to a minimum spend beats a blanket discount).
- RATIONALE is OWNER-FACING (it may be shown to the business in the outreach email). Write one warm, specific sentence that makes them think "how do they know my business this well?". Cite the REAL data: their star_rating and total review_count (provided), and the dish/experience customers praise in review_highlights. e.g. "With a 4.6★ rating from 1,200+ reviews and diners repeatedly praising your Sunday roast, a free-side-with-two-roasts deal turns that reputation into midweek covers."
- NEVER fabricate numbers. Only use the star_rating and review_count exactly as provided. Do NOT invent a per-item statistic (e.g. never write "287 reviews mention your roast" — you do not have per-dish counts). "Reviewers repeatedly praise X" is fine ONLY when X actually appears in review_highlights.
- Use the currency symbol "${currency}".

Return STRICT JSON only, no markdown.`

  const payload = {
    business_name: biz.business_name,
    category,
    display_category: biz.display_category,
    town: biz.business_town,
    city: biz.city,
    star_rating: biz.rating,
    review_count: biz.review_count,
    currency,
    existing_menu_items: menuItems,
    website: website
      ? { url: website.url, title: website.title, meta: website.metaDescription, text: website.text }
      : null,
    review_highlights: reviewTexts,
    category_playbook: playbook,
  }

  const instruction = `Build a QWIKKER listing draft + 3 offers for this business using ONLY the DATA below.

Return JSON in EXACTLY this shape:
{
  "insight": { "summary": "string", "signature_items": ["string"], "strengths": ["string"] },
  "listing": {
    "business_description": { "value": "<=500 chars, natural, specific, grounded", "source": "website|google|ai_inferred" },
    "business_tagline": { "value": "<=60 chars", "source": "website|google|ai_inferred" },
    "featured_items": [ { "name": "string", "description": "<=120 chars", "source": "website|google|ai_inferred" } ]
  },
  "offers": [ { "offer_name": "string", "offer_type": "discount|two_for_one|freebie|buy_x_get_y|percentage_off|fixed_amount_off|other", "offer_value": "string", "offer_claim_amount": "single|multiple", "offer_terms": "string", "rationale": "string" } ]
}

Guidance:
- featured_items: ONLY real items/services named in the website text (incl. [MENU / SERVICES]) or existing_menu_items, with source "website" or "google". For non-food businesses these are treatments/services, not dishes. If no specific items are named in the DATA, return an empty array []. Never invent items or use source "ai_inferred" here.
- offers: TAILOR to THIS business using its real signals (featured_items, review_highlights, cuisine/speciality, rating, town). Don't output the same generic three offers you'd give any restaurant. When you have item/review signal, at least 2 of the 3 offers must reference something concrete about this business. Never name a specific product unless it appears in the DATA.
- exactly 3 offers, each a genuinely different mechanic AND angle.

DATA:
${JSON.stringify(payload, null, 2)}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: instruction },
    ],
    temperature: 0.75,
    max_tokens: 2400,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content || '{}'
  let parsed: {
    insight?: { summary?: string; signature_items?: string[]; strengths?: string[] }
    listing?: {
      business_description?: { value?: string; source?: string }
      business_tagline?: { value?: string; source?: string }
      featured_items?: Array<{ name?: string; description?: string; source?: string }>
    }
    offers?: GeneratedOffer[]
  }
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('The model returned invalid JSON — try again.')
  }

  // Grounding haystack for verifying featured items are REAL (not invented).
  // We only trust the business's own website text/title/meta (incl. any [MENU / SERVICES]
  // sections we crawled) and any existing menu_preview items. If an item the model
  // returned can't be found here, we drop it — no fabricated dishes ever reach a
  // public profile. See fetch-website.ts for how menu sub-pages are pulled in.
  const groundingHaystack = [
    website?.text || '',
    website?.title || '',
    website?.metaDescription || '',
    menuItems.join(' \n '),
  ]
    .join(' \n ')
    .toLowerCase()

  const isGrounded = (name: string): boolean => {
    const n = name.toLowerCase().trim()
    if (!n || !groundingHaystack) return false
    if (groundingHaystack.includes(n)) return true
    // Fall back to a token match so minor phrasing differences don't over-drop,
    // but require most meaningful words to be present.
    const tokens = n.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)
    if (tokens.length === 0) return false
    const hits = tokens.filter((t) => groundingHaystack.includes(t)).length
    return hits / tokens.length >= 0.6
  }

  const listing: ListingDraft = {
    business_description: {
      value: parsed.listing?.business_description?.value?.slice(0, 500) || '',
      source: coerceSource(parsed.listing?.business_description?.source),
    },
    business_tagline: {
      value: parsed.listing?.business_tagline?.value?.slice(0, 80) || '',
      source: coerceSource(parsed.listing?.business_tagline?.source),
    },
    // HARD RULE: featured items must be verifiably real. Drop anything the model
    // marked "ai_inferred" and anything we can't find in the grounding text.
    featured_items: Array.isArray(parsed.listing?.featured_items)
      ? parsed.listing!.featured_items
          .filter((it) => it && typeof it.name === 'string' && it.name.trim())
          .map((it) => ({
            name: it.name!.trim(),
            description: (it.description || '').trim().slice(0, 120),
            source: coerceSource(it.source),
          }))
          .filter((it) => it.source !== 'ai_inferred' && isGrounded(it.name))
          .slice(0, 8)
      : [],
  }

  const offers: GeneratedOffer[] = Array.isArray(parsed.offers) ? parsed.offers.slice(0, 3) : []

  const costEstimate = 0.03 + (reviewTexts.length > 0 ? 0.025 : 0)

  return {
    business: {
      id: biz.id,
      name: biz.business_name,
      category,
      town: biz.business_town,
      city: biz.city,
      rating: biz.rating,
      reviewCount: biz.review_count,
      websiteUrl: effectiveWebsite,
      claimed,
    },
    signals: {
      usedWebsite: !!website,
      websiteChars: website?.chars || 0,
      usedReviews: reviewTexts.length > 0,
      reviewsUsed: reviewTexts.length,
      menuItems,
      currency,
    },
    insight: {
      summary: parsed.insight?.summary || '',
      signature_items: Array.isArray(parsed.insight?.signature_items) ? parsed.insight!.signature_items : [],
      strengths: Array.isArray(parsed.insight?.strengths) ? parsed.insight!.strengths : [],
    },
    listing,
    offers,
    contact: { emails: website?.emails || [] },
    meta: { model: 'gpt-4o', costEstimateUsd: costEstimate },
  }
}
