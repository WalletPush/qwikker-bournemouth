'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface GoogleVerificationData {
  placeId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  website: string | null
  types: string[]
  rating: number
  userRatingsTotal: number
  googlePrimaryType: string | null
  normalizedTown: string | null
  postcode: string | null
}

/**
 * Update business profile with Google verification data
 * 
 * This function updates an EXISTING business profile with verification data
 * after a business owner selects their business via Google Places.
 * 
 * Authorization: Only the profile owner can update their own profile.
 */
export async function updateProfileWithGoogleVerification(
  businessId: string,
  googleData: GoogleVerificationData
) {
  const supabase = await createClient()
  
  try {
    // 1. Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { 
        success: false, 
        error: 'Not authenticated' 
      }
    }
    
    // 2. Verify ownership: fetch profile and check user_id matches
    const { data: profile, error: fetchError } = await supabase
      .from('business_profiles')
      .select('id, user_id, business_name')
      .eq('id', businessId)
      .single()
    
    if (fetchError || !profile) {
      return { 
        success: false, 
        error: 'Business profile not found' 
      }
    }
    
    if (profile.user_id !== user.id) {
      console.error('🚫 Authorization failed: user does not own this business')
      return { 
        success: false, 
        error: 'Not authorized to update this business' 
      }
    }
    
    // 3. Update profile with Google verification data
    const updateData = {
      google_place_id: googleData.placeId,
      google_verified_at: new Date().toISOString(),
      verification_method: 'google',
      latitude: googleData.latitude,
      longitude: googleData.longitude,
      rating: googleData.rating,
      review_count: googleData.userRatingsTotal,
      google_types: googleData.types,
      google_primary_type: googleData.googlePrimaryType,
      // Optionally update address/website if they differ
      business_address: googleData.formattedAddress,
      website_url: googleData.website || undefined,
      updated_at: new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update(updateData)
      .eq('id', businessId)
      .eq('user_id', user.id) // Double-check ownership in the query
    
    if (updateError) {
      console.error('❌ Failed to update profile with Google verification:', updateError)
      return { 
        success: false, 
        error: 'Failed to save verification data' 
      }
    }
    
    console.log(`✅ ${profile.business_name} verified with Google (place: ${googleData.name})`)
    
    // 4. Revalidate relevant pages
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/profile')
    
    return { 
      success: true,
      data: {
        businessName: googleData.name,
        formattedAddress: googleData.formattedAddress,
        rating: googleData.rating
      }
    }
    
  } catch (error) {
    console.error('❌ updateProfileWithGoogleVerification error:', error)
    return { 
      success: false, 
      error: 'Internal error during verification' 
    }
  }
}
