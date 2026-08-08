import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { isCityEmailConfigured } from '@/lib/email/suite-config'

/**
 * Phase 3 Inbox — lists inbound email_sends + thread.
 * Requires Resend Receiving webhook to populate inbound rows.
 */

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
      .select(
        'id, direction, to_email, from_email, subject, html_body, text_body, status, thread_id, business_id, sent_at, created_at'
      )
      .eq('city', auth.city)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ threadId, messages: data || [] })
  }

  const { data, error } = await supabase
    .from('email_sends')
    .select(
      'id, direction, to_email, from_email, subject, html_body, text_body, status, thread_id, business_id, sent_at, created_at'
    )
    .eq('city', auth.city)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    inbound: data || [],
  })
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
