/**
 * HQ Admin Authentication & Authorization
 * 
 * HQ admins access: qwikker.com/hqadmin
 * Separate from franchise admins and business users
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface HQAdmin {
  user_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

/**
 * Check if current user is an HQ admin
 */
export async function isHQAdmin(userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('hq_admins')
    .select('user_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  
  return !error && !!data
}

/**
 * Get HQ admin details
 */
export async function getHQAdmin(userId: string): Promise<HQAdmin | null> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('hq_admins')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  
  if (error || !data) return null
  
  return data as HQAdmin
}

/**
 * Assert request is from HQ admin (throws if not)
 * Use this in HQ API routes
 */
export async function assertHQAdmin(request: NextRequest): Promise<HQAdmin> {
  // Get user from session (uses cookies automatically)
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized: Not logged in')
  }
  
  // Check if user is HQ admin
  const admin = await getHQAdmin(user.id)
  
  if (!admin) {
    throw new Error('Forbidden: Not an HQ admin')
  }
  
  return admin
}

/**
 * Log audit event
 */
export async function logAuditEvent(params: {
  action: string
  resourceType: string
  resourceId?: string
  city?: string
  metadata?: Record<string, any>
  actorId?: string
}) {
  const supabase = createServiceRoleClient()
  
  const { error } = await supabase.rpc('log_audit_event', {
    p_action: params.action,
    p_resource_type: params.resourceType,
    p_resource_id: params.resourceId || null,
    p_city: params.city || null,
    p_metadata: params.metadata || {}
  })
  
  if (error) {
    console.error('Failed to log audit event:', error)
  }
}

