'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAppUsers() {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching user members:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, error: null, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Failed to fetch user members', data: null }
  }
}

export async function getCurrentAppUser() {
  const supabase = await createClient()
  
  try {
    // TODO: In production, get wallet_pass_id from URL/cookie/localStorage
    const walletPassId = 'QWIK-BOURNEMOUTH-DAVID-2024' // Mock for demo
    
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('wallet_pass_id', walletPassId)
      .single()
    
    if (error) {
      console.error('Error fetching current user member:', error)
      return { success: false, error: error.message, data: null }
    }
    
    return { success: true, error: null, data }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Failed to fetch current user member', data: null }
  }
}
