import { createAdminClient } from '@/lib/supabase/admin'
import { logEmailSend } from '@/lib/email/email-logger'
import { normalizeEmailAddress } from '@/lib/email/normalize-email'
import { fetchReceivedEmailContent } from '@/lib/email/fetch-received-email'

export interface UpsertInboundInput {
  city: string
  resendEmailId: string
  fromRaw: string | null
  toRaw?: string | null
  subject?: string | null
  html?: string | null
  text?: string | null
  /** Fetch body after insert (never blocks creating the Inbox row). */
  fetchBody?: boolean
  apiKey?: string | null
}

export interface UpsertInboundResult {
  emailSendId: string | null
  created: boolean
  skippedDuplicate: boolean
}

/**
 * Insert one inbound email_sends row for a Resend receiving id (idempotent).
 *
 * Critical: always insert the row from webhook metadata FIRST, then hydrate
 * the body. If body fetch is slow/fails, the reply still appears in Inbox.
 */
export async function upsertInboundReceivedEmail(
  input: UpsertInboundInput
): Promise<UpsertInboundResult> {
  const city = input.city.toLowerCase()
  const resendEmailId = input.resendEmailId
  if (!resendEmailId) {
    return { emailSendId: null, created: false, skippedDuplicate: false }
  }

  const supabase = createAdminClient()

  const { data: existingInbound } = await supabase
    .from('email_sends')
    .select('id, html_body, text_body')
    .eq('city', city)
    .eq('direction', 'inbound')
    .eq('resend_message_id', resendEmailId)
    .maybeSingle()

  if (existingInbound?.id) {
    const needsBody = !existingInbound.html_body && !existingInbound.text_body
    if (needsBody && input.fetchBody && input.apiKey) {
      await hydrateInboundBody(supabase, existingInbound.id, city, resendEmailId, input.apiKey)
    }
    return {
      emailSendId: existingInbound.id,
      created: false,
      skippedDuplicate: true,
    }
  }

  const fromAddr = normalizeEmailAddress(input.fromRaw) || String(input.fromRaw || 'unknown')
  const toEmail =
    normalizeEmailAddress(input.toRaw) ||
    (input.toRaw ? String(input.toRaw) : null) ||
    `hello@${city}.qwikker.com`

  const subject = (input.subject && String(input.subject).trim()) || '(no subject)'
  let html = input.html || null
  let text = input.text || null

  // Prefer prior inbound (same person → Qwikker) so 2nd+ replies stay in one thread
  const { data: priorInbound } = await supabase
    .from('email_sends')
    .select('id, business_id, thread_id')
    .eq('city', city)
    .eq('direction', 'inbound')
    .ilike('from_email', fromAddr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: priorOutbound } = await supabase
    .from('email_sends')
    .select('id, business_id, thread_id')
    .eq('city', city)
    .eq('direction', 'outbound')
    .ilike('to_email', fromAddr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const prior = priorInbound || priorOutbound
  const threadId = prior?.thread_id || prior?.id || null

  const emailSendId = await logEmailSend({
    city,
    toEmail,
    fromEmail: fromAddr,
    subject,
    htmlBody: html,
    textBody: text,
    templateKey: 'inbound',
    category: 'system',
    resendMessageId: resendEmailId,
    status: 'received',
    businessId: prior?.business_id || null,
    direction: 'inbound',
    threadId: threadId || undefined,
    inReplyToSendId: prior?.id || null,
    metadata: { resend_event: 'email.received' },
  })

  if (!emailSendId) {
    console.error('[upsert-inbound] insert returned null', { city, resendEmailId, fromAddr })
    return { emailSendId: null, created: false, skippedDuplicate: false }
  }

  if (!threadId) {
    await supabase.from('email_sends').update({ thread_id: emailSendId }).eq('id', emailSendId)
  }

  // Hydrate body AFTER insert so webhook timeouts never drop the Inbox row
  if ((!html && !text) && input.fetchBody && input.apiKey) {
    await hydrateInboundBody(supabase, emailSendId, city, resendEmailId, input.apiKey)
  }

  return { emailSendId, created: true, skippedDuplicate: false }
}

async function hydrateInboundBody(
  supabase: ReturnType<typeof createAdminClient>,
  sendId: string,
  city: string,
  resendEmailId: string,
  apiKey: string
): Promise<void> {
  try {
    const fetched = await fetchReceivedEmailContent(apiKey, resendEmailId)
    if (!fetched.ok || !fetched.content) {
      console.warn('[upsert-inbound] body fetch failed (row already saved)', {
        sendId,
        resendEmailId,
        status: fetched.httpStatus,
        error: fetched.error,
      })
      return
    }
    const updates: Record<string, string> = {}
    if (fetched.content.html) updates.html_body = fetched.content.html
    if (fetched.content.text) updates.text_body = fetched.content.text
    if (fetched.content.subject) updates.subject = fetched.content.subject
    if (Object.keys(updates).length === 0) return
    await supabase.from('email_sends').update(updates).eq('id', sendId).eq('city', city)
  } catch (e) {
    console.warn('[upsert-inbound] body hydrate threw (row already saved)', e)
  }
}
