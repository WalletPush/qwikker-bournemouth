'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createOrUpdateProfile(profileData: any, userId: string) {
  const supabase = createAdminClient()
  
  try {
    // Retry logic for user verification
    let authUser = null
    let retries = 0
    const maxRetries = 5
    
    while (retries < maxRetries) {
      const { data, error } = await supabase.auth.admin.getUserById(userId)
      
      if (!error && data.user) {
        authUser = data.user
        break
      }
      
      console.log(`Auth user not found, retry ${retries + 1}/${maxRetries}`)
      retries++
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between retries
    }

    if (!authUser) {
      throw new Error('User account not found after multiple attempts. Please try again.')
    }

    // Retry logic for profile creation
    let profile = null
    retries = 0
    
    while (retries < maxRetries) {
      try {
        const { data, error } = await supabase
          .from('business_profiles')
          .upsert({
            ...profileData,
            user_id: userId,
            plan: 'starter',
            is_founder: new Date() < new Date('2025-12-31')
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single()

        if (!error && data) {
          profile = data
          break
        }
        
        if (error && error.code === '23503') {
          // Foreign key constraint violation - user not yet available
          console.log(`Foreign key constraint error, retry ${retries + 1}/${maxRetries}`)
          retries++
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
        
        // Other errors should be thrown immediately
        throw error
        
      } catch (err) {
        if (retries === maxRetries - 1) {
          throw err
        }
        retries++
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!profile) {
      throw new Error('Profile creation failed after multiple attempts')
    }

    return { success: true, profile }
  } catch (error) {
    console.error('Profile action error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
