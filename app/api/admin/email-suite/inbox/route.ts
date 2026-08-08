import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import { fetchReceivedEmailContent } from '@/lib/email/fetch-received-email'

/**
 * Phase 3 Inbox — lists inbound email_sends + thread.
 * Requires Resend Receiving webhook to populate inbound rows.
 */

const INBOUND_SELECT =
  'id, direction, to_email, from_email, subject, html_body, text_body, status, thread_id, business_id, resend_message_id, sent_at, created_at'

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const threadId = url.searchParams.get('threadId')
  const supabase = createAdminClient()

  if (threadId) {
    const { data, error } = await supabase
      .from('email_sends')
      .select(INBOUND_SELECT)
      .eq('city', auth.city)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ threadId, messages: data || [] })
  }

  const { data, error } = await supabase
    .from('email_sends')
    .select(INBOUND_SELECT)
    .eq('city', auth.city)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    inbound: data || [],
  })
}

const hydrateSchema = z.object({
  action: z.literal('hydrate_body'),
  sendId: z.string().uuid(),
})

/** Backfill html/text for an inbound row via Resend Receiving API. */
export async function PATCH(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: z.infer<typeof hydrateSchema>
  try {
    body = hydrateSchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('email_sends')
    .select(INBOUND_SELECT)
    .eq('id', body.sendId)
    .eq('city', auth.city)
    .eq('direction', 'inbound')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  if (row.html_body || row.text_body) {
    return NextResponse.json({ ok: true, message: row, hydrated: false })
  }

  const resendId = row.resend_message_id
  if (!resendId) {
    return NextResponse.json(
      { error: 'No Resend message id on this row — body cannot be fetched' },
      { status: 422 }
    )
  }

  const { data: franchise } = await supabase
    .from('franchise_crm_configs')
    .select('resend_api_key')
    .eq('city', auth.city)
    .maybeSingle()

  const apiKey = franchise?.resend_api_key || process.env.RESEND_API_KEY || null
  if (!apiKey) {
    return NextResponse.json({ error: 'Resend API key not configured for this city' }, { status: 400 })
  }

  const full = await fetchReceivedEmailContent(apiKey, resendId)
  if (!full || (!full.html && !full.text)) {
    return NextResponse.json(
      { error: 'Resend returned no body for this message (it may have expired)' },
      { status: 404 }
    )
  }

  const updates: Record<string, string> = {}
  if (full.html) updates.html_body = full.html
  if (full.text) updates.text_body = full.text
  if (full.subject) updates.subject = full.subject

  const { data: updated, error: updateError } = await supabase
    .from('email_sends')
    .update(updates)
    .eq('id', row.id)
    .eq('city', auth.city)
    .select(INBOUND_SELECT)
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: updated, hydrated: true })
}

const replySchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  businessId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  inReplyToSendId: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = await isCityEmailConfigured(auth.city)
  if (!config.configured) {
    return NextResponse.json({ error: 'Email not configured for this city' }, { status: 400 })
  }

  let body: z.infer<typeof replySchema>
  try {
    body = replySchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  const html = `<div style="font-family:sans-serif;padding:16px;white-space:pre-wrap">${body.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</div>`

  const threadId = body.threadId || body.inReplyToSendId || undefined

  const result = await sendFranchiseEmail({
    city: auth.city,
    to: body.toEmail,
    template: { subject: body.subject, html, text: body.text },
    tags: [{ name: 'type', value: 'inbox_reply' }],
    logMeta: {
      businessId: body.businessId,
      templateKey: 'inbox_reply',
      category: 'system',
      sentBy: auth.adminId,
      threadId,
      inReplyToSendId: body.inReplyToSendId,
    },
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Send failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, emailSendId: result.emailSendId, messageId: result.messageId })
}
