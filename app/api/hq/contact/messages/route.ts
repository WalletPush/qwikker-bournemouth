import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getHQAdminFromSession } from '@/lib/utils/hq-session'

export const dynamic = 'force-dynamic'

/**
 * HQ Contact Centre - Send Message
 *
 * POST /api/hq/contact/messages
 * Body: { threadId, body }
 */
export async function POST(request: NextRequest) {
  try {
    const hqAdmin = await getHQAdminFromSession()
    if (!hqAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId, body } = await request.json()

    if (!threadId || !body?.trim()) {
      return NextResponse.json({ error: 'threadId and body required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify thread exists and is admin_hq type
    const { data: thread } = await adminClient
      .from('contact_threads')
      .select('id')
      .eq('id', threadId)
      .eq('thread_type', 'admin_hq')
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Insert message
    const { data: message, error: msgError } = await adminClient
      .from('contact_messages')
      .insert({
        thread_id: threadId,
        sender_user_id: hqAdmin.userId,
        sender_role: 'hq',
        message_type: 'message',
        body: body.trim(),
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error sending HQ message:', msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update thread metadata
    const now = new Date().toISOString()
    await adminClient
      .from('contact_threads')
      .update({
        last_message_at: now,
        last_message_preview: body.trim().slice(0, 120),
        last_message_from_role: 'hq',
        status: 'open',
        updated_at: now,
      })
      .eq('id', threadId)

    // Update read receipt
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: threadId,
      user_id: hqAdmin.userId,
      last_read_at: now,
      updated_at: now,
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderRole: message.sender_role,
        senderUserId: message.sender_user_id,
        body: message.body,
        createdAt: message.created_at,
      },
    })
  } catch (error: unknown) {
    console.error('HQ send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
