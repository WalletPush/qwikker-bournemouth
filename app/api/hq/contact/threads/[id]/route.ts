import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getHQAdminFromSession } from '@/lib/utils/hq-session'

export const dynamic = 'force-dynamic'

/**
 * HQ Contact Centre - Thread Detail
 *
 * GET  /api/hq/contact/threads/:id - Get thread + messages
 * PATCH /api/hq/contact/threads/:id - Update status/priority
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hqAdmin = await getHQAdminFromSession()
    if (!hqAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '50')

    const adminClient = createServiceRoleClient()

    // Get thread
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('*')
      .eq('id', threadId)
      .eq('thread_type', 'admin_hq')
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get messages
    const { data: messages, error: msgError } = await adminClient
      .from('contact_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error('Error fetching HQ messages:', msgError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Auto-mark as read
    const now = new Date().toISOString()
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: threadId,
      user_id: hqAdmin.userId,
      last_read_at: now,
      updated_at: now,
    })

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        status: thread.status,
        priority: thread.priority,
        city: thread.city,
        createdAt: thread.created_at,
        lastMessageAt: thread.last_message_at,
        metadata: thread.metadata || {},
      },
      messages: (messages || []).map(m => ({
        id: m.id,
        senderRole: m.sender_role,
        senderUserId: m.sender_user_id,
        messageType: m.message_type,
        body: m.body,
        metadata: m.metadata,
        createdAt: m.created_at,
      })),
    })
  } catch (error: unknown) {
    console.error('HQ thread detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const hqAdmin = await getHQAdminFromSession()
    if (!hqAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const body = await request.json()
    const { status, priority } = body

    const adminClient = createServiceRoleClient()

    const { data: thread } = await adminClient
      .from('contact_threads')
      .select('id, status')
      .eq('id', threadId)
      .eq('thread_type', 'admin_hq')
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status && ['open', 'closed', 'resolved'].includes(status)) updates.status = status
    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) updates.priority = priority

    await adminClient.from('contact_threads').update(updates).eq('id', threadId)

    if (status && status !== thread.status) {
      await adminClient.from('contact_messages').insert({
        thread_id: threadId,
        sender_user_id: hqAdmin.userId,
        sender_role: 'hq',
        message_type: 'status_change',
        body: `Thread status changed to ${status}`,
        metadata: { oldStatus: thread.status, newStatus: status },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('HQ thread update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
