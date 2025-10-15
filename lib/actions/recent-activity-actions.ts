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
    // Get recently joined businesses (last 7 days) - FRANCHISE FILTERED
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    let query = supabase
      .from('business_profiles')
      .select('business_name, created_at, business_town, city')
      .eq('status', 'approved')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      query = query.eq('city', franchiseCity)
    }
    
    const { data: recentBusinesses } = await query

    recentBusinesses?.forEach(business => {
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

    // Get recently added offers (businesses that got offers in last 7 days) - FRANCHISE FILTERED
    let offersQuery = supabase
      .from('business_profiles')
      .select('business_name, offer_name, updated_at, business_town, city')
      .eq('status', 'approved')
      .not('offer_name', 'is', null)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(5)
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      offersQuery = offersQuery.eq('city', franchiseCity)
    }
    
    const { data: recentOffers } = await offersQuery

    recentOffers?.forEach(business => {
      activity.push({
        id: `offer-${business.business_name}-${business.updated_at}`,
        type: 'offer_added',
        icon: 'tag',
        text: `${business.business_name} added "${business.offer_name}"`,
        subtext: `${business.business_town} • Check out this offer`,
        color: 'orange',
        href: '/user/offers',
        time: formatTimeAgo(new Date(business.updated_at)),
        timestamp: new Date(business.updated_at)
      })
    })

    // Get businesses with secret menu items (from additional_notes) - FRANCHISE FILTERED
    let secretQuery = supabase
      .from('business_profiles')
      .select('business_name, additional_notes, updated_at, business_town, city')
      .eq('status', 'approved')
      .not('additional_notes', 'is', null)
      .gte('updated_at', sevenDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(3)
    
    // 🔒 SECURITY: Filter by franchise if provided
    if (franchiseCity) {
      secretQuery = secretQuery.eq('city', franchiseCity)
    }
    
    const { data: secretMenuBusinesses } = await secretQuery

    secretMenuBusinesses?.forEach(business => {
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
