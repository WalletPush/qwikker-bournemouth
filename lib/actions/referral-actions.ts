'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendBusinessUpdateNotification } from '@/lib/integrations'
import { revalidatePath } from 'next/cache'

/**
 * Track a referral when a new user signs up with a referral code
 */
export async function trackReferral(referralCode: string, newUserId: string) {
  if (!referralCode || !newUserId) {
    return { success: false, error: 'Missing referral code or user ID' }
  }

  const supabaseAdmin = createAdminClient()

  try {
    // Call the database function to track the referral
    const { error } = await supabaseAdmin.rpc('track_referral', {
      referral_code_param: referralCode,
      new_user_id: newUserId
    })

    if (error) {
      console.error('Error tracking referral:', error)
      return { success: false, error: error.message }
    }

    // Get referrer profile for notification
    const { data: referrerProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('referral_code', referralCode)
      .single()

    // Get new user profile
    const { data: newUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', newUserId)
      .single()

    // Send Slack notification about new referral
    if (referrerProfile && newUserProfile) {
      try {
        await sendBusinessUpdateNotification(referrerProfile, 'referral_signup', {
          referredBusinessName: newUserProfile.business_name || 'New Business',
          referredOwnerName: `${newUserProfile.first_name || ''} ${newUserProfile.last_name || ''}`.trim() || 'New User',
          referralCode: referralCode
        })
      } catch (error) {
        console.error('Slack notification failed (non-critical):', error)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/referrals')
    return { success: true }

  } catch (error) {
    console.error('Error in trackReferral:', error)
    return { success: false, error: 'Failed to track referral' }
  }
}

/**
 * Get referral stats for dashboard
 */
export async function getReferralStats(userId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get user's profile ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }

    // Get referral stats
    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select('status, reward_amount')
      .eq('referrer_id', profile.id)

    if (error) {
      return { success: false, error: error.message }
    }

    const totalReferrals = referrals?.length || 0
    const successfulReferrals = referrals?.filter(r => r.status === 'approved' || r.status === 'credited').length || 0
    const totalEarnings = referrals?.filter(r => r.status === 'credited').reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0

    return { 
      success: true, 
      data: {
        totalReferrals,
        successfulReferrals,
        totalEarnings
      }
    }

  } catch (error) {
    console.error('Error getting referral stats:', error)
    return { success: false, error: 'Failed to get referral stats' }
  }
}

/**
 * Get referrals for a user
 */
export async function getUserReferrals(userId: string) {
  const supabaseAdmin = createAdminClient()

  try {
    // Get user's profile ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!profile) {
      return { success: false, error: 'Profile not found' }
    }

    // Get referrals with referred user details
    const { data: referrals, error } = await supabaseAdmin
      .from('referrals')
      .select(`
        *,
        referred:referred_id (
          business_name,
          first_name,
          last_name
        )
      `)
      .eq('referrer_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: referrals }

  } catch (error) {
    console.error('Error getting user referrals:', error)
    return { success: false, error: 'Failed to get referrals' }
  }
}

/**
 * Update referral status (for admin use)
 */
export async function updateReferralStatus(referralId: string, status: 'pending' | 'approved' | 'credited' | 'rejected') {
  const supabaseAdmin = createAdminClient()

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // If crediting, add credited_date
    if (status === 'credited') {
      updateData.credited_date = new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('referrals')
      .update(updateData)
      .eq('id', referralId)
      .select(`
        *,
        referrer:referrer_id (
          business_name,
          first_name,
          last_name,
          user_id
        ),
        referred:referred_id (
          business_name,
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Send notification if status changed to credited
    if (status === 'credited' && data.referrer) {
      try {
        await sendBusinessUpdateNotification(data.referrer, 'referral_credited', {
          referredBusinessName: data.referred?.business_name || 'Business',
          rewardAmount: data.reward_amount,
          currency: data.reward_currency
        })
      } catch (error) {
        console.error('Slack notification failed (non-critical):', error)
      }
    }

    revalidatePath('/dashboard/referrals')
    return { success: true, data }

  } catch (error) {
    console.error('Error updating referral status:', error)
    return { success: false, error: 'Failed to update referral status' }
  }
}
