/**
 * Email Suite logger — persist outbound/inbound messages for History + webhooks.
 * Non-fatal: logging failures must never block a successful Resend send.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type EmailCategory =
  | 'transactional'
  | 'marketing'
  | 'outreach'
  | 'lifecycle'
  | 'digest'
  | 'system'

export interface LogEmailSendInput {
  city: string
  toEmail: string
  fromEmail?: string | null
  replyTo?: string | null
  subject: string
  htmlBody?: string | null
  textBody?: string | null
  templateKey?: string | null
  category?: EmailCategory
  resendMessageId?: string | null
  status?: string
  sentBy?: string | null
  businessId?: string | null
  userId?: string | null
  campaignId?: string | null
  batchId?: string | null
  threadId?: string | null
  inReplyToSendId?: string | null
  direction?: 'outbound' | 'inbound'
  metadata?: Record<string, unknown>
}

const HTML_RETENTION_DAYS = 90

export async function logEmailSend(input: LogEmailSendInput): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    const now = new Date()
    const purge = new Date(now.getTime() + HTML_RETENTION_DAYS * 24 * 60 * 60 * 1000)

    const { data, error } = await supabase
      .from('email_sends')
      .insert({
        city: input.city.toLowerCase(),
        business_id: input.businessId || null,
        user_id: input.userId || null,
        direction: input.direction || 'outbound',
        to_email: input.toEmail,
        from_email: input.fromEmail || null,
        reply_to: input.replyTo || null,
        subject: input.subject,
        html_body: input.htmlBody || null,
        text_body: input.textBody || null,
        template_key: input.templateKey || null,
        category: input.category || 'transactional',
        resend_message_id: input.resendMessageId || null,
        status: input.status || (input.resendMessageId ? 'sent' : 'failed'),
        sent_by: input.sentBy || null,
        campaign_id: input.campaignId || null,
        batch_id: input.batchId || null,
        thread_id: input.threadId || null,
        in_reply_to_send_id: input.inReplyToSendId || null,
        metadata: input.metadata || {},
        sent_at: input.direction === 'inbound' ? null : now.toISOString(),
        html_purge_after: purge.toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('[email-logger] insert failed:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (e) {
    console.error('[email-logger] unexpected error:', e)
    return null
  }
}

export async function updateEmailSendStatus(params: {
  resendMessageId?: string | null
  emailSendId?: string | null
  status: string
  city?: string
}): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    let query = supabase.from('email_sends').update({ status: params.status })

    if (params.emailSendId) {
      query = query.eq('id', params.emailSendId)
    } else if (params.resendMessageId) {
      query = query.eq('resend_message_id', params.resendMessageId)
    } else {
      return null
    }

    if (params.city) {
      query = query.eq('city', params.city.toLowerCase())
    }

    const { data, error } = await query.select('id').maybeSingle()
    if (error) {
      console.error('[email-logger] status update failed:', error.message)
      return null
    }
    return data?.id ?? null
  } catch (e) {
    console.error('[email-logger] status update error:', e)
    return null
  }
}

export async function recordEmailEvent(params: {
  city: string
  emailSendId?: string | null
  resendMessageId?: string | null
  eventType: string
  payload?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('email_send_events').insert({
      city: params.city.toLowerCase(),
      email_send_id: params.emailSendId || null,
      resend_message_id: params.resendMessageId || null,
      event_type: params.eventType,
      payload: params.payload || {},
    })
    if (error && error.code !== '23505') {
      console.error('[email-logger] event insert failed:', error.message)
    }
  } catch (e) {
    console.error('[email-logger] event insert error:', e)
  }
}
