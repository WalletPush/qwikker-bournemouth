'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Switch a business from Google verification to Manual listing
 */
export async function switchToManualListing(userId: string) {
  const supabaseAdmin = createAdminClient()
  
  try {
    // Fetch current profile
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, business_name, verification_method, status')
      .eq('user_id', userId)
      .single()
    
    if (fetchError || !profile) {
      return { success: false, error: 'Profile not found' }
    }
    
    // Only allow switching if not already approved
    if (profile.status === 'approved') {
      return { success: false, error: 'Cannot change verification method for approved businesses' }
    }
    
    // Update to manual mode
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        verification_method: 'manual',
        google_place_id: null,
        google_verified_at: null,
        rating: 0,
        review_count: 0,
        google_types: null,
        google_primary_type: null,
        manual_override: false,
      })
      .eq('user_id', userId)
    
    if (updateError) {
      console.error('Error switching to manual:', updateError)
      return { success: false, error: 'Failed to switch verification method' }
    }
    
    console.log(`✅ ${profile.business_name} switched to manual listing`)
    
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/action-items')
    
    return { 
      success: true, 
      message: 'Switched to Manual Listing. Your listing will require admin manual override to go live.' 
    }
    
  } catch (error) {
    console.error('Switch to manual error:', error)
    return { success: false, error: 'Internal error' }
  }
}
