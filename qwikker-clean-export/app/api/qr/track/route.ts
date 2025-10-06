import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const body = await request.json()
    
    const {
      qr_code_id,
      business_id,
      user_id,
      scan_type = 'direct',
      device_info,
      location_info
    } = body

    // Get user's IP address and user agent
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Determine device type from user agent
    const getDeviceType = (ua: string): string => {
      if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
      if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
      return 'desktop'
    }

    // Determine if this is a new user or existing user
    const conversionType = user_id ? 'existing_user' : 'new_user'

    // Record the QR scan analytics
    const { error: analyticsError } = await supabase
      .from('qr_code_analytics')
      .insert({
        qr_code_id,
        business_id,
        user_id: user_id || null,
        scan_timestamp: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ip,
        device_type: getDeviceType(userAgent),
        conversion_type: conversionType,
        city: device_info?.city || 'unknown',
        target_reached: false, // Will be updated when user reaches target
        session_duration: 0 // Will be updated when session ends
      })

    if (analyticsError) {
      console.error('Error recording QR analytics:', analyticsError)
      // Don't fail the request if analytics fails
    }

    // Get the QR code assignment to determine redirect
    const { data: assignment, error: assignmentError } = await supabase
      .from('qr_code_assignments')
      .select(`
        *,
        qr_code_templates (
          qr_type,
          city,
          base_url
        ),
        business_profiles (
          slug,
          business_name,
          status
        )
      `)
      .eq('qr_code_id', qr_code_id)
      .eq('is_active', true)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json({ 
        success: false, 
        error: 'QR code not found or inactive',
        redirect_url: '/user/dashboard?ref=qr_inactive'
      })
    }

    // Check if business is still approved
    if (assignment.business_profiles.status !== 'approved') {
      return NextResponse.json({
        success: false,
        error: 'Business not available',
        redirect_url: `/user/dashboard?ref=qr_unavailable&business=${assignment.business_profiles.business_name}`
      })
    }

    // Generate the appropriate redirect URL based on QR type
    const businessSlug = assignment.business_profiles.slug
    const city = assignment.qr_code_templates.city
    const baseUrl = `https://${city}.qwikker.com`

    let redirectUrl = ''
    
    switch (assignment.qr_code_templates.qr_type) {
      case 'explore':
        redirectUrl = `${baseUrl}/user/discover?highlight=${businessSlug}&ref=qr&qr_id=${qr_code_id}`
        break
      case 'offers':
        if (assignment.target_content_id) {
          redirectUrl = `${baseUrl}/user/offers?highlight=${assignment.target_content_id}&business=${businessSlug}&ref=qr&qr_id=${qr_code_id}`
        } else {
          redirectUrl = `${baseUrl}/user/offers?business=${businessSlug}&ref=qr&qr_id=${qr_code_id}`
        }
        break
      case 'secret_menu':
        redirectUrl = `${baseUrl}/user/secret-menu?business=${businessSlug}&ref=qr&qr_id=${qr_code_id}`
        break
      case 'general':
      default:
        redirectUrl = `${baseUrl}/user/dashboard?business=${businessSlug}&ref=qr&qr_id=${qr_code_id}`
        break
    }

    // If user doesn't exist, store intent for deferred deep linking
    if (!user_id) {
      const sessionId = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await supabase
        .from('intent_queue')
        .insert({
          user_identifier: sessionId,
          intent_type: assignment.qr_code_templates.qr_type,
          business_id: assignment.business_id,
          target_content_id: assignment.target_content_id,
          qr_code_id: qr_code_id,
          payload: {
            business_name: assignment.business_profiles.business_name,
            business_slug: businessSlug,
            original_redirect: redirectUrl,
            city: city
          }
        })

      // Redirect to wallet pass creation with intent tracking
      redirectUrl = `${baseUrl}/join?intent=${sessionId}&ref=qr&business=${assignment.business_profiles.business_name}`
    }

    return NextResponse.json({
      success: true,
      redirect_url: redirectUrl,
      business_name: assignment.business_profiles.business_name,
      qr_type: assignment.qr_code_templates.qr_type,
      tracking_id: qr_code_id
    })

  } catch (error) {
    console.error('Error processing QR scan:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update analytics when user reaches target
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })
    const body = await request.json()
    
    const { qr_code_id, user_id, target_reached = true, session_duration } = body

    // Update the most recent analytics record for this QR code and user
    const { error } = await supabase
      .from('qr_code_analytics')
      .update({
        target_reached,
        session_duration: session_duration || 0
      })
      .eq('qr_code_id', qr_code_id)
      .eq('user_id', user_id)
      .order('scan_timestamp', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error updating QR analytics:', error)
      return NextResponse.json({ success: false, error: 'Failed to update analytics' })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating QR analytics:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
