import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/request-proof
 * Send email requesting additional proof of ownership
 */
export async function POST(request: NextRequest) {
  try {
    const { claimId, businessName, email, riskFactors } = await request.json()

    if (!claimId || !businessName || !email) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get claim details with city
    const { data: claim } = await supabase
      .from('claim_requests')
      .select('city, business_id')
      .eq('id', claimId)
      .single()

    if (!claim) {
      return NextResponse.json({
        success: false,
        error: 'Claim not found'
      }, { status: 404 })
    }

    // Get franchise Resend config
    const { data: franchiseConfig } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name, display_name')
      .eq('city', claim.city)
      .single()

    if (!franchiseConfig?.resend_api_key || !franchiseConfig?.resend_from_email) {
      return NextResponse.json({
        success: false,
        error: 'Email service not configured'
      }, { status: 500 })
    }

    // Determine which proof is needed based on risk factors
    let proofRequests: string[] = []
    if (!riskFactors.emailDomainMatch) {
      proofRequests.push('Your email domain does not match your business website. Please provide additional proof such as:<br>• A utility bill or official document showing your business address<br>• A photo of yourself inside the business<br>• Your business registration certificate')
    }
    if (riskFactors.genericEmail) {
      proofRequests.push('You\'re using a personal email address. If possible, please reply from your business email domain.')
    }

    const proofText = proofRequests.length > 0 
      ? proofRequests.join('<br><br>')
      : 'We need additional verification to approve your claim. Please provide proof of ownership such as:<br>• Business registration documents<br>• A photo of yourself at the business<br>• Official correspondence showing your business address'

    // Send email
    const { Resend } = await import('resend')
    const resend = new Resend(franchiseConfig.resend_api_key)

    const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
    const cityDisplayName = franchiseConfig.display_name || claim.city

    await resend.emails.send({
      from: `${fromName} <${franchiseConfig.resend_from_email}>`,
      to: email,
      subject: `Additional Verification Required: ${businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #475569 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Additional Verification Required</h1>
            </div>
            
            <!-- Body -->
            <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; margin-top: 0;">Hi there,</p>
              
              <p>Thank you for claiming <strong>${businessName}</strong> on QWIKKER ${cityDisplayName}.</p>
              
              <p>To complete the verification process, we need some additional proof of ownership:</p>

              <div style="background: #f1f5f9; border-left: 3px solid #64748b; padding: 15px; margin: 25px 0;">
                <p style="margin: 0; color: #334155; font-size: 15px;">${proofText}</p>
              </div>

              <h3 style="color: #1f2937; font-size: 18px; margin-top: 30px;">How to Submit Proof</h3>
              <p>Simply reply to this email with:</p>
              <ul style="color: #4b5563;">
                <li>Photos or scanned copies of the requested documents</li>
                <li>Any additional information that confirms your ownership</li>
              </ul>

              <p style="margin-top: 30px;">We'll review your submission within 24 hours and get back to you.</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                Questions? Reply to this email or contact us at <a href="mailto:${franchiseConfig.resend_from_email}" style="color: #667eea; text-decoration: none;">${franchiseConfig.resend_from_email}</a>
              </p>
            </div>
          </body>
        </html>
      `
    })

    console.log(`Proof request sent to ${email} for ${businessName}`)

    return NextResponse.json({
      success: true,
      message: 'Proof request sent successfully'
    })

  } catch (error: any) {
    console.error('Request proof error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send proof request'
    }, { status: 500 })
  }
}

