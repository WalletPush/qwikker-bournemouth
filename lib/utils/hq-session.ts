import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export interface HQAdmin {
  userId: string
  email: string
}

/**
 * Get current HQ admin from Supabase Auth session.
 * Returns null if not an active HQ admin.
 */
export async function getHQAdminFromSession(): Promise<HQAdmin | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const adminClient = createServiceRoleClient()
    const { data: hqAdmin } = await adminClient
      .from('hq_admins')
      .select('user_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!hqAdmin) return null

    return { userId: user.id, email: user.email || '' }
  } catch {
    return null
  }
}
