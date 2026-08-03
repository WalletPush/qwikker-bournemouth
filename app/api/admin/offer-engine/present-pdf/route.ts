import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { signDemoToken } from '@/lib/listing-engine/demo-token'
import { renderDemoPdf } from '@/lib/pdf/render-demo-pdf'

// Headless Chrome needs the Node.js runtime and time to render a long page.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * One-click Present Mode PDF for ONE business.
 *
 * Mints a signed demo token (gated on enrichment, like /present-token), then
 * renders the real /demo/<token>?pdf=1 page in headless Chrome and streams back
 * an A4 PDF as a download. Same page → the PDF matches the demo exactly.
 */
export async function GET(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  const businessId = request.nextUrl.searchParams.get('businessId') || undefined
  if (!businessId) {
    return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
  }

  const supabase = createAdminClient()

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

  // Gate on enrichment — the demo is built from the draft.
  const { data: enrichment } = await supabase
    .from('business_enrichments')
    .select('status, draft')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!enrichment?.draft || enrichment.status !== 'ready') {
    return NextResponse.json(
      { error: 'Enrich this business first to generate its PDF.', code: 'not_enriched' },
      { status: 409 }
    )
  }

  // Resolve the public origin so Chrome can load the page (dev: localhost).
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const base = host ? `${proto}://${host}` : request.nextUrl.origin

  const token = signDemoToken(businessId, city, 30)
  // capture=1 omits presenter chrome from the DOM; pdf=1 freezes animations.
  const demoUrl = `${base}/demo/${token}?pdf=1&capture=1`

  try {
    const pdf = await renderDemoPdf(demoUrl)
    const safeName = (biz.business_name || 'Qwikker listing')
      .replace(/[\r\n"]/g, '')
      .replace(/[^\x20-\x7E]/g, '')
      .trim()
      .slice(0, 80) || 'Qwikker listing'

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName} - Qwikker.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('present-pdf: render failed', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not generate PDF' },
      { status: 500 }
    )
  }
}
