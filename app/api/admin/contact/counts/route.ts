import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Badge Counts
 *
 * GET /api/admin/contact/counts
 * Returns unread thread count + open tasks for the sidebar badge
 */
export async function GET() {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createServiceRoleClient()

    // Get all threads in admin's city
    const { data: threads } = await adminClient
      .from('contact_threads')
      .select('id, last_message_at, last_message_from_role')
      .eq('city', admin.city)
      .in('thread_type', ['business_admin', 'admin_hq'])
      .eq('status', 'open')

    if (!threads || threads.length === 0) {
      return NextResponse.json({ unreadCount: 0, openTasksCount: 0, badgeCount: 0 })
    }

    const threadIds = threads.map(t => t.id)

    // Get read receipts for admin
    const { data: receipts } = await adminClient
      .from('contact_read_receipts')
      .select('thread_id, last_read_at')
      .eq('user_id', admin.id)
      .in('thread_id', threadIds)

    const receiptMap = new Map(
      (receipts || []).map(r => [r.thread_id, new Date(r.last_read_at)])
    )

    // Count unread threads (threads with messages after last_read_at from non-admin senders)
    let unreadCount = 0
    for (const thread of threads) {
      const lastRead = receiptMap.get(thread.id) || new Date('1970-01-01')
      const { count } = await adminClient
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id)
        .gt('created_at', lastRead.toISOString())
        .neq('sender_role', 'admin')

      if ((count || 0) > 0) unreadCount++
    }

    // Count open tasks assigned to businesses that haven't been completed
    // (tasks the admin needs to track)
    const { count: openTasksCount } = await adminClient
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .in('thread_id', threadIds)
      .eq('message_type', 'task')
      .contains('metadata', { status: 'open' } as any)

    const badgeCount = unreadCount + (openTasksCount || 0)

    return NextResponse.json({
      unreadCount,
      openTasksCount: openTasksCount || 0,
      badgeCount,
    })
  } catch (error: unknown) {
    console.error('Admin contact counts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
