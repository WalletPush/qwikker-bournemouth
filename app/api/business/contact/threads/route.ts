import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendContactSlackNotification } from '@/lib/utils/contact-slack'
import type { FranchiseCity } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'

/**
 * Business Contact Centre - Thread Management
 *
 * GET  /api/business/contact/threads  - List threads for this business
 * POST /api/business/contact/threads  - Create a new thread (bug/request/etc)
 */

// Helper: authenticate business user and return profile
async function getBusinessProfile() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const adminClient = createServiceRoleClient()
  const { data: profile } = await adminClient
    .from('business_profiles')
    .select('id, user_id, city, business_name, email')
    .eq('user_id', user.id)
    .single()

  return profile ? { ...profile, authUserId: user.id } : null
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getBusinessProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createServiceRoleClient()

    // Fetch all threads for this business
    const { data: threads, error } = await adminClient
      .from('contact_threads')
      .select('*')
      .eq('business_id', profile.id)
      .eq('thread_type', 'business_admin')
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error fetching threads:', error)
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
    }

    // Get unread counts per thread
    const threadIds = (threads || []).map(t => t.id)
    let unreadMap = new Map<string, number>()

    if (threadIds.length > 0) {
      // Get read receipts for this user
      const { data: receipts } = await adminClient
        .from('contact_read_receipts')
        .select('thread_id, last_read_at')
        .eq('user_id', profile.authUserId)
        .in('thread_id', threadIds)

      const receiptMap = new Map(
        (receipts || []).map(r => [r.thread_id, new Date(r.last_read_at)])
      )

      // Count unread messages per thread
      for (const threadId of threadIds) {
        const lastRead = receiptMap.get(threadId) || new Date('1970-01-01')
        const { count } = await adminClient
          .from('contact_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .gt('created_at', lastRead.toISOString())
          .neq('sender_role', 'business') // Don't count own messages as unread

        unreadMap.set(threadId, count || 0)
      }
    }

    // Format response
    const formatted = (threads || []).map(t => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      lastMessageAt: t.last_message_at,
      lastMessagePreview: t.last_message_preview,
      lastMessageFromRole: t.last_message_from_role,
      unreadCount: unreadMap.get(t.id) || 0,
      createdAt: t.created_at,
    }))

    return NextResponse.json({ success: true, threads: formatted })
  } catch (error: unknown) {
    console.error('Contact threads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Canonical severity -> thread priority mapping
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  high: 'high',
  medium: 'normal',
  low: 'low',
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getBusinessProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      subject,
      category,
      message,
      // Bug-specific fields
      severity,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      // Universal fields
      attachments: clientAttachments,
      diagnosticsEnabled,
      activityTrail: clientTrail,
    } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const validCategories = [
      'bug', 'feature_request', 'billing', 'listing', 'menu',
      'photos', 'offers', 'events', 'app_issue', 'other',
      'support', 'platform_issue', 'task'
    ]
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const isBug = category === 'bug' || category === 'app_issue'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Server-rebuilt diagnostics (always built server-side, never trust client)
    const serverDiagnostics: Record<string, unknown> = {
      receivedAt: new Date().toISOString(),
      city: profile.city,
      threadType: 'business_admin',
      role: 'business',
      businessId: profile.id,
      userAgent,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    }

    // Merge safe client diagnostics only if enabled
    if (diagnosticsEnabled === true) {
      // Allowed client fields (never trust raw URLs with querystrings)
      const safeDiag = body.clientDiagnostics || {}
      if (safeDiag.pageUrl && typeof safeDiag.pageUrl === 'string') {
        serverDiagnostics.pageUrl = safeDiag.pageUrl.split('?')[0].split('#')[0]
      }
      if (safeDiag.viewport && typeof safeDiag.viewport === 'string') {
        serverDiagnostics.viewport = safeDiag.viewport.slice(0, 30)
      }
      if (safeDiag.timezone && typeof safeDiag.timezone === 'string') {
        serverDiagnostics.timezone = safeDiag.timezone.slice(0, 50)
      }
      if (safeDiag.platform && typeof safeDiag.platform === 'string') {
        serverDiagnostics.platform = safeDiag.platform.slice(0, 50)
      }
    }

    // Validate and normalize attachments array
    const attachments: Array<{ type: string; url: string; name?: string }> = []
    if (Array.isArray(clientAttachments)) {
      for (const att of clientAttachments.slice(0, 10)) {
        if (att && typeof att.url === 'string' && att.url.startsWith('http')) {
          attachments.push({
            type: typeof att.type === 'string' ? att.type.slice(0, 20) : 'image',
            url: att.url.slice(0, 500),
            name: typeof att.name === 'string' ? att.name.slice(0, 100) : undefined,
          })
        }
      }
    }

    // Validate and cap activity trail
    let activityTrail: unknown[] = []
    if (diagnosticsEnabled === true && Array.isArray(clientTrail)) {
      activityTrail = clientTrail.slice(-25).map((evt: Record<string, unknown>) => ({
        ts: typeof evt.ts === 'string' ? evt.ts : '',
        type: typeof evt.type === 'string' ? evt.type.slice(0, 20) : 'unknown',
        path: typeof evt.path === 'string' ? evt.path.split('?')[0].split('#')[0].slice(0, 200) : '',
        target: typeof evt.target === 'string' ? evt.target.slice(0, 80) : undefined,
      }))
    }

    // Compute thread priority from severity (bug-specific)
    const threadPriority = isBug && severity
      ? (SEVERITY_TO_PRIORITY[severity] || 'normal')
      : 'normal'

    // Build message metadata
    const messageMetadata: Record<string, unknown> = {
      diagnostics: serverDiagnostics,
      attachments,
    }
    if (isBug) {
      messageMetadata.severity = severity || 'medium'
      if (stepsToReproduce) messageMetadata.stepsToReproduce = String(stepsToReproduce).slice(0, 2000)
      if (expectedBehavior) messageMetadata.expectedBehavior = String(expectedBehavior).slice(0, 1000)
      if (actualBehavior) messageMetadata.actualBehavior = String(actualBehavior).slice(0, 1000)
    }
    if (activityTrail.length > 0) {
      messageMetadata.activityTrail = activityTrail
    }

    const adminClient = createServiceRoleClient()

    // Create thread (with priority mapped from severity)
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .insert({
        thread_type: 'business_admin',
        city: profile.city,
        business_id: profile.id,
        created_by_user_id: profile.authUserId,
        created_by_role: 'business',
        subject: subject?.trim() || null,
        category: category || 'other',
        priority: threadPriority,
        last_message_preview: message.trim().slice(0, 120),
        last_message_from_role: 'business',
        metadata: isBug ? { severity: severity || 'medium' } : {},
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error('Error creating thread:', threadError)
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Add business user as participant
    await adminClient
      .from('contact_thread_participants')
      .insert({
        thread_id: thread.id,
        user_id: profile.authUserId,
        role: 'business',
      })

    // Find city admins and add as participants
    const { data: cityAdmins } = await adminClient
      .from('city_admins')
      .select('id')
      .eq('city', profile.city)
      .eq('is_active', true)

    if (cityAdmins && cityAdmins.length > 0) {
      await adminClient
        .from('contact_thread_participants')
        .insert(
          cityAdmins.map(admin => ({
            thread_id: thread.id,
            user_id: admin.id,
            role: 'admin',
          }))
        )
    }

    // Create first message (with full metadata)
    const { error: msgError } = await adminClient
      .from('contact_messages')
      .insert({
        thread_id: thread.id,
        sender_user_id: profile.authUserId,
        sender_role: 'business',
        message_type: 'message',
        body: message.trim(),
        metadata: messageMetadata,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error creating message:', msgError)
    }

    // Mark as read for the sender
    await adminClient
      .from('contact_read_receipts')
      .upsert({
        thread_id: thread.id,
        user_id: profile.authUserId,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    // Send Slack notification to admin (non-blocking)
    sendContactSlackNotification({
      city: profile.city as FranchiseCity,
      businessName: profile.business_name || 'Unknown Business',
      category: category || 'other',
      subject: subject?.trim() || undefined,
      messagePreview: message.trim(),
      threadId: thread.id,
      eventType: 'new_thread',
      severity: isBug ? (severity || 'medium') : undefined,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        status: thread.status,
        priority: thread.priority,
      },
    })
  } catch (error: unknown) {
    console.error('Create thread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
