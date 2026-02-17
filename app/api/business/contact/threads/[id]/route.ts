import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Business Contact Centre - Single Thread Detail
 *
 * GET /api/business/contact/threads/[id] - Thread meta + paginated messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: threadId } = await params

    // Authenticate business user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .select('*')
      .eq('id', threadId)
      .eq('business_id', profile.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Pagination
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch messages (exclude admin notes from business view)
    const { data: messages, error: msgError } = await adminClient
      .from('contact_messages')
      .select('*')
      .eq('thread_id', threadId)
      .neq('message_type', 'note') // Hide admin-only notes
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (msgError) {
      console.error('Error fetching messages:', msgError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Get read receipt
    const { data: receipt } = await adminClient
      .from('contact_read_receipts')
      .select('last_read_at')
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Format messages
    const formattedMessages = (messages || []).map(m => ({
      id: m.id,
      senderRole: m.sender_role,
      messageType: m.message_type,
      body: m.body,
      metadata: m.metadata,
      createdAt: m.created_at,
      isOwn: m.sender_user_id === user.id,
    }))

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        status: thread.status,
        priority: thread.priority,
        createdAt: thread.created_at,
      },
      messages: formattedMessages,
      lastReadAt: receipt?.last_read_at || null,
      pagination: { limit, offset, hasMore: (messages || []).length === limit },
    })
  } catch (error: unknown) {
    console.error('Thread detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
