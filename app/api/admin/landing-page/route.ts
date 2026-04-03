import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { z } from 'zod'

const landingPageConfigSchema = z.object({
  hero_headline: z.string().max(120).nullable().optional(),
  hero_subtitle: z.string().max(300).nullable().optional(),
  hero_image_url: z.string().url().nullable().optional(),

  sponsor_enabled: z.boolean().optional(),
  sponsor_name: z.string().max(100).nullable().optional(),
  sponsor_tagline: z.string().max(200).nullable().optional(),
  sponsor_logo_url: z.string().url().nullable().optional(),

  supporters_enabled: z.boolean().optional(),
  supporters_heading: z.string().max(100).nullable().optional(),
  supporter_logos: z.array(z.object({
    name: z.string().max(100),
    logo_url: z.string().url(),
  })).nullable().optional(),

  show_founding_counter: z.boolean().optional(),
  founding_member_total_spots: z.number().int().min(0).max(10000).optional(),

  show_featured_businesses: z.boolean().optional(),
  featured_business_ids: z.array(z.string().uuid()).nullable().optional(),
})

export async function GET(request: NextRequest) {
  try {
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

    const [configResult, businessesResult] = await Promise.all([
      supabaseAdmin
        .from('franchise_crm_configs')
        .select('landing_page_config, founding_member_enabled, founding_member_total_spots')
        .eq('city', requestCity)
        .single(),
      supabaseAdmin
        .from('business_profiles')
        .select('id, business_name, status, business_subscriptions!business_subscriptions_business_id_fkey(is_in_free_trial, free_trial_end_date, status)')
        .ilike('city', requestCity)
        .in('status', ['approved', 'claimed_free'])
        .order('business_name'),
    ])

    if (configResult.error) {
      console.error('Landing page config fetch error:', configResult.error)
      return NextResponse.json({ error: configResult.error.message }, { status: 500 })
    }

    const now = new Date()
    const activeBusinesses = (businessesResult.data || []).filter(biz => {
      const subs = (biz as Record<string, unknown>).business_subscriptions as Array<{ is_in_free_trial: boolean; free_trial_end_date: string | null; status: string }> | null
      if (!subs || subs.length === 0) return true
      const sub = subs[0]
      if (!sub.is_in_free_trial) return true
      if (sub.free_trial_end_date) {
        return new Date(sub.free_trial_end_date) >= now
      }
      return true
    })

    return NextResponse.json({
      success: true,
      config: configResult.data?.landing_page_config || {},
      foundingMemberEnabled: configResult.data?.founding_member_enabled || false,
      foundingMemberTotalSpots: configResult.data?.founding_member_total_spots || 0,
      businesses: activeBusinesses.map(b => ({ id: b.id, business_name: b.business_name, status: b.status })),
    })
  } catch (error) {
    console.error('Landing page GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { city, config } = body

    if (!city) {
      return NextResponse.json({ error: 'Missing city' }, { status: 400 })
    }

    const parsed = landingPageConfigSchema.safeParse(config)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid config', details: parsed.error.flatten() },
        { status: 400 }
      )
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

    const { error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .update({
        landing_page_config: parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('city', city)

    if (error) {
      console.error('Landing page config update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`Landing page config updated for ${city}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Landing page POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
