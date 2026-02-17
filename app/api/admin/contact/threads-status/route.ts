import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Update Thread Status
 *
 * POST /api/admin/contact/threads-status
 * Body: { threadId, status: 'open' | 'closed' | 'resolved' }
 *
 * Convenience endpoint - same as PATCH /threads/:id but simpler
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId, status } = await request.json()

    if (!threadId || !status) {
      return NextResponse.json({ error: 'threadId and status required' }, { status: 400 })
    }

    if (!['open', 'closed', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

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

    const oldStatus = thread.status

    await adminClient
      .from('contact_threads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', threadId)

    // Log status change as a message
    if (oldStatus !== status) {
      await adminClient.from('contact_messages').insert({
        thread_id: threadId,
        sender_user_id: admin.id,
        sender_role: 'admin',
        message_type: 'status_change',
        body: `Thread marked as ${status}`,
        metadata: { oldStatus, newStatus: status },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Thread status update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
