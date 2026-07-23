import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { signDemoToken } from '@/lib/listing-engine/demo-token'
import { getFranchisePublicUrl } from '@/lib/utils/franchise-url'

/**
 * Mint a signed Present Mode (prospecting demo) token for ONE business.
 *
 * Present Mode is gated on enrichment: the whole pitch is built from the
 * enrichment draft (tailored copy, REAL featured items, suggested offers + the
 * social-proof hook), so we only mint a token once a business has a ready draft.
 *
 * Returns both:
 *   - path: relative /demo/<token> — open in-person on the CURRENT host (works on
 *     localhost / offline pre-load).
 *   - url:  absolute https://<city>.qwikker.com/demo/<token> — shareable link for
 *     the claim email / leave-behind.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  const body = await request.json().catch(() => ({}))
  const businessId: string | undefined = body?.businessId
  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Business must exist and belong to this admin's city (tenant safety).
  const { data: biz, error: bizErr } = await supabase
    .from('business_profiles')
    .select('id, city, business_name')
    .eq('id', businessId)
    .maybeSingle()

  if (bizErr || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }
  if ((biz.city || '').toLowerCase() !== city.toLowerCase()) {
    return NextResponse.json({ error: 'Business is not in your city' }, { status: 403 })
  }

  // Gate on enrichment — Present Mode needs a draft to be worth showing.
  const { data: enrichment } = await supabase
    .from('business_enrichments')
    .select('status, draft')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!enrichment?.draft || enrichment.status !== 'ready') {
    return NextResponse.json(
      { error: 'Enrich this business first to unlock Present Mode.', code: 'not_enriched' },
      { status: 409 }
    )
  }

  // Longer-lived so a link left behind / dropped in the claim email keeps working.
  const token = signDemoToken(businessId, city, 30)

  return NextResponse.json({
    success: true,
    token,
    path: `/demo/${token}`,
    url: `${getFranchisePublicUrl(city)}/demo/${token}`,
    businessName: biz.business_name || null,
  })
}
