import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  createPartnerEnquiryReceivedEmail,
  createPartnerHqEnquiryNotification,
} from '@/lib/email/templates/partner-emails'
import { Resend } from 'resend'
import { sendWithRetry } from '@/lib/email/send-franchise-email'
import { writeClaimAudit } from '@/lib/partners/claim-transitions'

/**
 * Idempotent email verification for partner claims.
 * GET /api/partners/verify?token=...
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token || token.length < 32) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: claim, error } = await supabase
      .from('partner_claims')
      .select('*')
      .eq('verification_token', token)
      .maybeSingle()

    // Generic responses — do not reveal whether token existed
    if (error || !claim) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    // Already verified / past submitted — idempotent success
    if (claim.status === 'email_verified' || claim.verification_consumed_at) {
      return NextResponse.json({
        success: true,
        already_verified: true,
        city_name: claim.city_name,
      })
    }

    if (claim.status !== 'submitted') {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    if (
      claim.verification_expires_at &&
      new Date(claim.verification_expires_at).getTime() < Date.now()
    ) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('partner_claims')
      .update({
        status: 'email_verified',
        verified_at: now,
        verification_consumed_at: now,
        updated_at: now,
      })
      .eq('id', claim.id)
      .eq('status', 'submitted')

    if (updateError) {
      // Race — treat as idempotent if already moved
      const { data: again } = await supabase
        .from('partner_claims')
        .select('status, city_name')
        .eq('id', claim.id)
        .single()
      if (again?.status === 'email_verified') {
        return NextResponse.json({
          success: true,
          already_verified: true,
          city_name: again.city_name,
        })
      }
      console.error('Verify update failed:', updateError)
      return NextResponse.json({ error: 'Unable to verify' }, { status: 500 })
    }

    await writeClaimAudit({
      claimId: claim.id,
      actor: 'public',
      fromStatus: 'submitted',
      toStatus: 'email_verified',
      note: 'Email verified',
    })

    // Confirmation + HQ notification (non-blocking failures)
    try {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const resendClient = new Resend(resendApiKey)
        const fromAddress = process.env.EMAIL_FROM || 'QWIKKER <no-reply@qwikker.com>'
        const toUser = createPartnerEnquiryReceivedEmail({
          full_name: claim.full_name,
          city_name: claim.city_name,
        })
        await sendWithRetry(resendClient, {
          from: fromAddress,
          to: claim.email,
          subject: toUser.subject,
          html: toUser.html,
          text: toUser.text,
          tags: [
            { name: 'service', value: 'qwikker' },
            { name: 'type', value: 'partner-enquiry' },
          ],
        })

        const hqTo = process.env.HQ_PARTNERS_NOTIFY_EMAIL || process.env.EMAIL_FROM
        if (hqTo) {
          const hqMail = createPartnerHqEnquiryNotification({
            full_name: claim.full_name,
            email: claim.email,
            city_name: claim.city_name,
            claimId: claim.id,
          })
          const hqAddress = typeof hqTo === 'string' && hqTo.includes('@')
            ? hqTo.replace(/^.*<([^>]+)>.*$/, '$1').includes('@')
              ? (hqTo.match(/<([^>]+)>/)?.[1] || hqTo)
              : hqTo
            : hqTo
          await sendWithRetry(resendClient, {
            from: fromAddress,
            to: hqAddress.includes('<') ? hqAddress.match(/<([^>]+)>/)?.[1] || hqAddress : hqAddress,
            subject: hqMail.subject,
            html: hqMail.html,
            text: hqMail.text,
            tags: [
              { name: 'service', value: 'qwikker' },
              { name: 'type', value: 'partner-hq-notify' },
            ],
          })
        }
      }
    } catch (err) {
      console.error('Post-verify email failed:', err)
    }

    // Slack (non-blocking)
    try {
      const webhookUrl = process.env.HQ_SLACK_WEBHOOK_URL || process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `:mailbox_with_mail: Verified territory enquiry: *${claim.city_name}* — ${claim.full_name}`,
          }),
        })
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json({
      success: true,
      city_name: claim.city_name,
    })
  } catch (error) {
    console.error('Partner verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
