import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'
import { sendContactSlackNotification } from '@/lib/utils/contact-slack'
import type { FranchiseCity } from '@/lib/utils/city-detection'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Escalate to HQ
 *
 * POST /api/admin/contact/escalate
 * Body: { subject, category, message, linkedThreadId?, severity?, attachments?, diagnosticsEnabled? }
 *
 * Creates an admin_hq thread so City Admin can message HQ directly.
 * If linkedThreadId is provided, performs idempotent check first --
 * returns existing HQ thread if one is already linked to avoid duplicates.
 * Also stamps hqThreadId back onto the original business thread metadata.
 */

// Canonical severity -> thread priority mapping
const SEVERITY_TO_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  high: 'high',
  medium: 'normal',
  low: 'low',
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      subject,
      category,
      message,
      linkedThreadId,
      severity,
      attachments: clientAttachments,
      diagnosticsEnabled,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
    } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // ─── Idempotent check: if linkedThreadId provided, look for existing HQ thread ───
    if (linkedThreadId && typeof linkedThreadId === 'string') {
      const { data: existing } = await adminClient
        .from('contact_threads')
        .select('id, subject, status, metadata')
        .eq('thread_type', 'admin_hq')
        .filter('metadata->>linkedThreadId', 'eq', linkedThreadId)
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Already escalated -- return the existing HQ thread
        return NextResponse.json({
          success: true,
          alreadyEscalated: true,
          thread: {
            id: existing.id,
            subject: existing.subject,
            status: existing.status,
          },
        })
      }
    }

    const userAgent = request.headers.get('user-agent') || 'unknown'
    const isBug = category === 'bug' || category === 'platform_issue' || category === 'app_issue'

    // Server-rebuilt diagnostics
    const serverDiagnostics: Record<string, unknown> = {
      receivedAt: new Date().toISOString(),
      city: admin.city,
      threadType: 'admin_hq',
      role: 'admin',
      adminId: admin.id,
      userAgent,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
    }

    // Validate attachments array
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

    // Thread priority from severity
    const threadPriority = isBug && severity
      ? (SEVERITY_TO_PRIORITY[severity] || 'normal')
      : 'normal'

    // Thread-level metadata (mirrored for fast lookups)
    const threadMetadata: Record<string, unknown> = {}
    if (linkedThreadId) {
      threadMetadata.linkedThreadId = linkedThreadId
      threadMetadata.escalationType = 'business_bug'
      // Look up the original business thread for context
      const { data: origThread } = await adminClient
        .from('contact_threads')
        .select('city, business_id')
        .eq('id', linkedThreadId)
        .maybeSingle()
      if (origThread) {
        // Verify linked thread belongs to this admin's city
        if (origThread.city?.toLowerCase() !== admin.city?.toLowerCase()) {
          return NextResponse.json({ error: 'Linked thread not in your city' }, { status: 403 })
        }
        threadMetadata.linkedCity = origThread.city
        threadMetadata.linkedBusinessId = origThread.business_id
      }
    } else {
      // Generic admin-to-HQ report (not linked to a business thread)
      threadMetadata.escalationType = 'admin_report'
    }
    if (isBug && severity) {
      threadMetadata.severity = severity
    }

    // Message metadata
    const messageMetadata: Record<string, unknown> = {
      diagnostics: diagnosticsEnabled !== false ? serverDiagnostics : undefined,
      attachments,
    }
    if (isBug) {
      messageMetadata.severity = severity || 'medium'
      if (stepsToReproduce) messageMetadata.stepsToReproduce = String(stepsToReproduce).slice(0, 2000)
      if (expectedBehavior) messageMetadata.expectedBehavior = String(expectedBehavior).slice(0, 1000)
      if (actualBehavior) messageMetadata.actualBehavior = String(actualBehavior).slice(0, 1000)
    }
    if (linkedThreadId) {
      messageMetadata.linkedThreadId = linkedThreadId
    }

    // Create admin_hq thread
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .insert({
        thread_type: 'admin_hq',
        city: admin.city,
        business_id: null,
        created_by_user_id: admin.id,
        created_by_role: 'admin',
        subject: subject?.trim() || `Escalation from ${admin.city}`,
        category: category || 'support',
        priority: threadPriority,
        last_message_preview: message.trim().slice(0, 120),
        last_message_from_role: 'admin',
        metadata: threadMetadata,
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error('Error creating escalation thread:', threadError)
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Stamp hqThreadId back onto the original business thread
    if (linkedThreadId) {
      const { data: origThread } = await adminClient
        .from('contact_threads')
        .select('metadata')
        .eq('id', linkedThreadId)
        .maybeSingle()

      const existingMeta = (origThread?.metadata as Record<string, unknown>) || {}
      await adminClient
        .from('contact_threads')
        .update({
          metadata: { ...existingMeta, hqThreadId: thread.id },
        })
        .eq('id', linkedThreadId)
    }

    // Add city admin as participant
    await adminClient.from('contact_thread_participants').insert({
      thread_id: thread.id,
      user_id: admin.id,
      role: 'admin',
    })

    // Add HQ admins as participants
    const { data: hqAdmins } = await adminClient
      .from('hq_admins')
      .select('user_id')
      .eq('is_active', true)

    if (hqAdmins && hqAdmins.length > 0) {
      await adminClient.from('contact_thread_participants').insert(
        hqAdmins.map(hq => ({
          thread_id: thread.id,
          user_id: hq.user_id,
          role: 'hq' as const,
        }))
      )
    }

    // Create first message (with full metadata)
    await adminClient.from('contact_messages').insert({
      thread_id: thread.id,
      sender_user_id: admin.id,
      sender_role: 'admin',
      message_type: 'message',
      body: message.trim(),
      metadata: messageMetadata,
    })

    // Mark as read for sender
    const now = new Date().toISOString()
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: thread.id,
      user_id: admin.id,
      last_read_at: now,
      updated_at: now,
    })

    // Send Slack notification for escalation (non-blocking, goes to HQ webhook)
    sendContactSlackNotification({
      city: admin.city as FranchiseCity,
      businessName: `City Admin (${admin.city})`,
      category: category || 'support',
      subject: subject?.trim() || undefined,
      messagePreview: message.trim(),
      threadId: thread.id,
      eventType: 'escalation',
      severity: isBug ? (severity || 'medium') : undefined,
      adminName: admin.full_name || admin.email || admin.username || 'Unknown Admin',
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      alreadyEscalated: false,
      thread: {
        id: thread.id,
        subject: thread.subject,
        status: thread.status,
        priority: thread.priority,
      },
    })
  } catch (error: unknown) {
    console.error('Escalate to HQ error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
