'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createMockUserMember() {
  const supabase = createAdminClient()
  
  try {
    // Generate a mock wallet pass ID for David
    const mockWalletPassId = 'QWIK-BOURNEMOUTH-DAVID-2024'
    
    // Check if mock user already exists by wallet pass ID
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id, wallet_pass_id')
      .eq('wallet_pass_id', mockWalletPassId)
      .single()

    if (existingUser) {
      return { 
        success: true, 
        message: 'Mock user David already exists', 
        walletPassId: mockWalletPassId,
        data: existingUser 
      }
    }

    // Create user member directly (NO AUTH USER NEEDED)
    // In real system, this happens when wallet pass is installed

    // Generate internal user ID
    const userId = crypto.randomUUID()

    // Create the app user profile with rich mock data
    const { data: appUser, error: memberError } = await supabase
      .from('app_users')
      .insert({
        user_id: userId,
        name: 'David',
        email: 'david@qwikker.com', // Optional - just for demo
        wallet_pass_id: mockWalletPassId, // THIS IS THE KEY IDENTIFIER
        city: 'bournemouth',
        total_points: 0,
        level: 1,
        experience_points: 0,
        tier: 'explorer',
        preferred_categories: ['Restaurant', 'Cafe', 'Bar'],
        dietary_restrictions: [],
        preferred_radius_miles: 5,
        stats: {
          businessesVisited: 0,
          secretItemsUnlocked: 0,
          offersRedeemed: 0,
          friendsReferred: 0,
          reviewsWritten: 0,
          photosShared: 0,
          chatMessages: 0,
          streakDays: 0
        },
        badges: [],
        referral_code: 'DAVID-QWK-2024',
        wallet_pass_status: 'active',
        wallet_pass_assigned_at: new Date().toISOString(),
        profile_completion_percentage: 85,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        current_streak_days: 3,
        longest_streak_days: 7
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error creating user member:', memberError)
      throw memberError
    }

    // Create some mock points transactions
    await supabase.from('points_transactions').insert([
      {
        user_id: userId,
        type: 'earned',
        amount: 25,
        reason: 'business_visit',
        description: 'Visited The Seaside Bistro',
        related_item_type: 'business',
        related_item_id: '1',
        related_item_name: 'The Seaside Bistro'
      },
      {
        user_id: userId,
        type: 'earned',
        amount: 50,
        reason: 'secret_unlock',
        description: 'Unlocked secret menu item at Artisan Coffee Co.',
        related_item_type: 'secret_item',
        related_item_id: '2',
        related_item_name: 'Secret Espresso Blend'
      },
      {
        user_id: userId,
        type: 'earned',
        amount: 10,
        reason: 'offer_redeem',
        description: 'Redeemed 2-for-1 Fish & Chips offer',
        related_item_type: 'offer',
        related_item_id: '1',
        related_item_name: '2-for-1 Fish & Chips'
      }
    ])

    return { 
      success: true, 
      message: 'Mock user David created with wallet pass authentication', 
      walletPassId: mockWalletPassId,
      data: appUser 
    }

  } catch (error) {
    console.error('Error in createMockUserMember:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
