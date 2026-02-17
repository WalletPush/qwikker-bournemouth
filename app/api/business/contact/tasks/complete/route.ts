import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Business Contact Centre - Complete a Task
 *
 * POST /api/business/contact/tasks/complete
 * Body: { messageId }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { messageId } = await request.json()

    if (!messageId) {
      return NextResponse.json({ error: 'messageId is required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify business owns the thread containing this task
    const { data: profile } = await adminClient
      .from('business_profiles')
      .select('id, business_name')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get the task message
    const { data: taskMsg } = await adminClient
      .from('contact_messages')
      .select('id, thread_id, message_type, metadata')
      .eq('id', messageId)
      .eq('message_type', 'task')
      .single()

    if (!taskMsg) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify the thread belongs to this business
    const { data: thread } = await adminClient
      .from('contact_threads')
      .select('id')
      .eq('id', taskMsg.thread_id)
      .eq('business_id', profile.id)
      .single()

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Update task status in metadata
    const updatedMetadata = {
      ...(taskMsg.metadata as Record<string, unknown>),
      status: 'done',
      completedAt: new Date().toISOString(),
      completedBy: user.id,
    }

    await adminClient
      .from('contact_messages')
      .update({ metadata: updatedMetadata })
      .eq('id', messageId)

    // Insert a status_change message
    const now = new Date().toISOString()
    const taskTitle = (taskMsg.metadata as Record<string, unknown>)?.title || 'Task'

    await adminClient
      .from('contact_messages')
      .insert({
        thread_id: taskMsg.thread_id,
        sender_user_id: user.id,
        sender_role: 'business',
        message_type: 'status_change',
        body: `Completed task: ${taskTitle}`,
        metadata: { previousMessageId: messageId, action: 'task_completed' },
      })

    // Update thread metadata
    await adminClient
      .from('contact_threads')
      .update({
        last_message_at: now,
        last_message_preview: `Task completed: ${taskTitle}`,
        last_message_from_role: 'business',
        updated_at: now,
      })
      .eq('id', taskMsg.thread_id)

    return NextResponse.json({ success: true, messageId, status: 'done' })
  } catch (error: unknown) {
    console.error('Complete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
