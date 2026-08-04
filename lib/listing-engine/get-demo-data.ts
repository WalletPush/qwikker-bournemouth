/**
 * Assembles everything Present Mode (prospecting demo) needs for one business:
 *
 *   - The REAL, grounded listing exactly as it would go live (respecting the same
 *     per-field decisions/edits the claim email uses — so "this is you" is honest).
 *   - The suggested offers + "why this works" rationale.
 *   - Real Google social proof (rating, review_count, review highlights) for the
 *     personal hook.
 *   - Branding (logo, images) + a default Presentation-Mode preset from category.
 *
 * The "unlock" panels (loyalty / analytics / push / wallet pass) are rendered from
 * clearly-labelled EXAMPLE data in the components — never sourced here, keeping the
 * honesty rule intact.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { resolveBusinessCoverUrl } from '@/lib/placeholders/getPlaceholderImage'
import { getCurrencySymbolForCity } from '@/lib/utils/currency'
import { buildLaunchLinks, getLaunchPackQrCodes, type LaunchQrUrls } from '@/lib/listing-engine/ensure-launch-qr'

export interface DemoFeaturedItem {
  name: string
  description: string
  price: string
}

export interface DemoOffer {
  name: string
  value: string
  rationale: string | null
}

export type DemoPreset = 'food' | 'services' | 'general'

export interface DemoData {
  business: {
    id: string
    name: string
    slug: string
    city: string
    town: string | null
    category: string
    systemCategory: string | null
    logo: string | null
    images: string[]
    /** Deterministic category placeholder — used when there's no real photo/logo. */
    placeholderImage: string
    rating: number | null
    reviewCount: number | null
    websiteUrl: string | null
    claimed: boolean
  }
  /** Franchise currency symbol (e.g. "£", "$") for formatting bare prices. */
  currencySymbol: string
  /**
   * REAL public deep link to this business's live listing on the franchise
   * subdomain (what the launch-pack QR codes encode). /user/* is wallet-gated,
   * so scanning naturally runs the join → pass → listing flow.
   */
  listingUrl: string
  /** REAL "install the wallet pass, then land on your listing" deep link. */
  walletTryUrl: string
  /** Deep link to the listing's "What People Think" tab (Qwikker Vibes). */
  reviewUrl: string
  /** Google "write a review" deep link (null if we have no Google place id). */
  googleReviewUrl: string | null
  /**
   * Tracked, business-linked scan URLs (`/api/qr/scan/<code>`) for each launch
   * material, registered in the QR management tab. Null if registration failed
   * — callers fall back to the direct deep links above.
   */
  qrUrls: LaunchQrUrls | null
  listing: {
    tagline: string | null
    description: string | null
    featuredItems: DemoFeaturedItem[]
  }
  offers: DemoOffer[]
  insight: {
    summary: string | null
    signatureItems: string[]
    strengths: string[]
  }
  reviewHighlights: string[]
  hasEnrichment: boolean
  defaultPreset: DemoPreset
}

const FOOD_CATEGORIES = new Set([
  'restaurant', 'cafe', 'coffee', 'bar', 'pub', 'food', 'bakery', 'takeaway',
  'street_food', 'dessert', 'brunch', 'fast_food', 'food_and_drink',
])
const SERVICE_CATEGORIES = new Set([
  'spa', 'salon', 'hair_salon', 'barber', 'beauty', 'nails', 'clinic', 'gym',
  'fitness', 'wellness', 'garage', 'automotive', 'health_and_beauty', 'services',
])

function presetForCategory(systemCategory: string | null, displayCategory: string | null): DemoPreset {
  const c = (systemCategory || displayCategory || '').toLowerCase()
  if (!c) return 'general'
  for (const f of FOOD_CATEGORIES) if (c.includes(f)) return 'food'
  for (const s of SERVICE_CATEGORIES) if (c.includes(s)) return 'services'
  return 'general'
}

/** Best-effort coercion of google_reviews_highlights (jsonb) into string[]. */
function coerceHighlights(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) => {
      if (typeof r === 'string') return r
      if (r && typeof r === 'object') {
        const o = r as Record<string, unknown>
        return String(o.text || o.highlight || o.quote || o.summary || '')
      }
      return ''
    })
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 0)
    .slice(0, 6)
}

interface DraftShape {
  listing?: {
    business_tagline?: { value?: string }
    business_description?: { value?: string }
    featured_items?: Array<{ name?: string; description?: string; price?: string }>
  }
  offers?: Array<{ offer_name?: string; offer_value?: string; rationale?: string }>
  insight?: { summary?: string; signature_items?: string[]; strengths?: string[] }
}

/**
 * Load demo data for a business. Returns null only when the business doesn't
 * exist. Works even without an enrichment draft (hasEnrichment=false) so the
 * route can degrade gracefully — but the admin "Present" entry gates on
 * enrichment so the intended path always has a draft.
 */
