import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/notification-stats
 * 
 * Fetch real-time push notification statistics for the authenticated business
 * 
 * Returns:
 * - eligiblePasses: Count of users with marketing consent in business's city
 * - sentCount: Number of notifications sent in last 30 days
 * - clickThroughRate: Percentage of recipients who clicked (0-100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get business profile
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, city')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      )
    }

    // Use service role for cross-table data queries (business owner can't read app_users via RLS)
    const adminClient = createServiceRoleClient()

    // Query 1: Count eligible passes in business's city
    const { count: eligiblePasses, error: eligibleError } = await adminClient
      .from('app_users')
      .select('*', { count: 'exact', head: true })
      .eq('city', profile.city)
      .not('wallet_pass_id', 'is', null)
      .eq('wallet_pass_status', 'active')
      .eq('marketing_push_consent', true)

    if (eligibleError) {
      console.error('Error fetching eligible passes:', eligibleError)
      return NextResponse.json(
        { error: 'Failed to fetch eligible passes' },
        { status: 500 }
      )
    }

    // Query 2: Count notifications sent in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: sentNotifications, error: sentError } = await adminClient
      .from('push_notifications')
      .select('id, push_notification_recipients!inner(status)')
      .eq('business_id', profile.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (sentError) {
      console.error('Error fetching sent notifications:', sentError)
      return NextResponse.json(
        { error: 'Failed to fetch sent notifications' },
        { status: 500 }
      )
    }

    // Count distinct notifications that have at least one 'sent' recipient
    const sentCount = sentNotifications?.filter(notif => {
      const recipients = notif.push_notification_recipients as any
      if (Array.isArray(recipients)) {
        return recipients.some((r: any) => r.status === 'sent')
      }
      return recipients?.status === 'sent'
    }).length || 0

    // Query 3: Calculate click-through rate
    // Get all sent recipients from last 30 days
    const { data: recipients, error: recipientsError } = await adminClient
      .from('push_notification_recipients')
      .select(`
        id,
        status,
        push_notifications!inner(business_id, created_at)
      `)
      .eq('push_notifications.business_id', profile.id)
      .gte('push_notifications.created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'sent')

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json(
        { error: 'Failed to fetch recipients' },
        { status: 500 }
      )
    }

    const totalSent = recipients?.length || 0

    // Get click counts - clicks link directly to push_notifications via push_notification_id
    const { data: clicks, error: clicksError } = await adminClient
      .from('push_notification_clicks')
      .select(`
        id,
        wallet_pass_id,
        push_notification_id,
        push_notifications!inner(business_id, created_at)
      `)
      .eq('push_notifications.business_id', profile.id)
      .gte('push_notifications.created_at', thirtyDaysAgo.toISOString())

    if (clicksError) {
      console.error('Error fetching clicks:', clicksError)
      // Don't fail the whole request, just return 0 CTR
    }

    // Count unique clicks per (notification, user) pair
    // This measures "what % of sends resulted in a click"
    const clickPairs = new Set(
      clicks?.map((c: any) => `${c.push_notification_id}:${c.wallet_pass_id}`).filter(Boolean) || []
    )
    const totalClicked = clickPairs.size

    // Calculate CTR: unique (notification, user) clicks / total sent recipients
    const clickThroughRate = totalSent > 0 
      ? Math.round((totalClicked / totalSent) * 100 * 10) / 10  // Round to 1 decimal
      : 0

    // Query 4: Fetch recent notifications for the "Sent" list (last 30 days, max 20)
    const { data: recentNotifs, error: recentError } = await adminClient
      .from('push_notifications')
      .select('id, message, destination_type, audience_type, sent_count, failed_count, created_at, short_code')
      .eq('business_id', profile.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (recentError) {
      console.error('Error fetching recent notifications:', recentError)
    }

    // For each recent notification, get click count
    const recentIds = (recentNotifs || []).map(n => n.id)
    let clicksByNotif = new Map<string, number>()

    if (recentIds.length > 0) {
      const { data: recentClicks } = await adminClient
        .from('push_notification_clicks')
        .select('push_notification_id')
        .in('push_notification_id', recentIds)

      // Count clicks per notification
      for (const click of recentClicks || []) {
        const count = clicksByNotif.get(click.push_notification_id) || 0
        clicksByNotif.set(click.push_notification_id, count + 1)
      }
    }

    const recentNotifications = (recentNotifs || []).map(n => ({
      id: n.id,
      message: n.message,
      destinationType: n.destination_type,
      audienceType: n.audience_type,
      sentCount: n.sent_count || 0,
      failedCount: n.failed_count || 0,
      clickCount: clicksByNotif.get(n.id) || 0,
      createdAt: n.created_at,
      shortCode: n.short_code,
    }))

    return NextResponse.json({
      eligiblePasses: eligiblePasses || 0,
      sentCount,
      clickThroughRate,
      stats: {
        totalSent,
        totalClicked
      },
      recentNotifications,
    })

  } catch (error: any) {
    console.error('Notification stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
