import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    const { city, default_trial_tier, founding_member_trial_days } = await request.json()

    if (!city) {
      return NextResponse.json({ error: 'Missing city' }, { status: 400 })
    }

    const validTiers = ['starter', 'featured', 'spotlight']
    if (default_trial_tier && !validTiers.includes(default_trial_tier)) {
      return NextResponse.json({ error: 'Invalid trial tier' }, { status: 400 })
    }

    if (founding_member_trial_days != null && (founding_member_trial_days < 7 || founding_member_trial_days > 365)) {
      return NextResponse.json({ error: 'Trial days must be between 7 and 365' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (default_trial_tier) updateData.default_trial_tier = default_trial_tier
    if (founding_member_trial_days != null) updateData.founding_member_trial_days = founding_member_trial_days

    const { error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .update(updateData)
      .eq('city', city)

    if (error) {
      console.error('Trial config update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Trial config updated for ${city}: tier=${default_trial_tier}, days=${founding_member_trial_days}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Trial config API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
