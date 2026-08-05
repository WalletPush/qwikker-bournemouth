import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { z } from 'zod'

/** Empty form fields often arrive as "" — treat as null so .url() doesn't reject them. */
const emptyToNull = (v: unknown) => (v === '' ? null : v)

/** Absolute https URL, or a site-relative path (hero presets use /hero-vibrant.png etc.). */
const absoluteOrSitePath = z
  .string()
  .refine(
    (v) => v.startsWith('/') || z.string().url().safeParse(v).success,
    { message: 'Must be an absolute URL or a site-relative path' }
  )

const nullableAbsoluteOrSitePath = z.preprocess(emptyToNull, absoluteOrSitePath.nullable().optional())
const nullableUrl = z.preprocess(emptyToNull, z.string().url().nullable().optional())

const landingPageConfigSchema = z.object({
  // Template + theme (admins pick a template and a curated accent; layout/copy stay locked)
  template: z.enum(['signature', 'vibrant', 'editorial']).optional(),
  theme: z.object({
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent_hover: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    mode: z.enum(['dark', 'light']).optional(),
  }).optional(),
  section_order: z.array(z.string().max(40)).max(40).optional(),
  sections_enabled: z.record(z.string().max(40), z.boolean()).optional(),

  // City-admin publish switch (live vs branded coming-soon page)
  publish_status: z.enum(['live', 'coming_soon']).optional(),
  coming_soon_launch_label: z.string().max(60).nullable().optional(),
  coming_soon_headline: z.string().max(120).nullable().optional(),
  coming_soon_subtitle: z.string().max(400).nullable().optional(),
  coming_soon_waitlist_enabled: z.boolean().optional(),

  hero_headline: z.string().max(120).nullable().optional(),
  hero_subtitle: z.string().max(300).nullable().optional(),
  // Built-in presets are relative (/hero-vibrant.png); uploads are Cloudinary https URLs.
  hero_image_url: nullableAbsoluteOrSitePath,
  hero_blur: z.number().min(0).max(100).nullable().optional(),

  sponsor_enabled: z.boolean().optional(),
  sponsor_name: z.string().max(100).nullable().optional(),
  sponsor_tagline: z.string().max(200).nullable().optional(),
  sponsor_logo_url: nullableUrl,
  sponsor_url: nullableUrl,

  // Up to 2 secondary ("tier 2") sponsors shown below the headline sponsor
  tier2_sponsors: z.array(z.object({
    name: z.string().max(100),
    logo_url: z.string().url(),
    url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  })).max(2).nullable().optional(),

  supporters_enabled: z.boolean().optional(),
  supporters_heading: z.string().max(100).nullable().optional(),
  supporter_logos: z.array(z.object({
    name: z.string().max(100),
    logo_url: z.string().url(),
    url: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  })).nullable().optional(),

  show_founding_counter: z.boolean().optional(),
  founding_member_total_spots: z.number().int().min(0).max(10000).optional(),

  show_featured_businesses: z.boolean().optional(),
  featured_business_ids: z.array(z.string().uuid()).nullable().optional(),
  show_pass_count: z.boolean().optional(),

  // New sections
  offers_section: z.object({
    enabled: z.boolean().optional(),
    heading: z.string().max(100).nullable().optional(),
    max: z.number().int().min(1).max(24).optional(),
  }).optional(),
  category_tiles: z.object({
    enabled: z.boolean().optional(),
    heading: z.string().max(100).nullable().optional(),
    categories: z.array(z.string().max(40)).max(12).nullable().optional(),
  }).optional(),
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
        .select('landing_page_config, founding_member_enabled, founding_member_total_spots, status')
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
      // business_subscriptions can come back as an array OR a single object depending on the join
      const rawSubs = (biz as Record<string, unknown>).business_subscriptions
      const subs = (Array.isArray(rawSubs) ? rawSubs : rawSubs ? [rawSubs] : []) as Array<{ is_in_free_trial: boolean; free_trial_end_date: string | null; status: string }>
      const sub = subs[0]
      if (!sub) return true
      if (sub.status === 'cancelled') return false
      if (!sub.is_in_free_trial) return true
      if (sub.free_trial_end_date) {
        return new Date(sub.free_trial_end_date) >= now
      }
      return true
    })

    // Backward-compat: surface an explicit publish_status so the editor toggle
    // reflects reality. Existing `active` cities (no switch saved yet) are treated
    // as live; everything else defaults to coming-soon (safe / hidden by default).
    const storedConfig = (configResult.data?.landing_page_config || {}) as Record<string, unknown>
    if (storedConfig.publish_status !== 'live' && storedConfig.publish_status !== 'coming_soon') {
      storedConfig.publish_status = configResult.data?.status === 'active' ? 'live' : 'coming_soon'
    }

    return NextResponse.json({
      success: true,
      config: storedConfig,
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

    // Read the current config first so we MERGE rather than replace. This prevents a
    // partial/empty editor state from wiping stored data (sponsor names, logos, supporter
    // logos, featured IDs). Each top-level key the editor sends overwrites just that key;
    // keys it doesn't send are preserved.
    const { data: existingRow, error: fetchError } = await supabaseAdmin
      .from('franchise_crm_configs')
      .select('landing_page_config')
      .eq('city', city)
      .single()

    if (fetchError) {
      console.error('Landing page config fetch-before-save error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const existingConfig = (existingRow?.landing_page_config as Record<string, unknown>) || {}
    const mergedConfig = { ...existingConfig, ...parsed.data }

    const { error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .update({
        landing_page_config: mergedConfig,
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
