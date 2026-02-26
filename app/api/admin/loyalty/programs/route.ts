import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/loyalty/programs
 *
 * Returns active and paused loyalty programs for the admin's city,
 * including business info and member counts.
 */
export async function GET() {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const city = admin.city
    const serviceRole = createServiceRoleClient()

    const { data: programs, error: queryError } = await serviceRole
      .from('loyalty_programs')
      .select(`
        id, business_id, public_id, program_name, type,
        reward_threshold, reward_description, stamp_label,
        stamp_icon, earn_instructions, earn_mode,
        primary_color, background_color, logo_url, strip_image_url,
        status, city, created_at, updated_at,
        business_profiles!inner(id, business_name, logo, city)
      `)
      .in('status', ['active', 'paused'])
      .eq('city', city)
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[admin/loyalty/programs]', queryError)
      return NextResponse.json({ programs: [] })
    }

    // Batch-fetch member counts (no FK to aggregate, so manual count)
    const programIds = (programs || []).map((p: any) => p.id)
    let memberCounts: Record<string, number> = {}

    if (programIds.length > 0) {
      const { data: memberships } = await serviceRole
        .from('loyalty_memberships')
        .select('program_id')
        .in('program_id', programIds)
        .eq('status', 'active')

      for (const m of memberships || []) {
        memberCounts[m.program_id] = (memberCounts[m.program_id] || 0) + 1
      }
    }

    const enriched = (programs || []).map((p: any) => ({
      ...p,
      member_count: memberCounts[p.id] || 0,
    }))

    return NextResponse.json({ programs: enriched })
  } catch (error) {
    console.error('[admin/loyalty/programs]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
