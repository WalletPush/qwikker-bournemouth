import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireCityAdmin } from '@/lib/offer-engine/admin-guard'

const updateOfferSchema = z.object({
  offerId: z.string().uuid(),
  offer_name: z.string().trim().min(1).max(120),
  offer_type: z.string().trim().min(1).max(80),
  offer_value: z.string().trim().min(1).max(120),
  offer_claim_amount: z.enum(['single', 'multiple']),
  offer_description: z.string().trim().max(2000).optional().nullable(),
  offer_terms: z.string().trim().max(2000).optional().nullable(),
  offer_start_date: z.string().trim().optional().nullable(),
  offer_end_date: z.string().trim().optional().nullable(),
  activation_window_minutes: z.union([z.literal(30), z.literal(60), z.literal(120)]),
})

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** PATCH/POST: immediate admin update of an approved offer (city-scoped). */
export async function POST(request: NextRequest) {
  const guard = await requireCityAdmin(request)
  if ('error' in guard) return guard.error
  const { city } = guard.ctx

  try {
    const body = await request.json()
    const parsed = updateOfferSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid offer data', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const supabase = createServiceRoleClient()

    const { data: offer, error: offerError } = await supabase
      .from('business_offers')
      .select(`
        id,
        business_id,
        edit_count,
        business_profiles!inner(
          id,
          business_name,
          city
        )
      `)
      .eq('id', data.offerId)
      .eq('business_profiles.city', city)
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { success: false, error: 'Offer not found or not in your franchise area' },
        { status: 404 }
      )
    }

    const updatePayload = {
      offer_name: data.offer_name,
      offer_type: data.offer_type,
      offer_value: data.offer_value,
      offer_claim_amount: data.offer_claim_amount,
      offer_description: emptyToNull(data.offer_description),
      offer_terms: emptyToNull(data.offer_terms),
      offer_start_date: emptyToNull(data.offer_start_date),
      offer_end_date: emptyToNull(data.offer_end_date),
      activation_window_minutes: data.activation_window_minutes,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error: updateError } = await supabase
      .from('business_offers')
      .update(updatePayload)
      .eq('id', data.offerId)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('Admin offer update failed:', updateError)
      return NextResponse.json(
        { success: false, error: updateError?.message || 'Failed to update offer' },
        { status: 500 }
      )
    }

    const business = offer.business_profiles as unknown as { business_name?: string }
    console.log(
      `✅ Admin updated offer "${updated.offer_name}" for ${business?.business_name || offer.business_id} in ${city}`
    )

    return NextResponse.json({
      success: true,
      offer: updated,
      message: 'Offer updated',
    })
  } catch (error) {
    console.error('Admin offer update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
