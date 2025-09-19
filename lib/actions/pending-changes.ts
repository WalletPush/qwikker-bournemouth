'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Get pending changes for a specific business
 */
export async function getPendingChanges(userId: string) {
  const supabaseAdmin = createAdminClient()

  // Get user profile first
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, status')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return { success: false, error: 'Profile not found', pendingChanges: [] }
  }

  // Get pending changes for this business
  const { data: changes, error: changesError } = await supabaseAdmin
    .from('business_changes')
    .select('*')
    .eq('business_id', profile.id)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })

  if (changesError) {
    console.error('Error fetching pending changes:', changesError)
    return { success: false, error: 'Failed to fetch pending changes', pendingChanges: [] }
  }

  return { 
    success: true, 
    pendingChanges: changes || [],
    businessStatus: profile.status
  }
}

/**
 * Get approved changes count for a business (for stats)
 */
export async function getApprovedChangesCount(userId: string) {
  const supabaseAdmin = createAdminClient()

  // Get user profile first
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (profileError || !profile) {
    return 0
  }

  // Count approved changes
  const { count, error } = await supabaseAdmin
    .from('business_changes')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', profile.id)
    .eq('status', 'approved')

  if (error) {
    console.error('Error counting approved changes:', error)
    return 0
  }

  return count || 0
}
