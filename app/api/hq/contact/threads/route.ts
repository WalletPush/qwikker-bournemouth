import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getHQAdminFromSession } from '@/lib/utils/hq-session'

export const dynamic = 'force-dynamic'

/**
 * HQ Contact Centre - Thread Management
 *
 * GET /api/hq/contact/threads?status=open&search=...
 * Lists all admin_hq threads (escalations from city admins)
 */
export async function GET(request: NextRequest) {
  try {
    const hqAdmin = await getHQAdminFromSession()
    if (!hqAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''

    const adminClient = createServiceRoleClient()

    // Get all admin_hq threads
    let query = adminClient
      .from('contact_threads')
      .select('*')
      .eq('thread_type', 'admin_hq')
      .order('last_message_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: threads, error } = await query

    if (error) {
      console.error('Error fetching HQ threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Get read receipts for HQ admin
    const threadIds = (threads || []).map(t => t.id)
    const unreadMap = new Map<string, number>()

    if (threadIds.length > 0) {
      const { data: receipts } = await adminClient
        .from('contact_read_receipts')
        .select('thread_id, last_read_at')
        .eq('user_id', hqAdmin.userId)
        .in('thread_id', threadIds)

      const receiptMap = new Map(
        (receipts || []).map(r => [r.thread_id, new Date(r.last_read_at)])
      )

      for (const threadId of threadIds) {
        const lastRead = receiptMap.get(threadId) || new Date('1970-01-01')
        const { count } = await adminClient
          .from('contact_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .gt('created_at', lastRead.toISOString())
          .neq('sender_user_id', hqAdmin.userId)

        unreadMap.set(threadId, count || 0)
      }
    }

    const formatted = (threads || []).map(t => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      city: t.city,
      lastMessageAt: t.last_message_at,
      lastMessagePreview: t.last_message_preview,
      lastMessageFromRole: t.last_message_from_role,
      unreadCount: unreadMap.get(t.id) || 0,
      createdAt: t.created_at,
      metadata: t.metadata || {},
    }))

    const filtered = search
      ? formatted.filter(t =>
          (t.city || '').toLowerCase().includes(search.toLowerCase()) ||
          (t.subject || '').toLowerCase().includes(search.toLowerCase())
        )
      : formatted

    return NextResponse.json({ success: true, threads: filtered })
  } catch (error: unknown) {
    console.error('HQ threads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
