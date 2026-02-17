import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Send Message / Note
 *
 * POST /api/admin/contact/messages
 * Body: { threadId, body, messageType?: 'message' | 'note' }
 *
 * messageType='note' creates an internal admin-only note (hidden from business).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId, body, messageType = 'message' } = await request.json()

    if (!threadId || !body?.trim()) {
      return NextResponse.json({ error: 'threadId and body required' }, { status: 400 })
    }

    if (!['message', 'note'].includes(messageType)) {
      return NextResponse.json({ error: 'Invalid messageType' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify thread belongs to admin's city
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('id, city')
      .eq('id', threadId)
      .eq('city', admin.city)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Insert message
    const { data: message, error: msgError } = await adminClient
      .from('contact_messages')
      .insert({
        thread_id: threadId,
        sender_user_id: admin.id,
        sender_role: 'admin',
        message_type: messageType,
        body: body.trim(),
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error sending admin message:', msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update thread metadata (only for visible messages, not notes)
    if (messageType === 'message') {
      await adminClient
        .from('contact_threads')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: body.trim().slice(0, 120),
          last_message_from_role: 'admin',
          updated_at: new Date().toISOString(),
          // Reopen closed threads when admin replies
          status: 'open',
        })
        .eq('id', threadId)
    }

    // Update read receipt for the sender
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
      message: {
        id: message.id,
        senderRole: message.sender_role,
        senderUserId: message.sender_user_id,
        messageType: message.message_type,
        body: message.body,
        metadata: message.metadata,
        createdAt: message.created_at,
      },
    })
  } catch (error: unknown) {
    console.error('Admin send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
