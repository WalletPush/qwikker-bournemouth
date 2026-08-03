import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createPartnerHoldExpiredEmail } from '@/lib/email/templates/partner-emails'
import { Resend } from 'resend'
import { sendWithRetry } from '@/lib/email/send-franchise-email'
import { writeClaimAudit } from '@/lib/partners/claim-transitions'

/**
 * Expire held partner claims past expires_at.
 * Protect with CRON_SECRET or PARTNERS_CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PARTNERS_CRON_SECRET || process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  const { data: expiredHolds, error } = await supabase
    .from('partner_claims')
    .select('id, full_name, email, city_name, status')
    .eq('status', 'held')
    .lt('expires_at', now)

  if (error) {
    console.error('Expire query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  let expired = 0
  const resendApiKey = process.env.RESEND_API_KEY
  const resendClient = resendApiKey ? new Resend(resendApiKey) : null
  const fromAddress = process.env.EMAIL_FROM || 'QWIKKER <no-reply@qwikker.com>'

  for (const claim of expiredHolds || []) {
    const { error: updErr } = await supabase
      .from('partner_claims')
      .update({ status: 'expired', updated_at: now })
      .eq('id', claim.id)
      .eq('status', 'held')

    if (updErr) {
      console.error('Failed to expire claim', claim.id, updErr)
      continue
    }

    await writeClaimAudit({
      claimId: claim.id,
      actor: 'cron',
      fromStatus: 'held',
      toStatus: 'expired',
      note: 'Hold expired by scheduled job',
    })

    await supabase
      .from('partner_markets')
      .update({ status: 'available', updated_at: now })
      .eq('city_slug', claim.city_slug || '')
      .eq('tier', 'partner')
      .neq('status', 'owned')

    expired += 1

    if (resendClient) {
      try {
        const template = createPartnerHoldExpiredEmail({
          full_name: claim.full_name,
          city_name: claim.city_name,
        })
        await sendWithRetry(resendClient, {
          from: fromAddress,
          to: claim.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: [
            { name: 'service', value: 'qwikker' },
            { name: 'type', value: 'partner-hold-expired' },
          ],
        })
      } catch (err) {
        console.error('Expiry email failed', claim.id, err)
      }
    }
  }

  return NextResponse.json({ success: true, expired })
}
