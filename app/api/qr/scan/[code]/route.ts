import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bournemouth.qwikker.com'

  try {
    const qrCode = params.code
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: qr, error } = await supabase
      .from('qr_codes')
      .select('id, qr_code, current_target_url, status, city')
      .eq('qr_code', qrCode)
      .eq('status', 'active')
      .single()

    if (error || !qr) {
      console.error('QR code not found:', qrCode)
      return NextResponse.redirect(`${baseUrl}/`)
    }

    // Extract UTM params from the scanned URL
    const utmSource = request.nextUrl.searchParams.get('utm_source') || null
    const utmMedium = request.nextUrl.searchParams.get('utm_medium') || null
    const utmCampaign = request.nextUrl.searchParams.get('utm_campaign') || null

    // Read wallet pass cookie if present
    const walletPassId = request.cookies.get('qwikker_wallet_pass_id')?.value || null

    // Extract scan metadata
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const referrer = request.headers.get('referer') || ''
    
    let deviceType = 'desktop'
    if (/mobile/i.test(userAgent)) deviceType = 'mobile'
    if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet'

    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    let os = 'unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'MacOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    // Record the scan (trigger auto-updates qr_codes.total_scans + daily analytics)
    const { error: scanError } = await supabase
      .from('qr_code_scans')
      .insert({
        qr_code_id: qr.id,
        qr_code: qr.qr_code,
        user_agent: userAgent,
        ip_address: ip,
        city: qr.city,
        referrer: referrer,
        device_type: deviceType,
        browser: browser,
        os: os,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        wallet_pass_id: walletPassId,
        scanned_at: new Date().toISOString()
      })

    if (scanError) {
      console.error('Failed to record scan:', scanError)
    }

    // Pass gate: if target is a /user/* page and user has no wallet pass, 
    // route through /join first so they install the pass, then redirect to content
    const targetUrl = new URL(qr.current_target_url)
    const isUserPage = targetUrl.pathname.startsWith('/user/')
    
    if (isUserPage && !walletPassId) {
      const joinUrl = new URL('/join', `https://${qr.city}.qwikker.com`)
      joinUrl.searchParams.set('returnTo', targetUrl.pathname + targetUrl.search)
      return NextResponse.redirect(joinUrl.toString())
    }

    return NextResponse.redirect(qr.current_target_url)

  } catch (error) {
    console.error('QR scan error:', error)
    return NextResponse.redirect(`${baseUrl}/`)
  }
}

