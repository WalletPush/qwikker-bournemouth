'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface ActivityItem {
  id: string
  type: 'business_joined' | 'offer_added' | 'secret_menu_added' | 'business_updated'
  icon: string
  text: string
  subtext: string
  color: string
  href: string
  time: string
  timestamp: Date
}

export async function getRecentBusinessActivity(franchiseCity?: string): Promise<ActivityItem[]> {
  const supabase = createServiceRoleClient()
  const activity: ActivityItem[] = []

  try {
    // Get recently joined businesses (last 7 days) - FRANCHISE FILTERED + ELIGIBILITY FILTERED
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    let query = supabase
      .from('business_profiles')
      .select(`
        business_name, 
        created_at, 
        business_town, 
        city,
        business_subscriptions!business_subscriptions_business_id_fkey(
          is_in_free_trial,
          free_trial_end_date,
          status
        )
      `)
      .eq('status', 'approved')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10) // Fetch more to account for expired trials
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      query = query.eq('city', franchiseCity)
    }
    
    const { data: recentBusinesses } = await query
    
    // ✅ CRITICAL: Filter out expired trial businesses
    const activeBusinesses = (recentBusinesses || []).filter(business => {
      if (!business.business_subscriptions || !Array.isArray(business.business_subscriptions) || business.business_subscriptions.length === 0) {
        return true // No subscription = legacy/unclaimed (show)
      }
      
      const sub = business.business_subscriptions[0]
      if (!sub.is_in_free_trial) return true // Paid customer (show)
      
      if (sub.free_trial_end_date) {
        const endDate = new Date(sub.free_trial_end_date)
        const now = new Date()
        return endDate >= now // Only show if trial NOT expired
      }
      
      return true
    })

    activeBusinesses?.slice(0, 5).forEach(business => {
      activity.push({
        id: `business-${business.business_name}-${business.created_at}`,
        type: 'business_joined',
        icon: 'location',
        text: `New business ${business.business_name} joined Qwikker`,
        subtext: `${business.business_town} • Discover new places`,
        color: 'green',
        href: '/user/discover',
        time: formatTimeAgo(new Date(business.created_at)),
        timestamp: new Date(business.created_at)
      })
    })

    // ✅ Get recently added offers from business_offers table (NOT legacy offer_name column)
    let offersQuery = supabase
      .from('business_offers')
      .select(`
        id,
        offer_name,
        offer_start_date,
        offer_end_date,
        created_at,
        status,
        business_profiles!inner(
          business_name,
          business_town,
          city,
          business_subscriptions!business_subscriptions_business_id_fkey(
            is_in_free_trial,
            free_trial_end_date,
            status
          )
        )
      `)
      .eq('status', 'approved')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10) // Fetch more to account for filtering
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      offersQuery = offersQuery.eq('business_profiles.city', franchiseCity)
    }
    
    const { data: recentOffers } = await offersQuery
    
    // ✅ CRITICAL: Filter expired offers AND expired trial businesses
    const now = new Date()
    const activeOffers = (recentOffers || []).filter(offer => {
      // Check offer expiry
      if (offer.offer_end_date) {
        const endDate = new Date(offer.offer_end_date)
        if (endDate < now) return false // Expired offer
      }
      
      // Check business eligibility (expired trial filter)
      const business = offer.business_profiles
      if (!business) return false
      
      if (!business.business_subscriptions || !Array.isArray(business.business_subscriptions) || business.business_subscriptions.length === 0) {
        return true // No subscription = legacy/unclaimed (show)
      }
      
      const sub = business.business_subscriptions[0]
      if (!sub.is_in_free_trial) return true // Paid customer (show)
      
      if (sub.free_trial_end_date) {
        const trialEndDate = new Date(sub.free_trial_end_date)
        return trialEndDate >= now // Only show if trial NOT expired
      }
      
      return true
    })

    activeOffers?.slice(0, 5).forEach(offer => {
      const business = offer.business_profiles
      activity.push({
        id: `offer-${offer.id}-${offer.created_at}`,
        type: 'offer_added',
        icon: 'tag',
        text: `${business.business_name} added "${offer.offer_name}"`,
        subtext: `${business.business_town} • Check out this offer`,
        color: 'orange',
        href: '/user/offers',
        time: formatTimeAgo(new Date(offer.created_at)),
        timestamp: new Date(offer.created_at)
      })
    })

    // Get businesses with secret menu items (from additional_notes) - FRANCHISE FILTERED + ELIGIBILITY FILTERED
    let secretQuery = supabase
      .from('business_profiles')
      .select(`
        business_name, 
        additional_notes, 
        updated_at, 
        business_town, 
        city,
        business_subscriptions!business_subscriptions_business_id_fkey(
          is_in_free_trial,
          free_trial_end_date,
          status
        )
      `)
      .eq('status', 'approved')
      .not('additional_notes', 'is', null)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(10) // Fetch more to account for expired trials
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      secretQuery = secretQuery.eq('city', franchiseCity)
    }
    
    const { data: secretMenuBusinesses } = await secretQuery
    
    // ✅ CRITICAL: Filter out expired trial businesses
    const activeSecretMenuBusinesses = (secretMenuBusinesses || []).filter(business => {
      if (!business.business_subscriptions || !Array.isArray(business.business_subscriptions) || business.business_subscriptions.length === 0) {
        return true // No subscription = legacy/unclaimed (show)
      }
      
      const sub = business.business_subscriptions[0]
      if (!sub.is_in_free_trial) return true // Paid customer (show)
      
      if (sub.free_trial_end_date) {
        const endDate = new Date(sub.free_trial_end_date)
        const now = new Date()
        return endDate >= now // Only show if trial NOT expired
      }
      
      return true
    })

    activeSecretMenuBusinesses?.slice(0, 3).forEach(business => {
      try {
        const notes = JSON.parse(business.additional_notes || '{}')
        if (notes.secret_menu_items && notes.secret_menu_items.length > 0) {
          activity.push({
            id: `secret-${business.business_name}-${business.updated_at}`,
            type: 'secret_menu_added',
            icon: 'lock',
            text: `${business.business_name} added secret menu items`,
            subtext: `${business.business_town} • Unlock hidden treasures`,
            color: 'purple',
            href: '/user/secret-menu',
            time: formatTimeAgo(new Date(business.updated_at)),
            timestamp: new Date(business.updated_at)
          })
        }
      } catch (e) {
        // Skip if JSON parsing fails
      }
    })

    // Sort all activity by timestamp (most recent first)
    activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // Return top 4 most recent activities
    return activity.slice(0, 4)

  } catch (error) {
    console.error('Error fetching recent business activity:', error)
    return []
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString()
}
