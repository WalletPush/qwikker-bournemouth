import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Send email verification code for claim
 * POST /api/claim/send-verification
 * Body: { email: string, businessId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, businessId } = await request.json()

    if (!email || !businessId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and business ID are required' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid email format' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify business exists and is unclaimed
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name, status, city')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        success: false, 
        error: 'Business not found' 
      }, { status: 404 })
    }

    if (business.status !== 'unclaimed') {
      return NextResponse.json({ 
        success: false, 
        error: 'This business has already been claimed or is not available for claiming' 
      }, { status: 400 })
    }

    // Get franchise config for this city (multi-tenant email support)
    const { data: franchiseConfig, error: configError } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name, display_name')
      .eq('city', business.city)
      .single()

    if (configError || !franchiseConfig) {
      console.error('Franchise config not found for city:', business.city)
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured for this location. Please contact support.' 
      }, { status: 500 })
    }

    // Check if Resend is configured for this franchise
    if (!franchiseConfig.resend_api_key || !franchiseConfig.resend_from_email) {
      console.error('Resend not configured for city:', business.city)
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not set up for this location. Please contact your franchise admin.' 
      }, { status: 500 })
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store verification code in database (or use a temp table/cache)
    // For now, we'll store it in a verification_codes table
    const { error: storeError } = await supabase
      .from('verification_codes')
      .upsert({
        email: email.toLowerCase(),
        code: verificationCode,
        type: 'business_claim',
        business_id: businessId,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email,type'
      })

    if (storeError) {
      console.error('Error storing verification code:', storeError)
      // Continue anyway - we'll log but not fail
    }

    // Send verification email using franchise's Resend API key (multi-tenant)
    try {
      const { Resend } = await import('resend')
      const { escapeHtml } = await import('@/lib/utils/escape-html')
      const resend = new Resend(franchiseConfig.resend_api_key)

      const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
      const cityDisplayName = franchiseConfig.display_name || business.city
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${business.city}.qwikker.com`
      
      // Use Cloudinary URL for logo (publicly accessible in emails)
      // TODO: Replace with your actual Cloudinary logo URL once uploaded
      const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                      `https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg` // Placeholder - replace with your actual Cloudinary URL

      const resendResponse = await resend.emails.send({
        from: `${fromName} <${franchiseConfig.resend_from_email}>`,
        to: email,
        subject: `Verify your QWIKKER claim: ${verificationCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0a0a0a; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
              
              <!-- Header with dark background for white logo -->
              <div style="padding: 40px 30px 30px; text-align: center; background-color: #0a0a0a; border-bottom: 1px solid #e5e7eb;">
                <img 
                  src="${logoUrl}" 
                  alt="QWIKKER" 
                  width="160"
                  style="display: block; height: 32px; width: auto; margin: 0 auto; border: 0;"
                />
              </div>
              
              <!-- Body -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #0a0a0a; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">
                  Verify your email
                </h2>
                
                <p style="color: #525252; margin: 0 0 24px 0; font-size: 15px;">
                  You're claiming <strong style="color: #0a0a0a;">${escapeHtml(business.business_name)}</strong> on QWIKKER ${escapeHtml(cityDisplayName)}.
                </p>
                
                <p style="color: #525252; margin: 0 0 16px 0; font-size: 15px;">
                  Enter this verification code:
                </p>
                
                <!-- Code Box -->
                <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                  <span style="font-size: 36px; font-weight: 600; letter-spacing: 6px; color: #0a0a0a; font-family: 'SF Mono', Monaco, monospace;">
                    ${verificationCode}
                  </span>
                </div>
                
                <!-- Info -->
                <div style="background: #fafafa; border-left: 3px solid #00d083; border-radius: 4px; padding: 16px 20px; margin: 0 0 32px 0;">
                  <p style="color: #525252; margin: 0; font-size: 14px;">
                    This code expires in <strong style="color: #0a0a0a;">15 minutes</strong>. Don't share it with anyone.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="padding: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #a3a3a3; font-size: 13px; margin: 0;">
                  If you didn't request this code, you can safely ignore this email.
                </p>
                <p style="color: #a3a3a3; font-size: 13px; margin: 8px 0 0 0;">
                  QWIKKER ${escapeHtml(cityDisplayName)}
                </p>
              </div>
              
            </body>
          </html>
        `
      })

      console.log('📧 Resend API Response:', JSON.stringify(resendResponse, null, 2))
      
      if (resendResponse.error) {
        console.error('🚨 Resend returned an error:', resendResponse.error)
        return NextResponse.json({ 
          success: false, 
          error: `Email service error: ${resendResponse.error.message || 'Unknown error'}` 
        }, { status: 500 })
      }

      console.log(`✅ Verification email sent to ${email} (ID: ${resendResponse.data?.id}) for business claim`)
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send verification email. Please try again.' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 15 * 60 // seconds
    })

  } catch (error: any) {
    console.error('Send verification error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

