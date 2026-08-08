import { NextRequest, NextResponse } from 'next/server'
import { recordEmailEvent, updateEmailSendStatus } from '@/lib/email/email-logger'
import { suppressEmail } from '@/lib/email/suppressions'
import { verifyResendWebhookSignature } from '@/lib/email/verify-resend-webhook'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { normalizeEmailAddress } from '@/lib/email/normalize-email'
import { upsertInboundReceivedEmail } from '@/lib/email/upsert-inbound'
import { createAdminClient } from '@/lib/supabase/admin'

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

  // Receiving webhooks use data.email_id; sent-event webhooks use data.email_id too.
  // Do not fall back to unrelated nested ids for inbound — wrong id skips/corrupts rows.
  const emailId =
    (typeof data.email_id === 'string' && data.email_id) ||
    (typeof data.id === 'string' && data.id) ||
    null

  const tags = (data.tags as Array<{ name?: string; value?: string }> | Record<string, string>) || []
  let city: string | null = hostCity
  if (Array.isArray(tags)) {
    city = city || tags.find((t) => t.name === 'city')?.value?.toLowerCase() || null
  } else if (tags && typeof tags === 'object') {
    city = city || (tags.city || '').toLowerCase() || null
  }

  const toList = (data.to as string[] | string | undefined) || []
  const receivedFor = (data.received_for as string[] | string | undefined) || []
  const from = (data.from as string) || null
  const toFirst = Array.isArray(toList) ? toList[0] : toList
  const receivedForFirst = Array.isArray(receivedFor) ? receivedFor[0] : receivedFor
  // Inbound: prefer recipient address (hello@ / no-reply@ city…) over tags/from for city
  if (type === 'email.received') {
    city =
      hostCity ||
      cityFromEmail(toFirst) ||
      cityFromEmail(receivedForFirst) ||
      city ||
      cityFromEmail(from)
  } else {
    city = city || cityFromEmail(from) || cityFromEmail(toFirst)
  }

  if (!city) {
    console.warn('[resend-webhook] could not resolve city', type, emailId)
    return NextResponse.json({ ok: true, ignored: true, reason: 'no_city' })
  }

  // If host city known, refuse cross-tenant payload city mismatch (skip for received —
  // tenant is the webhook URL; payload city tags are unreliable on inbound).
  if (type !== 'email.received' && hostCity && city !== hostCity) {
    console.warn('[resend-webhook] city mismatch', { hostCity, city, type })
    return NextResponse.json({ error: 'City mismatch' }, { status: 403 })
  }
  if (type === 'email.received' && hostCity) {
    city = hostCity
  }

  const status = mapEventToStatus(type)
  let emailSendId: string | null = null

  if (type === 'email.received') {
    if (!emailId) {
      console.warn('[resend-webhook] email.received missing email_id')
    } else {
      const receivedId =
        typeof data.email_id === 'string' && data.email_id ? data.email_id : emailId
      const result = await upsertInboundReceivedEmail({
        city,
        resendEmailId: receivedId,
        fromRaw: from,
        toRaw: toFirst
          ? String(toFirst)
          : receivedForFirst
            ? String(receivedForFirst)
            : null,
        subject: typeof data.subject === 'string' ? data.subject : null,
        html: typeof data.html === 'string' ? data.html : null,
        text: typeof data.text === 'string' ? data.text : null,
        // Insert row first; body hydrate after — never drop a reply if Resend body is slow
        fetchBody: Boolean(secrets.apiKey),
        apiKey: secrets.apiKey,
      })
      emailSendId = result.emailSendId
      if (result.created) {
        console.info('[resend-webhook] inbound stored', {
          city,
          emailSendId,
          from: normalizeEmailAddress(from) || from,
          resendEmailId: receivedId,
        })
      }
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
