import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createAnonClient } from '@/lib/supabase/anon'
import { isValidShortCode } from '@/lib/utils/short-code'
import { createHash } from 'crypto'

/**
 * Click Tracking Redirect Endpoint (Short Code Version)
 * 
 * Cookie-free identity resolution using short codes.
 * 
 * URL Format: /n/{notifCode}?r={recipientCode}
 * Example: /n/x5k9m2p8?r=a7b3c1d6e9
 * 
 * Flow:
 * 1. Look up notification by short_code
 * 2. Look up recipient by short_code (verify belongs to notification)
 * 3. Get wallet_pass_id from recipient (identity without cookies!)
 * 4. Build final destination with ?wallet_pass_id={wallet_pass_id}
 * 5. Log click (anon insert)
 * 6. Redirect to final destination
 * 
 * GET /n/[id]?r={recipientCode}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: notifCode } = await params
  
  // SECURITY: Use service role for reads (public endpoint, no session)
  const supabaseAdmin = createServiceRoleClient()

  // 1. VALIDATE NOTIFICATION SHORT CODE (FIX #2: flexible length range)
  if (!isValidShortCode(notifCode, 6, 12)) {
    console.warn(`Invalid notification code format: ${notifCode}`)
    return NextResponse.redirect(new URL('/', request.url), { status: 302 })
  }

  // 2. EXTRACT RECIPIENT SHORT CODE FROM QUERY PARAM (FIX #2: flexible range 8-14)
  const { searchParams } = new URL(request.url)
  const recipientCode = searchParams.get('r')
  
  if (!recipientCode || !isValidShortCode(recipientCode, 8, 14)) {
    console.warn(`Missing or invalid recipient code: ${recipientCode}`)
    return NextResponse.redirect(new URL('/', request.url), { status: 302 })
  }

  // 3. FETCH NOTIFICATION BY SHORT CODE
  const { data: notification, error: notifError } = await supabaseAdmin
    .from('push_notifications')
    .select('id, destination_url, city, short_code')
    .eq('short_code', notifCode)
    .single()

  if (notifError || !notification) {
    console.warn(`Notification not found for code: ${notifCode}`)
    // FIX: Fallback to root (no city known yet)
    return NextResponse.redirect(new URL('/', request.url), { status: 302 })
  }

  // 4. FETCH RECIPIENT BY SHORT CODE (verify belongs to this notification)
  const { data: recipient, error: recipientError } = await supabaseAdmin
    .from('push_notification_recipients')
    .select('id, wallet_pass_id, push_notification_id, short_code')
    .eq('short_code', recipientCode)
    .eq('push_notification_id', notification.id) // ✅ Security: verify recipient belongs to notification
    .single()

  if (recipientError || !recipient) {
    console.warn(`Recipient not found or mismatched: ${recipientCode} for notification ${notifCode}`)
    // FIX: Don't hardcode city fallback (multi-tenant footgun)
    // If city exists, redirect there. Otherwise stay on current host.
    const fallbackUrl = notification?.city
      ? new URL(`https://${notification.city}.qwikker.com/user`)
      : new URL('/user', request.url) // Stay on current host (safe)
    return NextResponse.redirect(fallbackUrl, { status: 302 })
  }

  // 5. BUILD FINAL DESTINATION (append wallet_pass_id for user context)
  // Note: destination_url is already validated (allowlist) at send time
  const separator = notification.destination_url.includes('?') ? '&' : '?'
  const finalDestination = `${notification.destination_url}${separator}wallet_pass_id=${recipient.wallet_pass_id}`

  // FIX: Don't log wallet_pass_id (privacy)
  console.log(`✅ Redirect: ${notifCode}/${recipientCode} → destination`)

  // 6. ANTI-ABUSE: CLICK RATE LIMITING (10s throttle per IP per notification)
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const rawIp = forwardedFor 
    ? forwardedFor.split(',')[0].trim()
    : realIp
  
  const ipHash = rawIp 
    ? createHash('sha256').update(rawIp).digest('hex').substring(0, 16)
    : null

  if (ipHash) {
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString()
    
    const { data: recentClick } = await supabaseAdmin
      .from('push_notification_clicks')
      .select('id')
      .eq('push_notification_id', notification.id)
      .eq('ip_hash', ipHash)
      .gte('clicked_at', tenSecondsAgo)
      .limit(1)
      .maybeSingle()

    if (recentClick) {
      // Same IP clicked recently - still redirect but don't log again
      return NextResponse.redirect(finalDestination, { status: 302 })
    }
  }

  // 7. LOG CLICK EVENT (anon client for public insert)
  const supabaseAnon = createAnonClient()
  
  const userAgent = request.headers.get('user-agent')?.substring(0, 500) || null
  const referrer = request.headers.get('referer')?.substring(0, 500) || null
  
  try {
    await supabaseAnon
      .from('push_notification_clicks')
      .insert({
        push_notification_id: notification.id,
        wallet_pass_id: recipient.wallet_pass_id, // ✅ Now we know the user (no cookies needed!)
        user_agent: userAgent,
        ip_hash: ipHash,
        referrer: referrer
      })
    
    console.log(`✅ Click logged: ${notifCode} → user tracked`)
  } catch (err) {
    console.error('Failed to log click:', err)
    // Don't block redirect on logging failure
  }

  // 8. REDIRECT TO FINAL DESTINATION (with user identity)
  return NextResponse.redirect(finalDestination, { status: 302 })
}
