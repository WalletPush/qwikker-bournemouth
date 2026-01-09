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
      .select('id, business_name, status')
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

    // Send verification email using Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await resend.emails.send({
        from: 'QWIKKER <noreply@qwikker.com>',
        to: email,
        subject: `Your QWIKKER Verification Code: ${verificationCode}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">QWIKKER</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">Verify Your Business Claim</h2>
                
                <p>You're claiming <strong>${business.business_name}</strong> on QWIKKER.</p>
                
                <p>Your 6-digit verification code is:</p>
                
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea;">${verificationCode}</span>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  ⏱️ This code expires in 15 minutes.<br>
                  🔒 Don't share this code with anyone.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  If you didn't request this code, please ignore this email or contact us if you have concerns.
                </p>
              </div>
            </body>
          </html>
        `
      })

      console.log(`✅ Verification email sent to ${email} for business claim`)
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

