import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const normalizedEmail = email.trim().toLowerCase()

    // Look up admin by email
    const { data: admin } = await supabase
      .from('city_admins')
      .select('id, email, username, city, is_active')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .single()

    // Always return success to prevent email enumeration attacks
    if (!admin) {
      console.log(`Password reset requested for unknown email: ${normalizedEmail}`)
      return NextResponse.json({ success: true })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

    // Delete any existing reset codes for this email
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', normalizedEmail)
      .eq('type', 'password_reset')

    // Insert new code
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email: normalizedEmail,
        code,
        type: 'password_reset',
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('Failed to insert verification code:', insertError)
      return NextResponse.json(
        { error: 'Failed to generate reset code' },
        { status: 500 }
      )
    }

    // Send email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      template: {
        subject: 'Qwikker Admin — Password Reset Code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #ffffff; font-size: 24px; margin: 0;">QWIKKER</h1>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Admin Password Reset</p>
            </div>
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px; text-align: center;">
              <p style="color: #e2e8f0; font-size: 16px; margin: 0 0 8px;">Your verification code is:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #ffffff; padding: 16px 0; font-family: monospace;">
                ${code}
              </div>
              <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0;">
                This code expires in 15 minutes.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px;">
              ${admin.city.charAt(0).toUpperCase() + admin.city.slice(1)} Franchise Admin
            </p>
          </div>
        `,
        text: `Your Qwikker admin password reset code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
      },
      tags: [{ name: 'type', value: 'admin-password-reset' }],
    })

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please try again.' },
        { status: 500 }
      )
    }

    console.log(`Password reset code sent to ${normalizedEmail} for city: ${admin.city}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
