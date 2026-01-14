import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, businessId } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use first business if no businessId provided
    const supabase = createAdminClient()
    
    let business
    if (businessId) {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single()
      business = data
    } else {
      const { data } = await supabase
        .from('business_profiles')
        .select('*')
        .limit(1)
        .single()
      business = data
    }

    if (!business) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 })
    }

    // Get franchise config for the business's city
    const { data: franchiseConfig } = await supabase
      .from('franchise_crm_configs')
      .select('*')
      .eq('city', business.city)
      .single()

    if (!franchiseConfig || !franchiseConfig.resend_api_key) {
      return NextResponse.json({ 
        error: `No Resend API key configured for city: ${business.city}` 
      }, { status: 400 })
    }

    // Generate test verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Send test email
    const { Resend } = await import('resend')
    const { escapeHtml } = await import('@/lib/utils/escape-html')
    const resend = new Resend(franchiseConfig.resend_api_key)

    const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
    const cityDisplayName = franchiseConfig.display_name || business.city
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${business.city}.qwikker.com`
    
    // Use Cloudinary URL for logo (publicly accessible in emails)
    const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                    `https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg`

    const safeBusinessName = escapeHtml(business.business_name)
    const safeCityName = escapeHtml(cityDisplayName)

    const resendResponse = await resend.emails.send({
      from: `${fromName} <${franchiseConfig.resend_from_email}>`,
      to: email,
      subject: `🧪 TEST: QWIKKER Email Logo Test`,
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
              <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #0a0a0a;">
                🧪 Email Logo Test
              </h1>
              
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">
                This is a test email to verify the QWIKKER logo displays correctly in your email client.
              </p>
              
              <div style="background: #f3f4f6; border-left: 4px solid #00d083; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  <strong>Test Details:</strong><br>
                  Business: ${safeBusinessName}<br>
                  City: ${safeCityName}<br>
                  Logo URL: ${escapeHtml(logoUrl)}<br>
                  Test Code: ${verificationCode}
                </p>
              </div>
              
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
                <strong>If you can see the QWIKKER logo above, the email configuration is working correctly!</strong>
              </p>
              
              <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
                Test sent from: ${baseUrl}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is a test email from QWIKKER ${safeCityName}
              </p>
            </div>
          </body>
        </html>
      `
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        emailId: resendResponse.data?.id,
        to: email,
        logoUrl,
        businessName: business.business_name,
        city: business.city
      }
    })

  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to send test email',
        details: error.response?.body || error.toString()
      },
      { status: 500 }
    )
  }
}

