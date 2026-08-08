import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordEmailEvent, updateEmailSendStatus, logEmailSend } from '@/lib/email/email-logger'
import { suppressEmail } from '@/lib/email/suppressions'
import { verifyResendWebhookSignature } from '@/lib/email/verify-resend-webhook'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * Resend webhook — delivery / bounce / open / click / complained / received.
 * Per city: https://{city}.qwikker.com/api/webhooks/resend
 * Signing secret: franchise_crm_configs.resend_webhook_secret (City Configuration)
 */

function cityFromEmail(address?: string | null): string | null {
  if (!address) return null
  const m = address.toLowerCase().match(/@([a-z0-9-]+)\.qwikker\.com/)
  return m?.[1] || null
}

function mapEventToStatus(type: string): string | null {
  switch (type) {
    case 'email.delivered':
      return 'delivered'
    case 'email.opened':
      return 'opened'
    case 'email.clicked':
      return 'clicked'
    case 'email.bounced':
      return 'bounced'
    case 'email.complained':
      return 'complained'
    case 'email.failed':
      return 'failed'
    case 'email.received':
      return 'received'
    default:
      return null
  }
}

async function loadCityResendSecrets(city: string): Promise<{
  webhookSecret: string | null
  apiKey: string | null
}> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('franchise_crm_configs')
    .select('resend_webhook_secret, resend_api_key')
    .eq('city', city.toLowerCase())
    .maybeSingle()
  return {
    webhookSecret: data?.resend_webhook_secret || process.env.RESEND_WEBHOOK_SECRET || null,
    apiKey: data?.resend_api_key || process.env.RESEND_API_KEY || null,
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const hostname = request.headers.get('host') || ''
  let hostCity: string | null = null
  try {
    hostCity = (await getCityFromHostname(hostname)).toLowerCase()
  } catch {
    hostCity = null
  }

  // Prefer city from hostname (tenant isolation for webhook URL)
  const secrets = hostCity ? await loadCityResendSecrets(hostCity) : { webhookSecret: null, apiKey: null }

  if (secrets.webhookSecret) {
    const ok = verifyResendWebhookSignature({
      rawBody,
      svixId: request.headers.get('svix-id') || '',
      svixTimestamp: request.headers.get('svix-timestamp') || '',
      svixSignature: request.headers.get('svix-signature') || '',
      secret: secrets.webhookSecret,
    })
    if (!ok) {
      console.warn('[resend-webhook] signature verification failed', hostCity)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    console.warn(
      '[resend-webhook] no resend_webhook_secret for city — accepting unverified',
      hostCity || hostname
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = String(payload.type || '')
  const data = (payload.data || {}) as Record<string, unknown>
  const emailId =
    (data.email_id as string) ||
    (data.id as string) ||
    ((data.email as { id?: string } | undefined)?.id) ||
    null

  const tags = (data.tags as Array<{ name?: string; value?: string }> | Record<string, string>) || []
  let city: string | null = hostCity
  if (Array.isArray(tags)) {
    city = city || tags.find((t) => t.name === 'city')?.value?.toLowerCase() || null
  } else if (tags && typeof tags === 'object') {
    city = city || (tags.city || '').toLowerCase() || null
  }

  const toList = (data.to as string[] | string | undefined) || []
  const from = (data.from as string) || null
  const toFirst = Array.isArray(toList) ? toList[0] : toList
  city = city || cityFromEmail(from) || cityFromEmail(toFirst)

  if (!city) {
    console.warn('[resend-webhook] could not resolve city', type, emailId)
    return NextResponse.json({ ok: true, ignored: true, reason: 'no_city' })
  }

  // If host city known, refuse cross-tenant payload city mismatch
  if (hostCity && city !== hostCity) {
    console.warn('[resend-webhook] city mismatch', { hostCity, city, type })
    return NextResponse.json({ error: 'City mismatch' }, { status: 403 })
  }

  const status = mapEventToStatus(type)
  let emailSendId: string | null = null

  if (type === 'email.received') {
    let subject = String(data.subject || '(no subject)')
    let html = (data.html as string) || null
    let text = (data.text as string) || null

    // Prefer full body from Receiving API when SDK/key available
    if (emailId && secrets.apiKey) {
      try {
        const resend = new Resend(secrets.apiKey)
        const receiving = (resend as unknown as { emails: { receiving?: { get: (id: string) => Promise<{ data?: { html?: string; text?: string; subject?: string } }> } } }).emails.receiving
        if (receiving?.get) {
          const { data: full } = await receiving.get(emailId)
          if (full) {
            html = full.html || html
            text = full.text || text
            if (full.subject) subject = full.subject
          }
        }
      } catch (e) {
        console.warn('[resend-webhook] receiving.get failed', e)
      }
    }

    const fromAddr = String(from || 'unknown')
    const supabase = createAdminClient()
    const { data: prior } = await supabase
      .from('email_sends')
      .select('id, business_id, thread_id')
      .eq('city', city)
      .eq('direction', 'outbound')
      .ilike('to_email', fromAddr)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const threadId = prior?.thread_id || prior?.id || null
    emailSendId = await logEmailSend({
      city,
      toEmail: String(toFirst || `hello@${city}.qwikker.com`),
      fromEmail: fromAddr,
      subject,
      htmlBody: html,
      textBody: text,
      templateKey: 'inbound',
      category: 'system',
      resendMessageId: emailId,
      status: 'received',
      businessId: prior?.business_id || null,
      direction: 'inbound',
      threadId: threadId || undefined,
      inReplyToSendId: prior?.id || null,
      metadata: { resend_event: type },
    })

    if (emailSendId && !threadId) {
      await supabase.from('email_sends').update({ thread_id: emailSendId }).eq('id', emailSendId)
    }
  } else if (status && emailId) {
    emailSendId = await updateEmailSendStatus({
      resendMessageId: emailId,
      status,
      city,
    })
  }

  await recordEmailEvent({
    city,
    emailSendId,
    resendMessageId: emailId,
    eventType: type || 'unknown',
    payload: {
      created_at: (data.created_at as string) || new Date().toISOString(),
      ...data,
    },
  })

  if (type === 'email.complained' && toFirst) {
    await suppressEmail({
      city,
      email: String(Array.isArray(toList) ? toList[0] : toList),
      scope: 'all_marketing',
      reason: 'resend_complaint',
      sourceSendId: emailSendId,
    })
  }

  return NextResponse.json({ ok: true })
}
