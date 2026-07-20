import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * Public (claim-flow) endpoint: return the AI-drafted offers for a business the
 * owner is claiming, so they can accept/edit/decline them in the wizard.
 *
 * Safety:
 *  - Only for UNCLAIMED businesses (nothing sensitive; these are promo ideas).
 *  - City-scoped to the request hostname (multi-tenant isolation).
 *  - Excludes offers the admin already marked "declined" in review.
 *  - Returns only owner-safe fields (name/type/value/terms + a short rationale).
 *
 * GET /api/claim/draft-offers?business_id=...
 */
export async function GET(request: NextRequest) {
  try {
    const businessId = new URL(request.url).searchParams.get('business_id') || ''
    if (!businessId) {
      return NextResponse.json({ success: false, error: 'Missing business_id' }, { status: 400 })
    }

    const hostname = request.headers.get('host') || ''
    const requestCity = (await getCityFromHostname(hostname))?.trim().toLowerCase()

    const supabase = createServiceRoleClient()

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, city, status, owner_user_id')
      .eq('id', businessId)
      .single()

    // Silently return no offers for anything not eligible (never leak details).
    if (
      !business ||
      business.owner_user_id ||
      business.status !== 'unclaimed' ||
      !requestCity ||
      business.city?.trim().toLowerCase() !== requestCity
    ) {
      return NextResponse.json({ success: true, offers: [] })
    }

    const { data: enrichment } = await supabase
      .from('business_enrichments')
      .select('draft, decisions')
      .eq('business_id', businessId)
      .maybeSingle()

    const draft = (enrichment?.draft || {}) as {
      offers?: Array<{
        offer_name?: string
        offer_type?: string
        offer_value?: string
        offer_claim_amount?: string
        offer_terms?: string
        rationale?: string
      }>
    }
    const decisions = (enrichment?.decisions || {}) as Record<string, string>

    const offers = (draft.offers || [])
      .map((o, i) => ({ o, declined: decisions[`offer-${i}`] === 'declined' }))
      .filter((x) => !x.declined && x.o?.offer_name && x.o?.offer_value)
      .map((x) => ({
        offer_name: String(x.o.offer_name),
        offer_type: String(x.o.offer_type || 'other'),
        offer_value: String(x.o.offer_value),
        offer_claim_amount: x.o.offer_claim_amount === 'single' ? 'single' : 'multiple',
        offer_terms: String(x.o.offer_terms || ''),
        rationale: String(x.o.rationale || ''),
      }))

    return NextResponse.json({ success: true, offers })
  } catch (error) {
    console.error('claim/draft-offers error:', error)
    return NextResponse.json({ success: true, offers: [] })
  }
}
