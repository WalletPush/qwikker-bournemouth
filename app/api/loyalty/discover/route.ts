import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * GET /api/loyalty/discover
 *
 * Returns active loyalty programs in the current city
 * for the "top picks" section on the rewards page.
 * Limited to 6 programs, ordered by most recently created.
 */
export async function GET() {
  try {
    const city = await getSafeCurrentCity()
    const supabase = createServiceRoleClient()

    const { data: programs, error } = await supabase
      .from('loyalty_programs')
      .select(`
        id, public_id, program_name, type, reward_threshold,
        reward_description, stamp_label, stamp_icon,
        primary_color, background_color, logo_url, strip_image_url,
        business_profiles!inner(business_name, logo)
      `)
      .eq('city', city)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6)

    if (error) {
      console.error('[loyalty/discover]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const result = (programs || []).map((p: any) => ({
      id: p.id,
      public_id: p.public_id,
      program_name: p.program_name,
      type: p.type,
      reward_threshold: p.reward_threshold,
      reward_description: p.reward_description,
      stamp_label: p.stamp_label,
      stamp_icon: p.stamp_icon,
      primary_color: p.primary_color,
      background_color: p.background_color,
      logo_url: p.logo_url,
      strip_image_url: p.strip_image_url,
      business: {
        business_name: p.business_profiles?.business_name ?? 'Unknown',
        logo: p.business_profiles?.logo ?? null,
      },
    }))

    return NextResponse.json({ programs: result })
  } catch (error) {
    console.error('[loyalty/discover]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
