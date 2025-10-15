'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * 🔒 SECURITY: Validate wallet pass ID exists and is active
 * This prevents URL manipulation attacks by verifying the wallet pass ID
 * exists in our database and belongs to an active user.
 */
export async function validateWalletPassId(walletPassId: string): Promise<{
  isValid: boolean
  user?: {
    id: string
    wallet_pass_id: string
    name: string
    email: string
    city: string
    tier?: string
    level?: number
    wallet_pass_status: string
  }
  error?: string
}> {
  if (!walletPassId || walletPassId.length < 10) {
    return { 
      isValid: false, 
      error: 'Invalid wallet pass ID format' 
    }
  }

  try {
    const supabase = createServiceRoleClient()
    
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, wallet_pass_id, name, email, city, tier, level, wallet_pass_status')
      .eq('wallet_pass_id', walletPassId)
      .eq('wallet_pass_status', 'active') // Only allow active passes
      .single()

    if (error || !user) {
      console.log(`🔒 Security: Invalid wallet pass ID attempted: ${walletPassId}`)
      return { 
        isValid: false, 
        error: 'Wallet pass not found or inactive' 
      }
    }

    console.log(`✅ Security: Valid wallet pass ID for user: ${user.name}`)
    return { 
      isValid: true, 
      user: {
        id: user.id,
        wallet_pass_id: user.wallet_pass_id,
        name: user.name,
        email: user.email,
        city: user.city,
        tier: user.tier,
        level: user.level,
        wallet_pass_status: user.wallet_pass_status
      }
    }

  } catch (error) {
    console.error('🔒 Security: Error validating wallet pass ID:', error)
    return { 
      isValid: false, 
      error: 'Validation failed' 
    }
  }
}

/**
 * 🔒 SECURITY: Get validated user from wallet pass ID with fallback
 * This replaces the unsafe pattern of directly querying with URL parameters
 */
export async function getValidatedUser(walletPassId?: string | null) {
  if (!walletPassId) {
    return {
      user: null,
      isValid: false,
      error: 'No wallet pass ID provided'
    }
  }

  const validation = await validateWalletPassId(walletPassId)
  
  if (!validation.isValid) {
    // 🔒 SECURITY: Log potential attack attempts
    console.warn(`🚨 Security Alert: Invalid wallet pass access attempt: ${walletPassId}`)
    return {
      user: null,
      isValid: false,
      error: validation.error
    }
  }

  return {
    user: validation.user,
    isValid: true,
    error: null
  }
}
