import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Business Contact Centre - Send Message
 *
 * POST /api/business/contact/messages
 * Body: { threadId, body }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { threadId, body } = await request.json()

    if (!threadId || !body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ error: 'threadId and body are required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify business owns this thread
    const { data: profile } = await adminClient
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const { data: thread } = await adminClient
      .from('contact_threads')
      .select('id, status')
      .eq('id', threadId)
      .eq('business_id', profile.id)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    if (thread.status === 'closed') {
      return NextResponse.json({ error: 'Thread is closed' }, { status: 400 })
    }

    // Insert message
    const { data: message, error: msgError } = await adminClient
      .from('contact_messages')
      .insert({
        thread_id: threadId,
        sender_user_id: user.id,
        sender_role: 'business',
        message_type: 'message',
        body: body.trim(),
      })
      .select()
      .single()

    if (msgError || !message) {
      console.error('Error creating message:', msgError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update thread metadata
    const now = new Date().toISOString()
    await adminClient
      .from('contact_threads')
      .update({
        last_message_at: now,
        last_message_preview: body.trim().slice(0, 120),
        last_message_from_role: 'business',
        status: thread.status === 'pending' ? 'open' : thread.status, // Reopen if pending
        updated_at: now,
      })
      .eq('id', threadId)

    // Update read receipt for sender
    await adminClient
      .from('contact_read_receipts')
      .upsert({
        thread_id: threadId,
        user_id: user.id,
        last_read_at: now,
        updated_at: now,
      })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        body: message.body,
        senderRole: message.sender_role,
        createdAt: message.created_at,
        isOwn: true,
      },
    })
  } catch (error: unknown) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
