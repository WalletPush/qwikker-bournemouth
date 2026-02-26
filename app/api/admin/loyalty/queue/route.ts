import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loyalty/queue
 *
 * Returns pending loyalty pass requests for the city admin queue.
 * Joins program + business data for the specs summary card.
 */
export async function GET() {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const city = admin.city
    const serviceRole = createServiceRoleClient()

    const { data: requests, error: queryError } = await serviceRole
      .from('loyalty_pass_requests')
      .select(`
        *,
        business_profiles!inner(
          id, business_name, city, logo
        )
      `)
      .eq('status', 'submitted')
      .eq('business_profiles.city', city)
      .order('created_at', { ascending: true })

    if (queryError) {
      console.error('[admin/loyalty/queue]', queryError)
      return NextResponse.json({ requests: [] })
    }

    return NextResponse.json({ requests: requests || [] })
  } catch (error) {
    console.error('[admin/loyalty/queue]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
