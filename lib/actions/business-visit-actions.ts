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
    
    // Check if this is a first visit (if we have a user_id)
    let isFirstVisit = false
    if (visitorUserId) {
      const { data: existingVisit } = await supabase
        .from('user_business_visits')
        .select('id')
        .eq('user_id', visitorUserId)
        .eq('business_id', businessId)
        .single()
      
      isFirstVisit = !existingVisit
    }
    
    // Only record the visit if we have a valid user_id (registered users only)
    if (visitorUserId) {
      const { error: visitError } = await supabase
        .from('user_business_visits')
        .insert({
          user_id: visitorUserId,
          business_id: businessId,
          visit_date: new Date().toISOString(),
          is_first_visit: isFirstVisit,
          points_earned: isFirstVisit ? 25 : 5 // More points for first visit
        })
      
      if (visitError) {
        console.error('Error tracking business visit:', visitError)
        return { success: false, error: visitError.message }
      }
    } else {
      // For anonymous users, we could track in a separate table or just log
      console.log(`📊 Anonymous user viewed business ${businessId}`)
    }
    
    // Award points if user is registered
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
        console.error('Error awarding points:', pointsError)
      }
    }
    
    console.log(`✅ Business visit tracked: ${visitorName || 'Anonymous'} visited business ${businessId}`)
    
    return { 
      success: true, 
      isFirstVisit,
      visitorName: visitorName || 'Anonymous user',
      pointsEarned: isFirstVisit ? 25 : 5
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
