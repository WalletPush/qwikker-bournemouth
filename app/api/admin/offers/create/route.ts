import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'
import { getMaxOffers } from '@/lib/utils/tier-limits'

const createOfferSchema = z.object({
  businessId: z.string().uuid(),
  offer_name: z.string().trim().min(1).max(120),
  offer_type: z.string().trim().min(1).max(80),
  offer_value: z.string().trim().min(1).max(120),
  offer_claim_amount: z.enum(['single', 'multiple']),
  offer_description: z.string().trim().max(2000).optional().nullable(),
  offer_terms: z.string().trim().max(2000).optional().nullable(),
  offer_start_date: z.string().trim().optional().nullable(),
  offer_end_date: z.string().trim().optional().nullable(),
  activation_window_minutes: z.union([z.literal(30), z.literal(60), z.literal(120)]),
  /** Admin confirms they have business approval to publish this offer */
  confirmedBusinessApproval: z.literal(true),
})

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * POST: city admin creates an approved offer on behalf of a business.
 * Requires explicit confirmedBusinessApproval acknowledgment.
 */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city, adminId } = guard.ctx

  try {
    const body = await request.json()
    const parsed = createOfferSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.some((i) => i.path.includes('confirmedBusinessApproval'))
            ? 'Confirm you have the business’s approval before publishing an offer.'
            : 'Invalid offer data',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createServiceRoleClient()

    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city, status, plan')
      .eq('id', data.businessId)
      .eq('city', city)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: 'Business not found in your franchise area' },
        { status: 404 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const { count: activeCount, error: countError } = await supabase
      .from('business_offers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'approved')
      .or(`offer_end_date.is.null,offer_end_date.gte.${today}`)

    if (countError) {
      console.error('Admin offer create count failed:', countError)
      return NextResponse.json(
        { success: false, error: 'Could not check offer limits' },
        { status: 500 }
      )
    }

    const isClaimedFree = business.status === 'claimed_free'
    const plan = isClaimedFree ? 'free' : business.plan || 'starter'
    const maxOffers = getMaxOffers(plan)
    const current = activeCount || 0

    if (current >= maxOffers) {
      return NextResponse.json(
        {
          success: false,
          error: `Offer limit reached. This listing allows ${maxOffers} active offer${maxOffers === 1 ? '' : 's'}.`,
        },
        { status: 400 }
      )
    }

    const { data: created, error: insertError } = await supabase
      .from('business_offers')
      .insert({
        business_id: business.id,
        offer_name: data.offer_name,
        offer_type: data.offer_type,
        offer_value: data.offer_value,
        offer_claim_amount: data.offer_claim_amount,
        offer_description: emptyToNull(data.offer_description),
        offer_terms: emptyToNull(data.offer_terms),
        offer_start_date: emptyToNull(data.offer_start_date),
        offer_end_date: emptyToNull(data.offer_end_date),
        activation_window_minutes: data.activation_window_minutes,
        status: 'approved',
        approved_at: new Date().toISOString(),
        display_order: current + 1,
      })
      .select('*')
      .single()

    if (insertError || !created) {
      console.error('Admin offer create failed:', insertError)
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Failed to create offer' },
        { status: 500 }
      )
    }

    console.log(
      `✅ Admin ${adminId} created offer "${created.offer_name}" for ${business.business_name} in ${city}`
    )

    return NextResponse.json({
      success: true,
      offer: created,
      message: 'Offer published',
    })
  } catch (error) {
    console.error('Admin offer create error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
