'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface UserActivity {
  id: string
  type: 'offer_claim' | 'business_visit' | 'secret_unlock' | 'wallet_install' | 'badge_earned'
  message: string
  time: string
  timestamp: Date
  business_name?: string
  offer_title?: string
  iconType: string
  color: string
}

export async function getUserActivity(walletPassId: string, limit: number = 10): Promise<UserActivity[]> {
  try {
    const supabase = createServiceRoleClient()
    const activities: UserActivity[] = []

    // Get user ID from wallet pass
    const { data: user } = await supabase
      .from('app_users')
      .select('user_id, city')
      .eq('wallet_pass_id', walletPassId)
      .single()

    if (!user) {
      console.log('No user found for wallet pass:', walletPassId)
      return []
    }

    // Get recent offer claims
    const { data: offerClaims } = await supabase
      .from('user_offer_claims')
      .select(`
        id,
        offer_title,
        business_name,
        claimed_at,
        status
      `)
      .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)
      .order('claimed_at', { ascending: false })
      .limit(20)

    if (offerClaims) {
      for (const claim of offerClaims) {
        const claimDate = new Date(claim.claimed_at)
        const timeAgo = getTimeAgo(claimDate)

        activities.push({
          id: `claim-${claim.id}`,
          type: 'offer_claim',
          message: `You claimed "${claim.offer_title}" at ${claim.business_name}`,
          time: timeAgo,
          timestamp: claimDate,
          business_name: claim.business_name,
          offer_title: claim.offer_title,
          iconType: 'gift',
          color: 'text-orange-400'
        })
      }
    }

    // Get recent business visits
    const { data: businessVisits } = await supabase
      .from('user_business_visits')
      .select(`
        id,
        visit_date,
        is_first_visit,
        business_id,
        business_profiles!inner(business_name)
      `)
      .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)
      .order('visit_date', { ascending: false })
      .limit(15)

    if (businessVisits) {
      for (const visit of businessVisits) {
        const visitDate = new Date(visit.visit_date)
        const timeAgo = getTimeAgo(visitDate)

        activities.push({
          id: `visit-${visit.id}`,
          type: 'business_visit',
          message: `You visited ${visit.business_profiles?.business_name}${visit.is_first_visit ? ' (first time!)' : ''}`,
          time: timeAgo,
          timestamp: visitDate,
          business_name: visit.business_profiles?.business_name,
          iconType: 'mapPin',
          color: visit.is_first_visit ? 'text-green-400' : 'text-blue-400'
        })
      }
    }

    // Get recent secret unlocks
    const { data: secretUnlocks } = await supabase
      .from('user_secret_unlocks')
      .select(`
        id,
        secret_item_name,
        unlocked_at,
        business_id,
        business_profiles!inner(business_name)
      `)
      .or(`user_id.eq.${user.user_id},wallet_pass_id.eq.${walletPassId}`)
      .order('unlocked_at', { ascending: false })
      .limit(10)

    if (secretUnlocks) {
      for (const unlock of secretUnlocks) {
        const unlockDate = new Date(unlock.unlocked_at)
        const timeAgo = getTimeAgo(unlockDate)

        activities.push({
          id: `secret-${unlock.id}`,
          type: 'secret_unlock',
          message: `You unlocked "${unlock.secret_item_name}" at ${unlock.business_profiles?.business_name}`,
          time: timeAgo,
          timestamp: unlockDate,
          business_name: unlock.business_profiles?.business_name,
          iconType: 'lock',
          color: 'text-purple-400'
        })
      }
    }

    // Sort all activities by timestamp (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)

    return sortedActivities

  } catch (error) {
    console.error('Error fetching user activity:', error)
    return []
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`
}
