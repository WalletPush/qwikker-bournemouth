import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/contact-business
 * Send custom email to business claimer
 */
export async function POST(request: NextRequest) {
  try {
    const { claimId, email, businessName, userName, customMessage, city } = await request.json()

    if (!claimId || !email || !businessName || !customMessage || !city) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get franchise Resend config
    const { data: franchiseConfig } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name, display_name')
      .eq('city', city)
      .single()

    if (!franchiseConfig?.resend_api_key || !franchiseConfig?.resend_from_email) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured'
      }, { status: 500 })
    }

    // Send email
    const { Resend } = await import('resend')
    const resend = new Resend(franchiseConfig.resend_api_key)

    const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
    const cityDisplayName = franchiseConfig.display_name || city.charAt(0).toUpperCase() + city.slice(1)
    const subject = `Regarding your QWIKKER claim: ${businessName}`
    
    // Build the full email message
    const fullMessage = `Hi ${userName},\n\nThank you for claiming ${businessName} on QWIKKER.\n\n${customMessage}\n\nBest regards,\nThe ${cityDisplayName} Team`

    await resend.emails.send({
      from: `${fromName} <${franchiseConfig.resend_from_email}>`,
      to: email,
      replyTo: franchiseConfig.resend_from_email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px;">QWIKKER</h1>
            </div>
            
            <!-- Body -->
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; margin-top: 0; line-height: 1.6;">${fullMessage.replace(/\n/g, '<br>')}</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Questions? Reply to this email or contact us at <a href="mailto:${franchiseConfig.resend_from_email}" style="color: #667eea; text-decoration: none;">${franchiseConfig.resend_from_email}</a>
              </p>
            </div>
          </body>
        </html>
      `
    })

    console.log(`Contact email sent to ${email}`)

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    })

  } catch (error: any) {
    console.error('Contact business error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send email'
    }, { status: 500 })
  }
}

