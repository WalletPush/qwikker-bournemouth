import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  recordOutreachLinkClick,
  type OutreachLinkType,
} from '@/lib/listing-engine/outreach-tracked-links'

/**
 * Public tracked redirect for claim-invite CTAs.
 * GET /r/{code} → log click → 302 to stored target_url.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const fallback = process.env.NEXT_PUBLIC_BASE_URL || 'https://bournemouth.qwikker.com'

  try {
    const { code } = await params
    if (!code || code.length < 6 || code.length > 64) {
      return NextResponse.redirect(new URL('/', fallback).toString())
    }

    const supabase = createServiceRoleClient()
    const { data: link, error } = await supabase
      .from('outreach_tracked_links')
      .select('id, business_id, city, link_type, target_url, click_count')
      .eq('code', code)
      .maybeSingle()

    if (error || !link?.target_url) {
      console.error('[outreach-r] link not found:', code, error?.message)
      return NextResponse.redirect(new URL('/', fallback).toString())
    }

    const userAgent = request.headers.get('user-agent') || ''
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      ''

    let deviceType = 'desktop'
    if (/mobile/i.test(userAgent)) deviceType = 'mobile'
    if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet'

    try {
      await recordOutreachLinkClick(
        supabase,
        {
          id: link.id,
          business_id: link.business_id,
          city: link.city,
          link_type: link.link_type as OutreachLinkType,
          click_count: link.click_count,
        },
        { userAgent, ipAddress: ip, deviceType }
      )
    } catch (logErr) {
      console.error('[outreach-r] click log failed (still redirecting):', logErr)
    }

    return NextResponse.redirect(link.target_url, 302)
  } catch (err) {
    console.error('[outreach-r] unexpected error:', err)
    return NextResponse.redirect(new URL('/', fallback).toString())
  }
}
