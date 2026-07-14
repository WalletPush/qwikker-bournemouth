'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { escapeHtml } from '@/lib/utils/escape-html'
import { headers } from 'next/headers'

/**
 * Sends a per-city branded password-reset email via the franchise's Resend key.
 *
 * We generate the recovery token server-side (admin.generateLink) and build our
 * own /auth/confirm?token_hash=... link. This uses the OTP flow (verifyOtp),
 * which — unlike the PKCE code flow — does NOT need a code-verifier cookie, so
 * the reset works even if the owner opens the email on a different device.
 *
 * SECURITY: always returns { success: true } regardless of whether the account
 * exists, so the form can't be used to enumerate registered emails.
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean }> {
  try {
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: true }
    }

    const headersList = await headers()
    const hostname = headersList.get('host') || ''
    const city = await getCityFromHostname(hostname)

    const protocol = hostname.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${hostname}`

    const supabase = createServiceRoleClient()

    // Generate a recovery token for this email (no-op link; we only need the token_hash).
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
    })

    // Don't reveal whether the account exists — just return success either way.
    if (error || !data?.properties?.hashed_token) {
      console.warn(`Password reset: no link generated for ${normalizedEmail} (${error?.message || 'no user'})`)
      return { success: true }
    }

    const tokenHash = data.properties.hashed_token
    const resetUrl = `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=${encodeURIComponent('/auth/update-password')}`

    const logoUrl =
      process.env.CLOUDINARY_LOGO_URL ||
      'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0a0a0a; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
          <div style="padding: 40px 30px 30px; text-align: center; background-color: #0a0a0a; border-bottom: 1px solid #e5e7eb;">
            <img src="${logoUrl}" alt="QWIKKER" width="160" style="display: block; height: 32px; width: auto; margin: 0 auto; border: 0;" />
          </div>
          <div style="padding: 40px 30px;">
            <h2 style="color: #0a0a0a; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Reset your password</h2>
            <p style="color: #525252; margin: 0 0 24px 0; font-size: 15px;">
              We received a request to reset the password for your QWIKKER account (<strong style="color: #0a0a0a;">${escapeHtml(normalizedEmail)}</strong>).
            </p>
            <div style="text-align: center; margin: 0 0 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #00d083; color: #0a0a0a; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px;">
                Reset my password
              </a>
            </div>
            <div style="background: #fafafa; border-left: 3px solid #00d083; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
              <p style="color: #525252; margin: 0; font-size: 14px;">
                This link is single-use and expires shortly. If the button doesn't work, copy and paste this URL into your browser:
              </p>
              <p style="color: #737373; margin: 8px 0 0 0; font-size: 12px; word-break: break-all;">${resetUrl}</p>
            </div>
          </div>
          <div style="padding: 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #a3a3a3; font-size: 13px; margin: 0;">
              If you didn't request this, you can safely ignore this email — your password won't change.
            </p>
          </div>
        </body>
      </html>
    `

    const result = await sendFranchiseEmail({
      city,
      to: normalizedEmail,
      template: {
        subject: 'Reset your QWIKKER password',
        html,
        text: `Reset your QWIKKER password using this link (single-use, expires shortly): ${resetUrl}`,
      },
    })

    if (!result.success) {
      console.error(`Password reset email failed for ${normalizedEmail}:`, result.error)
    }

    return { success: true }
  } catch (err) {
    console.error('sendPasswordResetEmail error:', err)
    // Still generic to avoid leaking anything to the caller.
    return { success: true }
  }
}
