import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { coveredCitiesFor } from '@/lib/offer-engine/generate-offers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Save a chosen contact email onto business_profiles.email so the claim-invite
 * flow (which reads business.email) can use it. City-scoped.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const body = await request.json().catch(() => ({}))
    const businessId: string | undefined = body?.businessId
    const email: string | undefined = (body?.email || '').trim().toLowerCase()

    if (!businessId || !email) {
      return NextResponse.json({ error: 'Missing businessId or email' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'That does not look like a valid email' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('city')
      .eq('id', businessId)
      .single()

    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const covered = coveredCitiesFor(city).map((c) => c.toLowerCase())
    if (biz.city && covered.length > 0 && !covered.includes(String(biz.city).toLowerCase())) {
      return NextResponse.json({ error: 'Business is outside your franchise area' }, { status: 403 })
    }

    const { error } = await supabase
      .from('business_profiles')
      .update({ email })
      .eq('id', businessId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, email })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
