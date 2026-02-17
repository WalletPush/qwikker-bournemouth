import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin Contact Centre - Thread Management
 *
 * GET /api/admin/contact/threads?type=business_admin&status=open&search=...
 *   &category=bug&priority=urgent,high&unread=true
 * Lists all threads for the admin's city with server-side filtering
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threadType = searchParams.get('type') || 'business_admin'
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const priority = searchParams.get('priority') // comma-separated, e.g. "urgent,high"
    const unreadOnly = searchParams.get('unread') === 'true'

    const adminClient = createServiceRoleClient()

    // Build query
    let query = adminClient
      .from('contact_threads')
      .select(`
        *,
        business_profiles!contact_threads_business_id_fkey(id, business_name, logo, email)
      `)
      .eq('city', admin.city)
      .eq('thread_type', threadType)
      .order('last_message_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (priority) {
      const priorities = priority.split(',').map(p => p.trim()).filter(Boolean)
      if (priorities.length === 1) {
        query = query.eq('priority', priorities[0])
      } else if (priorities.length > 1) {
        query = query.in('priority', priorities)
      }
    }

    const { data: threads, error } = await query

    if (error) {
      console.error('Error fetching admin threads:', error)
      // Fallback: query without the join if FK doesn't exist
      let fallbackQuery = adminClient
        .from('contact_threads')
        .select('*')
        .eq('city', admin.city)
        .eq('thread_type', threadType)
        .order('last_message_at', { ascending: false })

      if (status) fallbackQuery = fallbackQuery.eq('status', status)
      if (category) fallbackQuery = fallbackQuery.eq('category', category)
      if (priority) {
        const priorities = priority.split(',').map(p => p.trim()).filter(Boolean)
        if (priorities.length === 1) {
          fallbackQuery = fallbackQuery.eq('priority', priorities[0])
        } else if (priorities.length > 1) {
          fallbackQuery = fallbackQuery.in('priority', priorities)
        }
      }

      const { data: fallbackThreads, error: fallbackError } = await fallbackQuery

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 })
      }

      // Fetch business names separately
      const bizIds = [...new Set((fallbackThreads || []).map(t => t.business_id).filter(Boolean))]
      let bizMap = new Map()
      if (bizIds.length > 0) {
        const { data: businesses } = await adminClient
          .from('business_profiles')
          .select('id, business_name, logo, email')
          .in('id', bizIds)
        bizMap = new Map((businesses || []).map(b => [b.id, b]))
      }

      // Get unread counts
      const threadIds = (fallbackThreads || []).map(t => t.id)
      const unreadMap = await getUnreadCounts(adminClient, threadIds, admin.id)

      let formatted = (fallbackThreads || []).map(t => {
        const biz = bizMap.get(t.business_id) || {}
        return formatThread(t, biz, unreadMap.get(t.id) || 0)
      })

      // Server-side unread filter
      if (unreadOnly) {
        formatted = formatted.filter(t => t.unreadCount > 0)
      }

      // Filter by business name search
      if (search) {
        formatted = formatted.filter(t => t.businessName?.toLowerCase().includes(search.toLowerCase()))
      }

      return NextResponse.json({ success: true, threads: formatted })
    }

    // Get unread counts
    const threadIds = (threads || []).map(t => t.id)
    const unreadMap = await getUnreadCounts(adminClient, threadIds, admin.id)

    let formatted = (threads || []).map(t => {
      const biz = Array.isArray(t.business_profiles) ? t.business_profiles[0] : t.business_profiles
      return formatThread(t, biz || {}, unreadMap.get(t.id) || 0)
    })

    // Server-side unread filter
    if (unreadOnly) {
      formatted = formatted.filter(t => t.unreadCount > 0)
    }

    // Filter by business name search
    if (search) {
      formatted = formatted.filter(t => t.businessName?.toLowerCase().includes(search.toLowerCase()))
    }

    return NextResponse.json({ success: true, threads: formatted })
  } catch (error: unknown) {
    console.error('Admin threads error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/contact/threads
 * Admin-initiated conversation with a business.
 * Body: { businessId, subject?, message, category? }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, subject, message, category } = await request.json()

    if (!businessId || !message?.trim()) {
      return NextResponse.json({ error: 'businessId and message are required' }, { status: 400 })
    }

    const adminClient = createServiceRoleClient()

    // Verify business belongs to admin's city
    const { data: biz, error: bizError } = await adminClient
      .from('business_profiles')
      .select('id, city, user_id, owner_user_id, business_name')
      .eq('id', businessId)
      .single()

    if (bizError || !biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (biz.city?.toLowerCase() !== admin.city?.toLowerCase()) {
      return NextResponse.json({ error: 'Business not in your city' }, { status: 403 })
    }

    // Create thread
    const { data: thread, error: threadError } = await adminClient
      .from('contact_threads')
      .insert({
        thread_type: 'business_admin',
        city: admin.city,
        business_id: businessId,
        created_by_user_id: admin.id,
        created_by_role: 'admin',
        subject: subject?.trim() || null,
        category: category || 'other',
        last_message_preview: message.trim().slice(0, 120),
        last_message_from_role: 'admin',
      })
      .select()
      .single()

    if (threadError || !thread) {
      console.error('Error creating admin thread:', threadError)
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 })
    }

    // Add participants: admin + business owner
    const participants = [
      { thread_id: thread.id, user_id: admin.id, role: 'admin' as const },
    ]
    const bizUserId = biz.owner_user_id || biz.user_id
    if (bizUserId) {
      participants.push({
        thread_id: thread.id,
        user_id: bizUserId,
        role: 'business' as const,
      })
    }
    await adminClient.from('contact_thread_participants').insert(participants)

    // Create first message
    await adminClient.from('contact_messages').insert({
      thread_id: thread.id,
      sender_user_id: admin.id,
      sender_role: 'admin',
      message_type: 'message',
      body: message.trim(),
    })

    // Mark read for admin
    const now = new Date().toISOString()
    await adminClient.from('contact_read_receipts').upsert({
      thread_id: thread.id,
      user_id: admin.id,
      last_read_at: now,
      updated_at: now,
    })

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        subject: thread.subject,
        category: thread.category,
        status: thread.status,
      },
    })
  } catch (error: unknown) {
    console.error('Admin create thread error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper: get unread counts per thread for a given user
async function getUnreadCounts(
  client: ReturnType<typeof createServiceRoleClient>,
  threadIds: string[],
  userId: string
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (threadIds.length === 0) return map

  const { data: receipts } = await client
    .from('contact_read_receipts')
    .select('thread_id, last_read_at')
    .eq('user_id', userId)
    .in('thread_id', threadIds)

  const receiptMap = new Map(
    (receipts || []).map(r => [r.thread_id, new Date(r.last_read_at)])
  )

  for (const threadId of threadIds) {
    const lastRead = receiptMap.get(threadId) || new Date('1970-01-01')
    const { count } = await client
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('thread_id', threadId)
      .gt('created_at', lastRead.toISOString())
      .neq('sender_role', 'admin')

    map.set(threadId, count || 0)
  }

  return map
}

// Helper: format thread response
function formatThread(thread: any, biz: any, unreadCount: number) {
  return {
    id: thread.id,
    subject: thread.subject,
    category: thread.category,
    status: thread.status,
    priority: thread.priority,
    lastMessageAt: thread.last_message_at,
    lastMessagePreview: thread.last_message_preview,
    lastMessageFromRole: thread.last_message_from_role,
    unreadCount,
    businessId: thread.business_id,
    businessName: biz?.business_name || 'Unknown',
    businessLogo: biz?.logo || null,
    businessEmail: biz?.email || null,
    createdAt: thread.created_at,
  }
}
