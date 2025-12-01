'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

interface TrackBusinessVisitParams {
  businessId: string
  visitorName?: string
  visitorWalletPassId?: string
}

export async function trackBusinessVisit({ businessId, visitorName, visitorWalletPassId }: TrackBusinessVisitParams) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get the visitor's user_id if they have a wallet pass
    let visitorUserId = null
    if (visitorWalletPassId) {
      const { data: visitor } = await supabase
        .from('app_users')
        .select('user_id, first_name, last_name')
        .eq('wallet_pass_id', visitorWalletPassId)
        .single()
      
      if (visitor) {
        visitorUserId = visitor.user_id
        visitorName = `${visitor.first_name} ${visitor.last_name}`.trim()
      }
    }
    
    // Check if this is a first visit (check by user_id OR wallet_pass_id)
    // For anonymous visitors, always treat as new visit (we don't track session)
    let isFirstVisit = true
    if (visitorUserId || visitorWalletPassId) {
      const { data: existingVisit } = await supabase
        .from('user_business_visits')
        .select('id')
        .eq('business_id', businessId)
        .or(`user_id.eq.${visitorUserId || 'null'},wallet_pass_id.eq.${visitorWalletPassId || 'null'}`)
        .single()
      
      isFirstVisit = !existingVisit
    }
    
    // ALWAYS record the visit for analytics (even anonymous visitors!)
    const { error: visitError } = await supabase
      .from('user_business_visits')
      .insert({
        user_id: visitorUserId, // Can be null for anonymous users
        wallet_pass_id: visitorWalletPassId, // Can be null for anonymous users
        business_id: businessId,
        visit_date: new Date().toISOString(),
        is_first_visit: isFirstVisit,
        points_earned: (visitorUserId || visitorWalletPassId) ? (isFirstVisit ? 25 : 5) : 0 // No points for anonymous
      })
    
    if (visitError) {
      console.error('❌ Error tracking business visit:', visitError)
      return { success: false, error: visitError.message }
    }
    
    console.log(`✅ Business visit tracked: ${visitorName || 'Anonymous'} visited business ${businessId} (first visit: ${isFirstVisit}, registered: ${!!(visitorUserId || visitorWalletPassId)})`)
    
    // Award points if user is registered (not anonymous)
    let pointsAwarded = 0
    if (visitorUserId && isFirstVisit) {
      // Award points for first visit
      const { error: pointsError } = await supabase.rpc('award_points', {
        p_user_id: visitorUserId,
        p_amount: 25,
        p_reason: 'first_visit',
        p_description: 'First visit to a business',
        p_related_item_type: 'business',
        p_related_item_id: businessId
      })
      
      if (pointsError) {
        console.error('❌ Error awarding points:', pointsError)
      } else {
        pointsAwarded = 25
        console.log(`🎉 Awarded ${pointsAwarded} points to ${visitorName}`)
      }
    }
    
    return { 
      success: true, 
      isFirstVisit,
      visitorName: visitorName || 'Anonymous user',
      pointsEarned: pointsAwarded,
      isAnonymous: !visitorUserId && !visitorWalletPassId
    }
    
  } catch (error) {
    console.error('Error in trackBusinessVisit:', error)
    return { success: false, error: 'Failed to track business visit' }
  }
}

export async function getBusinessVisits(businessId: string, limit: number = 10) {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: visits, error } = await supabase
      .from('user_business_visits')
      .select(`
        id,
        visit_date,
        is_first_visit,
        points_earned,
        app_users (
          first_name,
          last_name,
          wallet_pass_id
        )
      `)
      .eq('business_id', businessId)
      .order('visit_date', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching business visits:', error)
      return { success: false, error: error.message, visits: [] }
    }
    
    return { 
      success: true, 
      visits: visits || [],
      error: null
    }
    
  } catch (error) {
    console.error('Error in getBusinessVisits:', error)
    return { success: false, error: 'Failed to fetch business visits', visits: [] }
  }
}
