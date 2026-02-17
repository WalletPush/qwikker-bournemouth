import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Business Contact Centre - Badge Counts
 *
 * GET /api/business/contact/counts
 * Returns unread thread count + open task count for sidebar badge
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createServiceRoleClient()

    // Get business profile
    const { data: profile } = await adminClient
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ unreadCount: 0, openTasksCount: 0, badgeCount: 0 })
    }

    // Get all threads for this business
    const { data: threads } = await adminClient
      .from('contact_threads')
      .select('id')
      .eq('business_id', profile.id)
      .eq('thread_type', 'business_admin')

    const threadIds = (threads || []).map(t => t.id)

    if (threadIds.length === 0) {
      return NextResponse.json({ unreadCount: 0, openTasksCount: 0, badgeCount: 0 })
    }

    // Get read receipts
    const { data: receipts } = await adminClient
      .from('contact_read_receipts')
      .select('thread_id, last_read_at')
      .eq('user_id', user.id)
      .in('thread_id', threadIds)

    const receiptMap = new Map(
      (receipts || []).map(r => [r.thread_id, r.last_read_at])
    )

    // Count unread threads (threads with messages newer than last_read_at from non-business senders)
    let unreadCount = 0
    for (const threadId of threadIds) {
      const lastRead = receiptMap.get(threadId) || '1970-01-01T00:00:00Z'
      const { count } = await adminClient
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', threadId)
        .gt('created_at', lastRead)
        .neq('sender_role', 'business')

      if ((count || 0) > 0) unreadCount++
    }

    // Count open tasks assigned to this business
    const { data: taskMessages } = await adminClient
      .from('contact_messages')
      .select('id, metadata')
      .in('thread_id', threadIds)
      .eq('message_type', 'task')

    const openTasksCount = (taskMessages || []).filter(m => {
      const meta = m.metadata as Record<string, unknown>
      return meta?.status === 'open'
    }).length

    const badgeCount = unreadCount + openTasksCount

    return NextResponse.json({ unreadCount, openTasksCount, badgeCount })
  } catch (error: unknown) {
    console.error('Contact counts error:', error)
    return NextResponse.json({ unreadCount: 0, openTasksCount: 0, badgeCount: 0 })
  }
}
