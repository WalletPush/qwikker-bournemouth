import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getBusinessNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '@/lib/actions/business-notification-actions'

/**
 * GET /api/business/notifications
 * Fetch notifications for the authenticated business.
 * Query params: ?unreadOnly=true&limit=50&offset=0&countOnly=true
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', data.claims.sub)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No business profile' }, { status: 404 })
    }

    const params = request.nextUrl.searchParams
    const countOnly = params.get('countOnly') === 'true'

    if (countOnly) {
      const count = await getUnreadNotificationCount(profile.id)
      return NextResponse.json({ unreadCount: count })
    }

    const unreadOnly = params.get('unreadOnly') === 'true'
    const limit = parseInt(params.get('limit') || '50', 10)
    const offset = parseInt(params.get('offset') || '0', 10)

    const result = await getBusinessNotifications(profile.id, { limit, offset, unreadOnly })
    const unreadCount = await getUnreadNotificationCount(profile.id)

    return NextResponse.json({ ...result, unreadCount })
  } catch (err) {
    console.error('[notifications API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/business/notifications
 * Actions: markAllRead, markRead (single)
 * Body: { action: 'markAllRead' } or { action: 'markRead', notificationId: '...' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    if (error || !data?.claims) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', data.claims.sub)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No business profile' }, { status: 404 })
    }

    const body = await request.json()

    if (body.action === 'markAllRead') {
      await markAllNotificationsRead(profile.id)
      return NextResponse.json({ success: true })
    }

    if (body.action === 'markRead' && body.notificationId) {
      const { markNotificationRead } = await import('@/lib/actions/business-notification-actions')
      await markNotificationRead(body.notificationId, profile.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('[notifications API] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
