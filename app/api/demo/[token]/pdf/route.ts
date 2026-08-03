import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDemoToken } from '@/lib/listing-engine/demo-token'
import { renderDemoPdf } from '@/lib/pdf/render-demo-pdf'

// Headless Chrome needs the Node.js runtime and time to render a long page.
export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * One-click Present Mode PDF for a signed demo token.
 *
 * Public but unguessable — same HMAC token that gates /demo/<token>. Used by
 * the "Download PDF" button on the live presentation page (and later by anyone
 * with the claim-email demo link). Renders /demo/<token>?pdf=1&capture=1.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params
  const verified = verifyDemoToken(token)
  if (!verified.ok) {
    const status = verified.reason === 'expired' ? 410 : 404
    return NextResponse.json({ error: 'Invalid or expired demo link' }, { status })
  }

  const preset = request.nextUrl.searchParams.get('preset') || ''
  const presetQ = ['food', 'services', 'general'].includes(preset)
    ? `&preset=${preset}`
    : ''

  const supabase = createAdminClient()
  const { data: biz } = await supabase
    .from('business_profiles')
    .select('id, business_name')
    .eq('id', verified.businessId)
    .maybeSingle()

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const base = host ? `${proto}://${host}` : request.nextUrl.origin
  const demoUrl = `${base}/demo/${token}?pdf=1&capture=1${presetQ}`

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
    console.error('demo-pdf: render failed', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not generate PDF' },
      { status: 500 }
    )
  }
}
