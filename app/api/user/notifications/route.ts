import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * User Notifications Feed API
 * 
 * Returns chronological list of push notifications received by the user.
 * Supports both Supabase Auth users and wallet_pass_id identification.
 * 
 * GET /api/user/notifications?wallet_pass_id=xxx&limit=50&offset=0
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletPassIdParam = searchParams.get('wallet_pass_id')
  
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
  
  // Fall back to wallet_pass_id query param
  if (!walletPassId && walletPassIdParam) {
    walletPassId = walletPassIdParam
  }

  if (!walletPassId) {
    return NextResponse.json({ error: 'No wallet pass found' }, { status: 404 })
  }

  // Use service role client for data queries (wallet pass users have no auth session)
  const supabase = createServiceRoleClient()

  // Pagination
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  // Fetch notifications for this wallet pass
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
    .eq('wallet_pass_id', walletPassId)
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
  
  let businessMap = new Map()
  if (businessIds.length > 0) {
    const { data: businesses, error: bizError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', businessIds)
    if (bizError) {
      console.error('Error fetching business names:', bizError)
    }
    businessMap = new Map(businesses?.map(b => [b.id, b]) || [])
  }

  // Format response
  const formatted = (notifications || []).map((n: any) => {
    const pushData = Array.isArray(n.push_notifications) 
      ? n.push_notifications[0] 
      : n.push_notifications
    
    if (!pushData) return null
    
    const business = businessMap.get(pushData.business_id) || { business_name: 'Unknown' }
    
    return {
      id: n.id,
      message: n.personalized_message || pushData.message,
      sentAt: n.sent_at,
      destinationUrl: pushData.destination_url,
      trackingUrl: n.tracking_url || pushData.destination_url,
      businessId: pushData.business_id,
      businessName: business.business_name || 'Unknown',
      businessLogo: null, // logo_url not yet on business_profiles
      city: pushData.city,
      shortCode: pushData.short_code
    }
  }).filter(Boolean)

  return NextResponse.json({
    success: true,
    notifications: formatted,
    pagination: { limit, offset, hasMore: formatted.length === limit }
  })
}
