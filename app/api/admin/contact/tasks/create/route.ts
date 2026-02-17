import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Create Task for Business
 *
 * POST /api/admin/contact/tasks/create
 * Body: {
 *   businessId: string,
 *   threadId?: string,        // optional: attach to existing thread (creates new if omitted)
 *   title: string,
 *   body: string,
 *   actionType?: string,      // 'update_profile' | 'upload_menu' | 'respond' | 'review_offer' | 'other'
 *   priority?: string,        // 'low' | 'normal' | 'high' | 'urgent'
 *   deepLink?: string,        // optional URL the business should go to
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      businessId,
      threadId: existingThreadId,
      title,
      body,
      actionType = 'other',
      priority = 'normal',
      deepLink,
    } = await request.json()

    if (!businessId || !title?.trim() || !body?.trim()) {
      return NextResponse.json({ error: 'businessId, title, and body are required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify business belongs to admin's city
    const { data: biz, error: bizError } = await adminClient
      .from('business_profiles')
      .select('id, city, user_id, owner_user_id')
      .eq('id', businessId)
      .single()

    if (bizError || !biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (biz.city?.toLowerCase() !== admin.city?.toLowerCase()) {
      return NextResponse.json({ error: 'Business not in your city' }, { status: 403 })
    }

    let threadId = existingThreadId

    // Create a new thread if none specified
    if (!threadId) {
      const { data: newThread, error: threadError } = await adminClient
        .from('contact_threads')
        .insert({
          thread_type: 'business_admin',
          city: admin.city,
          business_id: businessId,
          created_by_user_id: admin.id,
          created_by_role: 'admin',
          subject: title.trim(),
          category: 'task',
          priority: priority || 'normal',
          last_message_preview: body.trim().slice(0, 120),
          last_message_from_role: 'admin',
        })
        .select()
        .single()

      if (threadError || !newThread) {
        console.error('Error creating task thread:', threadError)
        return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
      }

      threadId = newThread.id

      // Add participants: business owner + admin
      const participants = [
        { thread_id: threadId, user_id: admin.id, role: 'admin' as const },
      ]
      if (biz.owner_user_id || biz.user_id) {
        participants.push({
          thread_id: threadId,
          user_id: (biz.owner_user_id || biz.user_id)!,
          role: 'business' as const,
        })
      }

      await adminClient.from('contact_thread_participants').insert(participants)
    }

    // Create the task message
    const metadata = {
      title: title.trim(),
      actionType,
      priority: priority || 'normal',
      status: 'open',
      deepLink: deepLink || null,
      assignedAt: new Date().toISOString(),
      assignedBy: admin.id,
      assignedByName: admin.full_name || admin.username,
    }

    const { data: message, error: msgError } = await adminClient
      .from('contact_messages')
      .insert({
        thread_id: threadId,
        sender_user_id: admin.id,
        sender_role: 'admin',
        message_type: 'task',
        body: body.trim(),
        metadata,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error creating task message:', msgError)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    // Update thread metadata
    await adminClient
      .from('contact_threads')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `Task: ${title.trim().slice(0, 100)}`,
        last_message_from_role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId)

    // Mark read for admin
    const now = new Date().toISOString()
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: threadId,
      user_id: admin.id,
      last_read_at: now,
      updated_at: now,
    })

    return NextResponse.json({
      success: true,
      threadId,
      messageId: message.id,
    })
  } catch (error: unknown) {
    console.error('Admin create task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
