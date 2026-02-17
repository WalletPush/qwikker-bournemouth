import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Thread Detail
 *
 * GET /api/admin/contact/threads/:id?offset=0&limit=50
 * Returns thread info + messages for a specific thread
 *
 * PATCH /api/admin/contact/threads/:id
 * Updates thread status, priority, or assignee
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0')
    const limit = parseInt(searchParams.get('limit') || '50')

    const adminClient = createServiceRoleClient()

    // Verify thread belongs to admin's city
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('*')
      .eq('id', threadId)
      .eq('city', admin.city)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Get business info if business_admin type
    let business = null
    if (thread.business_id) {
      const { data: biz } = await adminClient
        .from('business_profiles')
        .select('id, business_name, logo, email, phone, business_type, business_category, business_town')
        .eq('id', thread.business_id)
        .single()
      business = biz
    }

    // Get messages (admins see everything including admin notes)
    const { data: messages, error: msgError } = await adminClient
      .from('contact_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get total message count
    const { count: totalMessages } = await adminClient
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId)

    // Auto-mark as read for the admin
    const now = new Date().toISOString()
    await adminClient
      .from('contact_read_receipts')
      .upsert({
        thread_id: threadId,
        user_id: admin.id,
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
        createdAt: thread.created_at,
        lastMessageAt: thread.last_message_at,
        metadata: thread.metadata || {},
        business,
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
      pagination: {
        offset,
        limit,
        total: totalMessages || 0,
      },
    })
  } catch (error: unknown) {
    console.error('Admin thread detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Update thread status, priority, or assignee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: threadId } = await params
    const body = await request.json()
    const { status, priority, assignedToAdminId } = body

    const adminClient = createServiceRoleClient()

    // Verify thread belongs to admin's city
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('id, city, status')
      .eq('id', threadId)
      .eq('city', admin.city)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Build updates
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (status && ['open', 'closed', 'resolved'].includes(status)) {
      updates.status = status
    }
    if (priority && ['low', 'normal', 'high', 'urgent'].includes(priority)) {
      updates.priority = priority
    }
    if (assignedToAdminId !== undefined) {
      updates.assigned_to_admin_id = assignedToAdminId
    }

    const { error: updateError } = await adminClient
      .from('contact_threads')
      .update(updates)
      .eq('id', threadId)

    if (updateError) {
      console.error('Error updating thread:', updateError)
      return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 })
    }

    // Insert a status_change message if status changed
    if (status && status !== thread.status) {
      await adminClient.from('contact_messages').insert({
        thread_id: threadId,
        sender_user_id: admin.id,
        sender_role: 'admin',
        message_type: 'status_change',
        body: `Thread status changed to ${status}`,
        metadata: { oldStatus: thread.status, newStatus: status },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Admin thread update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
