'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createOrUpdateProfile(profileData: any, userId: string) {
  const supabase = createAdminClient()
  
  try {
    // First, verify the user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser.user) {
      console.error('Auth user not found:', authError)
      throw new Error('User account not found. Please try again.')
    }

    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Use the admin client to upsert the profile (bypasses RLS)
    const { data: profile, error } = await supabase
      .from('profiles')
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

    if (error) {
      console.error('Profile creation error:', error)
      throw new Error(`Profile creation failed: ${error.message}`)
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
