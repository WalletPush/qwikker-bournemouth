import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const qrCode = params.code
    
    // Create Supabase client with service role (bypass RLS for scan tracking)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 1. Get QR code from database
    const { data: qr, error } = await supabase
      .from('qr_codes')
      .select('id, qr_code, current_target_url, status, city')
      .eq('qr_code', qrCode)
      .eq('status', 'active')
      .single()

    if (error || !qr) {
      console.error('QR code not found:', qrCode)
      // Redirect to homepage if QR not found
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bournemouth.qwikker.com'}/discover`)
    }

    // 2. Extract scan metadata
    const userAgent = request.headers.get('user-agent') || ''
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || ''
    const referrer = request.headers.get('referer') || ''
    
    // Parse device type from user agent
    let deviceType = 'desktop'
    if (/mobile/i.test(userAgent)) deviceType = 'mobile'
    if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet'

    // Parse browser
    let browser = 'unknown'
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    // Parse OS
    let os = 'unknown'
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'MacOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    // 3. Record the scan (trigger will auto-update analytics)
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
        scanned_at: new Date().toISOString()
      })

    if (scanError) {
      console.error('Failed to record scan:', scanError)
      // Still redirect even if tracking fails
    }

    console.log(`✅ QR Scan tracked: ${qrCode} → ${qr.current_target_url}`)

    // 4. Redirect to target URL
    return NextResponse.redirect(qr.current_target_url)

  } catch (error) {
    console.error('QR scan error:', error)
    // Fallback redirect
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bournemouth.qwikker.com'}/discover`)
  }
}