export async function getDemoData(businessId: string): Promise<DemoData | null> {
  const supabase = createAdminClient()

  const { data: biz, error } = await supabase
    .from('business_profiles')
    .select(
      `id, business_name, owner_user_id, city, business_town,
       display_category, system_category, business_type,
       logo, business_images, rating, review_count, website_url,
       business_tagline, business_description, menu_preview,
       google_reviews_highlights, google_place_id,
       placeholder_variant, placeholder_custom_url`
    )
    .eq('id', businessId)
    .maybeSingle()

  if (error || !biz) return null

  const { data: enrichment } = await supabase
    .from('business_enrichments')
    .select('draft, decisions, edits')
    .eq('business_id', businessId)
    .maybeSingle()

  const draft = (enrichment?.draft || null) as DraftShape | null
  const decisions = (enrichment?.decisions || {}) as Record<string, string>
  const edits = (enrichment?.edits || {}) as Record<string, string>
  const hasEnrichment = !!draft

  // Tagline / description: prefer accepted enrichment (edits > draft), never show
  // a declined field; fall back to whatever is already on the profile.
  const tagline =
    decisions['tagline'] === 'declined'
      ? null
      : edits.tagline ?? draft?.listing?.business_tagline?.value ?? biz.business_tagline ?? null
  const description =
    decisions['description'] === 'declined'
      ? null
      : edits.description ?? draft?.listing?.business_description?.value ?? biz.business_description ?? null

  // Featured items: accepted draft items, else whatever's already on the profile
  // (menu_preview). Never invent — empty is fine.
  let featuredItems: DemoFeaturedItem[] = []
  if (draft?.listing?.featured_items?.length) {
    featuredItems = draft.listing.featured_items
      .map((it, i) => ({ it, declined: decisions[`feat-${i}`] === 'declined' }))
      .filter((x) => !x.declined && x.it?.name?.trim())
      .map((x) => ({
        name: String(x.it.name).trim(),
        description: (x.it.description || '').trim(),
        price: (x.it.price || '').trim(),
      }))
      .slice(0, 5)
  } else if (Array.isArray(biz.menu_preview)) {
    featuredItems = (biz.menu_preview as Array<Record<string, unknown>>)
      .filter((m) => m && typeof m.name === 'string' && (m.name as string).trim())
      .map((m) => ({
        name: String(m.name).trim(),
        description: String(m.description || '').trim(),
        price: String(m.price || '').trim(),
      }))
      .slice(0, 5)
  }

  const offers: DemoOffer[] = (draft?.offers || [])
    .map((o, i) => ({ o, declined: decisions[`offer-${i}`] === 'declined' }))
    .filter((x) => !x.declined && x.o?.offer_name && x.o?.offer_value)
    .map((x) => ({
      name: String(x.o.offer_name),
      value: String(x.o.offer_value),
      rationale: x.o.rationale ? String(x.o.rationale) : null,
    }))

  const category = biz.display_category || biz.system_category || biz.business_type || 'Local business'

  // Real, franchise-aware deep links for the launch-pack QR codes + try-it flow
  // (single source of truth shared with the enrichment step that registers the
  // QR codes, so both agree on every target URL).
  const { slug, publicBase, listingUrl, walletTryUrl, reviewUrl } = buildLaunchLinks({
    id: biz.id,
    business_name: biz.business_name,
    city: biz.city,
  })
  const googleReviewUrl = biz.google_place_id
    ? `https://search.google.com/local/writereview?placeid=${biz.google_place_id}`
    : null

  // READ-ONLY: pull the launch-pack QR codes that were registered when this
  // business was enriched. We never create codes here — opening the demo must be
  // side-effect free. Falls back to direct deep links when none exist yet.
  const qrUrls = await getLaunchPackQrCodes(supabase, {
    businessId: biz.id,
    businessName: biz.business_name || 'Your business',
    publicBase,
  })

  // Franchise-aware currency symbol so bare menu prices render correctly
  // (£4.50 in Bournemouth, $4.50 in Calgary, etc.). Non-fatal — defaults to £.
  let currencySymbol = '£'
  try {
    currencySymbol = await getCurrencySymbolForCity(biz.city || '')
  } catch {
    /* keep default */
  }

  return {
    business: {
      id: biz.id,
      name: biz.business_name || 'Your business',
      slug,
      city: biz.city || '',
      town: biz.business_town || null,
      category,
      systemCategory: biz.system_category || null,
      logo: biz.logo || null,
      images: Array.isArray(biz.business_images)
        ? (biz.business_images as unknown[]).map((x) => String(x)).filter(Boolean).slice(0, 6)
        : [],
      placeholderImage: resolveBusinessCoverUrl({
        businessImages: Array.isArray(biz.business_images)
          ? (biz.business_images as unknown[]).map((x) => String(x)).filter(Boolean)
          : null,
        customPlaceholderUrl: biz.placeholder_custom_url || null,
        systemCategory: biz.system_category || 'restaurant',
        businessId: biz.id,
        placeholderVariant: biz.placeholder_variant ?? null,
      }),
      rating: typeof biz.rating === 'number' ? biz.rating : null,
      reviewCount: typeof biz.review_count === 'number' ? biz.review_count : null,
      websiteUrl: biz.website_url || null,
      claimed: !!biz.owner_user_id,
    },
    listing: { tagline, description, featuredItems },
    offers,
    insight: {
      summary: draft?.insight?.summary || null,
      signatureItems: Array.isArray(draft?.insight?.signature_items) ? draft!.insight!.signature_items! : [],
      strengths: Array.isArray(draft?.insight?.strengths) ? draft!.insight!.strengths! : [],
    },
    reviewHighlights: coerceHighlights(biz.google_reviews_highlights),
    hasEnrichment,
    defaultPreset: presetForCategory(biz.system_category || null, biz.display_category || null),
    currencySymbol,
    listingUrl,
    walletTryUrl,
    reviewUrl,
    googleReviewUrl,
    qrUrls,
  }
}
