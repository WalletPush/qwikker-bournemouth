import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'
import { deriveStage, type Stage } from '@/lib/listing-engine/pipeline-stage'
import { dialCodeForCity } from '@/lib/utils/phone'

interface DraftShape {
  listing?: { business_description?: { value?: string } }
  offers?: unknown[]
  contact?: {
    whatsapp?: string | null
    phone?: string | null
    methods?: Array<{ type?: string; verified?: boolean }>
  }
}

/**
 * Per-city triage list for the Acquisition Engine table.
 * Returns businesses in the admin's covered cities with their enrichment status.
 *
 * IMPORTANT: Franchise cities can have 400+ unclaimed imports. A low alphabetical
 * cap silently hid enriched businesses from Confirm/Invite even though drafts
 * existed (CRM claim email still worked by businessId). Default/max limits are
 * sized for that; we also force-include any ready enrichments missing from the
 * page so Confirm & publish never loses existing AI work.
 */
export async function GET(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const params = new URL(request.url).searchParams
    const q = (params.get('q') || '').trim()
    const unclaimedOnly = params.get('unclaimed') === '1'
    const hasWebsiteOnly = params.get('hasWebsite') === '1'
    const enriched = params.get('enriched') || 'all' // all | yes | no
    // Default 1000 / max 2000 — Kefalonia alone has ~400 unclaimed imports.
    const limit = Math.min(Math.max(parseInt(params.get('limit') || '1000', 10) || 1000, 1), 2000)

    const covered = coveredCitiesFor(city)
    const supabase = createAdminClient()

    let countQuery = supabase
      .from('business_profiles')
      .select('id', { count: 'exact', head: true })
      .in('city', covered)
    if (q) countQuery = countQuery.ilike('business_name', `%${q}%`)
    if (unclaimedOnly) countQuery = countQuery.is('owner_user_id', null)
    if (hasWebsiteOnly) countQuery = countQuery.not('website_url', 'is', null)
    const { count: matchedTotal } = await countQuery

    let query = supabase
      .from('business_profiles')
      .select(
        'id, business_name, business_town, city, owner_user_id, email, phone, contact_methods, rating, review_count, google_place_id, website_url, display_category, system_category, business_type'
      )
      .in('city', covered)
      .order('business_name', { ascending: true })
      .limit(limit)

    if (q) query = query.ilike('business_name', `%${q}%`)
    if (unclaimedOnly) query = query.is('owner_user_id', null)
    if (hasWebsiteOnly) query = query.not('website_url', 'is', null)

    const { data: businesses, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Ready drafts (Confirm) + anything already invited (Sent). Force-include so
    // alphabetical page caps never hide published/sent outreach work.
    const ENRICHMENT_SELECT =
      'business_id, status, draft, generated_at, published_at, confidence, confidence_signals, sent_at, sent_to_email, review_action, claim_link_clicked_at, claim_link_click_count, demo_link_clicked_at, demo_link_click_count'
    const { data: cityEnrichments } = await supabase
      .from('business_enrichments')
      .select(ENRICHMENT_SELECT)
      .in('city', covered)
      .or('status.eq.ready,sent_at.not.is.null')

    const businessById = new Map((businesses || []).map((b) => [b.id, b]))
    const missingEnrichmentIds = (cityEnrichments || [])
      .map((e) => e.business_id)
      .filter((id) => id && !businessById.has(id))

    if (missingEnrichmentIds.length > 0) {
      let missingQuery = supabase
        .from('business_profiles')
        .select(
          'id, business_name, business_town, city, owner_user_id, email, phone, contact_methods, rating, review_count, google_place_id, website_url, display_category, system_category, business_type'
        )
        .in('id', missingEnrichmentIds)
      if (unclaimedOnly) missingQuery = missingQuery.is('owner_user_id', null)
      const { data: missingBiz } = await missingQuery
      for (const b of missingBiz || []) {
        businessById.set(b.id, b)
      }
    }

    const mergedBusinesses = Array.from(businessById.values()).sort((a, b) =>
      String(a.business_name || '').localeCompare(String(b.business_name || ''))
    )
    const ids = mergedBusinesses.map((b) => b.id)
    interface EnrichmentInfo {
      status: string
      offersCount: number
      hasListing: boolean
      generatedAt: string | null
      published: boolean
      confidence: number | null
      flags: string[]
      sentAt: string | null
      sentToEmail: string | null
      claimLinkClickedAt: string | null
      claimLinkClickCount: number
      demoLinkClickedAt: string | null
      demoLinkClickCount: number
      reviewAction: string | null
      whatsapp: string | null
      whatsappVerified: boolean
    }
    const enrichmentMap = new Map<string, EnrichmentInfo>()

    const toEnrichmentInfo = (e: {
      business_id: string
      status: string
      draft: unknown
      generated_at: string | null
      published_at: string | null
      confidence: number | null
      confidence_signals: unknown
      sent_at: string | null
      sent_to_email?: string | null
      claim_link_clicked_at?: string | null
      claim_link_click_count?: number | null
      demo_link_clicked_at?: string | null
      demo_link_click_count?: number | null
      review_action: string | null
    }): EnrichmentInfo => {
      const draft = (e.draft || {}) as DraftShape
      const cs = (e.confidence_signals || {}) as { flags?: string[] }
      return {
        status: e.status,
        offersCount: Array.isArray(draft.offers) ? draft.offers.length : 0,
        hasListing: !!draft.listing?.business_description?.value,
        generatedAt: e.generated_at,
        published: !!e.published_at,
        confidence: e.confidence ?? null,
        flags: Array.isArray(cs.flags) ? cs.flags : [],
        sentAt: e.sent_at ?? null,
        sentToEmail: e.sent_to_email ?? null,
        claimLinkClickedAt: e.claim_link_clicked_at ?? null,
        claimLinkClickCount: e.claim_link_click_count ?? 0,
        demoLinkClickedAt: e.demo_link_clicked_at ?? null,
        demoLinkClickCount: e.demo_link_click_count ?? 0,
        reviewAction: e.review_action ?? null,
        whatsapp: draft.contact?.whatsapp ?? null,
        whatsappVerified:
          draft.contact?.methods?.find((m) => m?.type === 'whatsapp')?.verified ?? false,
      }
    }

    // Prefer the city-wide ready/sent set, then fill any other statuses for listed IDs.
    for (const e of cityEnrichments || []) {
      enrichmentMap.set(e.business_id, toEnrichmentInfo(e))
    }

    const missingStatusIds = ids.filter((id) => !enrichmentMap.has(id))
    if (missingStatusIds.length > 0) {
      for (let i = 0; i < missingStatusIds.length; i += 200) {
        const chunk = missingStatusIds.slice(i, i + 200)
        const { data: enrichments } = await supabase
          .from('business_enrichments')
          .select(ENRICHMENT_SELECT)
          .in('business_id', chunk)

        for (const e of enrichments || []) {
          enrichmentMap.set(e.business_id, toEnrichmentInfo(e))
        }
      }
    }

    let rows = mergedBusinesses.map((b) => {
      const e = enrichmentMap.get(b.id) || null
      const claimed = !!b.owner_user_id
      const stage: Stage = deriveStage({
        claimed,
        hasEnrichment: !!e,
        status: e?.status,
        confidence: e?.confidence,
        reviewAction: e?.reviewAction,
        sentAt: e?.sentAt,
      })
      return {
        id: b.id,
        name: b.business_name,
        town: b.business_town,
        city: b.city,
        claimed,
        email: b.email || null,
        // WhatsApp number for outreach — explicit link or a mobile scraped from the
        // site only (never a landline/Google number). `whatsappVerified` marks the
        // explicit-link case so the UI can be honest about confidence.
        whatsapp: e?.whatsapp ?? null,
        whatsappVerified: e?.whatsappVerified ?? false,
        phone: b.phone || null,
        dialCode: dialCodeForCity(city),
        // Unified outreach channels (populated on enrich). Kept as-is for the cards.
        contactMethods: Array.isArray(b.contact_methods) ? b.contact_methods : [],
        rating: b.rating,
        reviewCount: b.review_count,
        hasWebsite: !!b.website_url,
        hasPlaceId: !!b.google_place_id,
        // Show the customer-facing category (same as the live listing & demo hero),
        // falling back to the internal bucket only if there's no display category.
        category: b.display_category || b.system_category || b.business_type || null,
        stage,
        confidence: e?.confidence ?? null,
        flags: e?.flags ?? [],
        sentAt: e?.sentAt ?? null,
        sentToEmail: e?.sentToEmail ?? null,
        claimLinkClickedAt: e?.claimLinkClickedAt ?? null,
        claimLinkClickCount: e?.claimLinkClickCount ?? 0,
        demoLinkClickedAt: e?.demoLinkClickedAt ?? null,
        demoLinkClickCount: e?.demoLinkClickCount ?? 0,
        reviewAction: e?.reviewAction ?? null,
        enrichment: e
          ? {
              status: e.status,
              offersCount: e.offersCount,
              hasListing: e.hasListing,
              generatedAt: e.generatedAt,
              published: e.published,
            }
          : null,
      }
    })

    if (enriched === 'yes') rows = rows.filter((r) => r.enrichment?.status === 'ready')
    if (enriched === 'no') rows = rows.filter((r) => r.enrichment?.status !== 'ready')

    // Dashboard counts. Note "emailsSent" counts every invite ever sent (including
    // businesses that later claimed) so claim rate matches "claimed / emails sent".
    const stageCount = (s: Stage) => rows.filter((r) => r.stage === s).length
    const emailsSent = rows.filter((r) => enrichmentMap.get(r.id)?.sentAt).length
    const claimed = stageCount('claimed')
    const counts = {
      total: rows.length,
      imported: stageCount('imported'),
      enriching: stageCount('enriching'),
      needsReview: stageCount('needs_review') + stageCount('error'),
      readyToSend: stageCount('ready_to_send'),
      sent: stageCount('sent'),
      claimed,
      rejected: stageCount('rejected'),
      enriched: rows.filter((r) => r.enrichment?.status === 'ready').length,
      emailsSent,
      claimRate: emailsSent > 0 ? Math.round((claimed / emailsSent) * 1000) / 10 : 0,
    }

    const totalMatched = matchedTotal ?? rows.length
    return NextResponse.json({
      rows,
      counts,
      meta: {
        limit,
        returned: rows.length,
        matchedTotal: totalMatched,
        truncated: totalMatched > rows.length,
        forceIncludedEnrichments: missingEnrichmentIds.length,
      },
    })
  } catch (error) {
    console.error('pipeline error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
