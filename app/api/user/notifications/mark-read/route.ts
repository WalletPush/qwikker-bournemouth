import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Mark Notifications as Read
 * 
 * Supports marking individual notifications or all unread notifications.
 * Identifies user via Supabase Auth or wallet_pass_id.
 * 
 * POST /api/user/notifications/mark-read
 * Body: { notificationIds?: string[], markAll?: boolean, wallet_pass_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds, markAll, wallet_pass_id: walletPassIdBody } = body

    let walletPassId: string | null = null

    // Try Supabase Auth first
    try {
      const supabaseAuth = await createClient()
      const { data: { user } } = await supabaseAuth.auth.getUser()

      if (user) {
        const serviceClient = createServiceRoleClient()
        const { data: appUser } = await serviceClient
          .from('app_users')
          .select('wallet_pass_id')
          .eq('user_id', user.id)
          .maybeSingle()
        walletPassId = appUser?.wallet_pass_id || null
      }
    } catch {
      // Auth check failed - fall through to wallet_pass_id param
    }

    // Fall back to wallet_pass_id from request body
    if (!walletPassId && walletPassIdBody) {
      walletPassId = walletPassIdBody
    }

    if (!walletPassId) {
      return NextResponse.json({ error: 'No wallet pass found' }, { status: 404 })
    }

    if (!markAll && (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)) {
      return NextResponse.json(
        { error: 'Provide notificationIds array or set markAll: true' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const now = new Date().toISOString()

    let markedCount = 0

    if (markAll) {
      // Mark all unread notifications as read for this wallet pass
      const { data, error } = await supabase
        .from('push_notification_recipients')
        .update({ read_at: now })
        .eq('wallet_pass_id', walletPassId)
        .eq('status', 'sent')
        .is('read_at', null)
        .select('id')

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
      }

      markedCount = data?.length || 0
    } else {
      // Mark specific notifications as read (verify they belong to this wallet pass)
      const { data, error } = await supabase
        .from('push_notification_recipients')
        .update({ read_at: now })
        .eq('wallet_pass_id', walletPassId)
        .in('id', notificationIds!)
        .is('read_at', null)
        .select('id')

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
      }

      markedCount = data?.length || 0
    }

    return NextResponse.json({ success: true, markedCount })
  } catch (error: unknown) {
    console.error('Mark-read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
