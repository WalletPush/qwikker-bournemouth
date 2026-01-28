'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 💚 Qwikker Vibes - Get aggregate vibe stats for a business
 * 
 * Returns vibe statistics including total vibes, positive count, and percentage.
 * Handles zero-vibes case cleanly (no divide-by-zero).
 * 
 * @param businessId - UUID of the business
 * @returns Vibe statistics or null if error
 */
export async function getBusinessVibeStats(businessId: string): Promise<{
  total_vibes: number
  positive_vibes: number
  positive_percentage: number
  loved_it_count: number
  it_was_good_count: number
  not_for_me_count: number
} | null> {
  try {
    const supabase = createServiceRoleClient()
    
    // Fetch all vibes for this business
    const { data: vibes, error } = await supabase
      .from('qwikker_vibes')
      .select('vibe_rating')
      .eq('business_id', businessId)
    
    if (error) {
      console.error(`❌ Error fetching vibes for business ${businessId}:`, error)
      return null
    }
    
    // Handle no vibes case
    if (!vibes || vibes.length === 0) {
      return {
        total_vibes: 0,
        positive_vibes: 0,
        positive_percentage: 0,
        loved_it_count: 0,
        it_was_good_count: 0,
        not_for_me_count: 0
      }
    }
    
    // Count each vibe type
    const loved_it_count = vibes.filter(v => v.vibe_rating === 'loved_it').length
    const it_was_good_count = vibes.filter(v => v.vibe_rating === 'it_was_good').length
    const not_for_me_count = vibes.filter(v => v.vibe_rating === 'not_for_me').length
    
    const total_vibes = vibes.length
    const positive_vibes = loved_it_count + it_was_good_count
    
    // Calculate percentage (avoid divide-by-zero)
    const positive_percentage = total_vibes > 0 
      ? Math.round((positive_vibes / total_vibes) * 100)
      : 0
    
    return {
      total_vibes,
      positive_vibes,
      positive_percentage,
      loved_it_count,
      it_was_good_count,
      not_for_me_count
    }
    
  } catch (error) {
    console.error(`❌ Error calculating vibes for business ${businessId}:`, error)
    return null
  }
}

/**
 * 💚 Get user's vibe for a specific business (if exists)
 * 
 * Used to check if user has already vibed this business (for UI state).
 * 
 * @param businessId - UUID of the business
 * @param vibeUserKey - Stable user key (persists across reinstalls)
 * @returns The user's vibe rating or null if not found
 */
export async function getUserVibeForBusiness(
  businessId: string,
  vibeUserKey: string
): Promise<'loved_it' | 'it_was_good' | 'not_for_me' | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: vibe, error } = await supabase
      .from('qwikker_vibes')
      .select('vibe_rating')
      .eq('business_id', businessId)
      .eq('vibe_user_key', vibeUserKey)
      .maybeSingle()
    
    if (error) {
      console.error(`❌ Error fetching user vibe:`, error)
      return null
    }
    
    return vibe?.vibe_rating as 'loved_it' | 'it_was_good' | 'not_for_me' | null
    
  } catch (error) {
    console.error(`❌ Error fetching user vibe:`, error)
    return null
  }
}
