import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * User Notifications Feed API
 * 
 * Returns chronological list of push notifications received by the user.
 * Solves the "Last_Message overwrite" problem by providing full history in-app.
 * 
 * GET /api/user/notifications?limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's wallet_pass_id
  const { data: appUser } = await supabase
    .from('app_users')
    .select('wallet_pass_id')
    .eq('user_id', user.id)
    .single()

  if (!appUser?.wallet_pass_id) {
    return NextResponse.json({ error: 'No wallet pass found' }, { status: 404 })
  }

  // Pagination
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  // Fetch notifications (RLS enforced)
  const { data: notifications, error } = await supabase
    .from('push_notification_recipients')
    .select(`
      id,
      sent_at,
      personalized_message,
      tracking_url,
      push_notifications!inner(
        id,
        message,
        destination_url,
        city,
        business_id,
        created_at,
        short_code
      )
    `)
    .eq('wallet_pass_id', appUser.wallet_pass_id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }

  // Get business names
  const businessIds = [...new Set(
    (notifications || [])
      .map((n: any) => {
        const pushData = Array.isArray(n.push_notifications) ? n.push_notifications[0] : n.push_notifications
        return pushData?.business_id
      })
      .filter(Boolean)
  )]
  
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select('id, business_name, logo_url')
    .in('id', businessIds)

  const businessMap = new Map(businesses?.map(b => [b.id, b]) || [])

  // Format response
  const formatted = (notifications || []).map((n: any) => {
    // Handle both array and object responses from Supabase
    const pushData = Array.isArray(n.push_notifications) 
      ? n.push_notifications[0] 
      : n.push_notifications
    
    if (!pushData) return null
    
    const business = businessMap.get(pushData.business_id) || { business_name: 'Unknown', logo_url: null }
    
    return {
      id: n.id,
      message: n.personalized_message || pushData.message,
      sentAt: n.sent_at,
      destinationUrl: pushData.destination_url,
      // UX WIN: Always use tracking_url (guarantees identity even without cookies)
      trackingUrl: n.tracking_url || pushData.destination_url, // fallback if tracking_url null
      businessId: pushData.business_id,
      businessName: business.business_name || 'Unknown',
      businessLogo: business.logo_url,
      city: pushData.city,
      shortCode: pushData.short_code // For future use (re-open notification)
    }
  }).filter(Boolean) // Remove any null entries

  return NextResponse.json({
    success: true,
    notifications: formatted,
    pagination: { limit, offset, hasMore: formatted.length === limit }
  })
}
