import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getHQAdminFromSession } from '@/lib/utils/hq-session'

export const dynamic = 'force-dynamic'

/**
 * HQ Contact Centre - Badge Counts
 *
 * GET /api/hq/contact/counts
 */
export async function GET() {
  try {
    const hqAdmin = await getHQAdminFromSession()
    if (!hqAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createServiceRoleClient()

    // Get all open admin_hq threads
    const { data: threads } = await adminClient
      .from('contact_threads')
      .select('id')
      .eq('thread_type', 'admin_hq')
      .eq('status', 'open')

    if (!threads || threads.length === 0) {
      return NextResponse.json({ unreadCount: 0, badgeCount: 0 })
    }

    const threadIds = threads.map(t => t.id)

    // Get read receipts
    const { data: receipts } = await adminClient
      .from('contact_read_receipts')
      .select('thread_id, last_read_at')
      .eq('user_id', hqAdmin.userId)
      .in('thread_id', threadIds)

    const receiptMap = new Map(
      (receipts || []).map(r => [r.thread_id, new Date(r.last_read_at)])
    )

    let unreadCount = 0
    for (const thread of threads) {
      const lastRead = receiptMap.get(thread.id) || new Date('1970-01-01')
      const { count } = await adminClient
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', thread.id)
        .gt('created_at', lastRead.toISOString())
        .neq('sender_user_id', hqAdmin.userId)

      if ((count || 0) > 0) unreadCount++
    }

    return NextResponse.json({ unreadCount, badgeCount: unreadCount })
  } catch (error: unknown) {
    console.error('HQ contact counts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
