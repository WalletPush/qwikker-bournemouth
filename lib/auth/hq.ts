import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Canonical HQ admin authentication guard.
 * Uses session-based auth (cookies) to verify user is an active HQ admin.
 * 
 * Pattern:
 * 1. Read operations: use returned `supabase` client (session-based)
 * 2. Write operations: use `createServiceRoleClient()` AFTER this succeeds
 */
export async function requireHQAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { 
      ok: false as const, 
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
    }
  }

  // Check if user is an active HQ admin
  const { data: hqAdmin, error: hqErr } = await supabase
    .from('hq_admins')
    .select('user_id, email, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (hqErr || !hqAdmin) {
    return { 
      ok: false as const, 
      response: NextResponse.json({ error: 'Forbidden: HQ admin access required' }, { status: 403 }) 
    }
  }

  return { 
    ok: true as const, 
    user, 
    hqAdmin, 
    supabase // session-based client for reads
  }
}

