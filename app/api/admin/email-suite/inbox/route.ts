import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import {
  fetchReceivedEmailContent,
  listReceivedEmails,
} from '@/lib/email/fetch-received-email'
import { normalizeEmailAddress } from '@/lib/email/normalize-email'
import { upsertInboundReceivedEmail } from '@/lib/email/upsert-inbound'
import { wrapInLayout } from '@/lib/email/templates/business-notifications'

/**
 * Phase 3 Inbox — lists inbound email_sends + conversation by participant.
 * Requires Resend Receiving webhook (or Sync from Resend) to populate inbound rows.
 */

const INBOUND_SELECT =
  'id, direction, to_email, from_email, subject, html_body, text_body, status, thread_id, business_id, resend_message_id, metadata, sent_at, created_at'

function isUnread(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return true
  const readAt = (metadata as { read_at?: unknown }).read_at
  return !readAt
}

async function syncFromResend(
  city: string,
  opts?: { maxImport?: number }
): Promise<{ imported: number; checked: number; error?: string }> {
  const maxImport = opts?.maxImport ?? 20
  const supabase = createAdminClient()
  const { data: franchise } = await supabase
    .from('franchise_crm_configs')
    .select('resend_api_key')
    .eq('city', city)
    .maybeSingle()

  const apiKey = franchise?.resend_api_key || process.env.RESEND_API_KEY || null
  if (!apiKey) return { imported: 0, checked: 0, error: 'Resend API key not configured' }

  const listed = await listReceivedEmails(apiKey, 50)
  if (!listed.ok) {
    return {
      imported: 0,
      checked: 0,
      error: listed.error || 'Could not list Resend receiving inbox',
    }
  }

  let imported = 0
  for (const item of listed.emails) {
    if (imported >= maxImport) break

    // Only import mail addressed to this city's receiving domain
    const toAddrs = item.to.map((t) => normalizeEmailAddress(t) || t.toLowerCase())
    const cityMatch = toAddrs.some((t) => t.endsWith(`@${city}.qwikker.com`))
    if (!cityMatch && item.to.length > 0) continue

    const result = await upsertInboundReceivedEmail({
      city,
      resendEmailId: item.id,
      fromRaw: item.from,
      toRaw: item.to[0] || null,
      subject: item.subject,
      fetchBody: true,
      apiKey,
    })
    if (result.created) imported += 1
  }

  return { imported, checked: listed.emails.length }
}

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const threadId = url.searchParams.get('threadId')
  const participant = normalizeEmailAddress(url.searchParams.get('participant'))
  // Default: auto-sync on Inbox list so Resend-only replies cannot stay invisible
  const syncParam = url.searchParams.get('sync')
  const shouldSync =
    syncParam === '1' || (syncParam !== '0' && !threadId && !participant)
  const supabase = createAdminClient()

  let syncResult: { imported: number; checked: number; error?: string } | null = null
  if (shouldSync) {
    syncResult = await syncFromResend(auth.city, { maxImport: 15 })
  }

  // Conversation: all inbound from person + outbound to person (reliable for 2nd+ replies)
  if (participant) {
    const [{ data: inboundRows }, { data: outboundRows }] = await Promise.all([
      supabase
        .from('email_sends')
        .select(INBOUND_SELECT)
        .eq('city', auth.city)
        .eq('direction', 'inbound')
        .ilike('from_email', participant)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('email_sends')
        .select(INBOUND_SELECT)
        .eq('city', auth.city)
        .eq('direction', 'outbound')
        .ilike('to_email', participant)
        .order('created_at', { ascending: true })
        .limit(100),
    ])

    const byId = new Map<string, Record<string, unknown>>()
    for (const row of [...(inboundRows || []), ...(outboundRows || [])]) {
      byId.set(String(row.id), row as Record<string, unknown>)
    }
    // Also include anything sharing thread_id with these rows
    if (threadId) {
      const { data: threadRows } = await supabase
        .from('email_sends')
        .select(INBOUND_SELECT)
        .eq('city', auth.city)
        .or(`thread_id.eq.${threadId},id.eq.${threadId}`)
        .order('created_at', { ascending: true })
        .limit(100)
      for (const row of threadRows || []) {
        byId.set(String(row.id), row as Record<string, unknown>)
      }
    }

    const messages = Array.from(byId.values()).sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || ''))
    )

    return NextResponse.json({
      threadId,
      participant,
      messages,
      sync: syncResult,
    })
  }

  if (threadId) {
    const { data, error } = await supabase
      .from('email_sends')
      .select(INBOUND_SELECT)
      .eq('city', auth.city)
      .or(`thread_id.eq.${threadId},id.eq.${threadId}`)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ threadId, messages: data || [], sync: syncResult })
  }

  const { data, error } = await supabase
    .from('email_sends')
    .select(INBOUND_SELECT)
    .eq('city', auth.city)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: franchiseRow } = await supabase
    .from('franchise_crm_configs')
    .select('timezone')
    .eq('city', auth.city)
    .maybeSingle()
  const timezone =
    (franchiseRow?.timezone && String(franchiseRow.timezone)) || 'Europe/London'

  const businessIds = [
    ...new Set(
      (data || [])
        .map((row) => row.business_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]
  const nameById = new Map<string, string>()
  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', businessIds)
    for (const b of businesses || []) {
      if (b.id && b.business_name) nameById.set(b.id, b.business_name)
    }
  }

  const inbound = (data || []).map((row) => ({
    ...row,
    business_name: row.business_id ? nameById.get(row.business_id) || null : null,
    unread: isUnread(row.metadata),
  }))

  return NextResponse.json({ inbound, timezone, sync: syncResult })
}

const patchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('hydrate_body'),
    sendId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('mark_read'),
    sendId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('sync_resend'),
  }),
])

export async function PATCH(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  if (body.action === 'sync_resend') {
    const sync = await syncFromResend(auth.city)
    if (sync.error && sync.imported === 0) {
      return NextResponse.json({ error: sync.error }, { status: 502 })
    }
    return NextResponse.json({ ok: true, imported: sync.imported, error: sync.error || null })
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

  if (body.action === 'mark_read') {
    const prev =
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {}
    if (prev.read_at) {
      return NextResponse.json({
        ok: true,
        message: { ...row, unread: false },
        alreadyRead: true,
      })
    }
    const metadata = { ...prev, read_at: new Date().toISOString() }
    const { data: updated, error: updateError } = await supabase
      .from('email_sends')
      .update({ metadata })
      .eq('id', row.id)
      .eq('city', auth.city)
      .select(INBOUND_SELECT)
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true, message: { ...updated, unread: false } })
  }

  // hydrate_body
  if (row.html_body || row.text_body) {
    return NextResponse.json({
      ok: true,
      message: { ...row, unread: isUnread(row.metadata) },
      hydrated: false,
    })
  }

  let resendId = row.resend_message_id as string | null

  // Fallback: pull email_id from the stored webhook event payload
  if (!resendId) {
    const { data: evt } = await supabase
      .from('email_send_events')
      .select('payload, resend_message_id')
      .eq('email_send_id', row.id)
      .eq('event_type', 'email.received')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const payload = (evt?.payload || {}) as Record<string, unknown>
    resendId =
      evt?.resend_message_id ||
      (typeof payload.email_id === 'string' ? payload.email_id : null) ||
      (typeof payload.id === 'string' ? payload.id : null)
  }

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

  const fetched = await fetchReceivedEmailContent(apiKey, resendId)
  if (!fetched.ok || !fetched.content) {
    return NextResponse.json(
      {
        error:
          fetched.httpStatus === 404
            ? `Resend has no body for this id (HTTP 404). Id: ${resendId}. New replies after the fix should store bodies on arrival.`
            : fetched.error || 'Could not load body from Resend',
        resendStatus: fetched.httpStatus,
        resendId,
      },
      { status: fetched.httpStatus && fetched.httpStatus >= 400 ? fetched.httpStatus : 404 }
    )
  }

  const updates: Record<string, string> = {}
  if (fetched.content.html) updates.html_body = fetched.content.html
  if (fetched.content.text) updates.text_body = fetched.content.text
  if (fetched.content.subject) updates.subject = fetched.content.subject
  if (!row.resend_message_id) updates.resend_message_id = resendId

  const { data: updated, error: updateError } = await supabase
    .from('email_sends')
    .update(updates)
    .eq('id', row.id)
    .eq('city', auth.city)
    .select(INBOUND_SELECT)
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    message: { ...updated, unread: isUnread(updated.metadata) },
    hydrated: true,
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

  const escaped = body.text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Same branded shell as suite templates (logo + city footer) — not bare plain text
  const content = `<div style="padding:32px 30px;">
    <p style="font-size:15px;line-height:1.7;color:#e8e8e8;margin:0;white-space:pre-wrap;">${escaped}</p>
  </div>`
  const html = wrapInLayout(content, auth.city)

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
