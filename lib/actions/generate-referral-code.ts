'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Generate referral code for a user if they don't have one
 */
export async function generateReferralCodeForUser(userId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // First check if user already has a referral code
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('referral_code')
      .eq('user_id', userId)
      .single()

    if (profile?.referral_code) {
      return { success: true, code: profile.referral_code }
    }

    // Generate a new referral code using the database function
    const { data: codeResult } = await supabaseAdmin
      .rpc('generate_referral_code')

    if (!codeResult) {
      return { success: false, error: 'Failed to generate referral code' }
    }

    // Update the profile with the new referral code
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ referral_code: codeResult })
      .eq('user_id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    revalidatePath('/dashboard/referrals')
    return { success: true, code: codeResult }

  } catch (error) {
    console.error('Error generating referral code:', error)
    return { success: false, error: 'Failed to generate referral code' }
  }
}
