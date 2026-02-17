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

    // Count unique clickers by wallet_pass_id
    const uniqueClickers = new Set(
      clicks?.map((c: any) => c.wallet_pass_id).filter(Boolean) || []
    )
    const totalClicked = uniqueClickers.size

    // Calculate CTR
    const clickThroughRate = totalSent > 0 
      ? Math.round((totalClicked / totalSent) * 100 * 10) / 10  // Round to 1 decimal
      : 0

    return NextResponse.json({
      eligiblePasses: eligiblePasses || 0,
      sentCount,
      clickThroughRate,
      stats: {
        totalSent,
        totalClicked
      }
    })

  } catch (error: any) {
    console.error('Notification stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
