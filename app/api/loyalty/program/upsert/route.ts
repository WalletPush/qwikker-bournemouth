import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { getBusinessTierInfo } from '@/lib/utils/subscription-helpers'
import { generatePublicId } from '@/lib/loyalty/loyalty-utils'
import type { LoyaltyProgramFormData } from '@/lib/loyalty/loyalty-types'

/**
 * POST /api/loyalty/program/upsert
 *
 * Create or update the business's loyalty program.
 * Validates Spotlight tier. City copied from business_profiles.
 * Generates public_id on first create.
 */
export async function POST(request: NextRequest) {
  try {
    const city = await getSafeCurrentCity()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: business } = await supabase
      .from('business_profiles')
      .select('id, city, business_name, logo')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const tierInfo = await getBusinessTierInfo(business.id)
    if (tierInfo.tier !== 'spotlight') {
      return NextResponse.json(
        { error: 'Loyalty programs require Spotlight tier' },
        { status: 403 }
      )
    }

    const body: Partial<LoyaltyProgramFormData> = await request.json()

    const { data: existing } = await supabase
      .from('loyalty_programs')
      .select('id, public_id, status')
      .eq('business_id', business.id)
      .single()

    const serviceRole = createServiceRoleClient()

    if (existing) {
      if (existing.status !== 'draft') {
        const allowedUpdates = [
          'earn_instructions', 'redeem_instructions', 'terms_and_conditions',
          'logo_url', 'logo_description', 'strip_image_url', 'strip_image_description',
          'primary_color', 'background_color',
        ]
        const filtered: Record<string, unknown> = { updated_at: new Date().toISOString() }
        for (const key of allowedUpdates) {
          if (key in body) filtered[key] = (body as Record<string, unknown>)[key]
        }

        const { data: updated, error: updateError } = await serviceRole
          .from('loyalty_programs')
          .update(filtered)
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
        return NextResponse.json({ program: updated })
      }

      const { data: updated, error: updateError } = await serviceRole
        .from('loyalty_programs')
        .update({
          ...body,
          city,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ program: updated })
    }

    const publicId = generatePublicId()
    const programName = body.program_name || `${business.business_name} Rewards`

    const { data: created, error: createError } = await serviceRole
      .from('loyalty_programs')
      .insert({
        business_id: business.id,
        public_id: publicId,
        program_name: programName,
        type: body.type || 'stamps',
        reward_threshold: body.reward_threshold || 10,
        reward_description: body.reward_description || '',
        stamp_label: body.stamp_label || 'Stamps',
        earn_mode: body.earn_mode || 'per_visit',
        stamp_icon: body.stamp_icon || 'stamp',
        earn_instructions: body.earn_instructions || null,
        redeem_instructions: body.redeem_instructions || null,
        primary_color: body.primary_color || '#00d083',
        background_color: body.background_color || '#0b0f14',
        logo_url: body.logo_url || business.logo || null,
        logo_description: body.logo_description || null,
        strip_image_url: body.strip_image_url || null,
        strip_image_description: body.strip_image_description || null,
        terms_and_conditions: body.terms_and_conditions || null,
        timezone: body.timezone || 'Europe/London',
        max_earns_per_day: body.max_earns_per_day || 1,
        min_gap_minutes: body.min_gap_minutes ?? 30,
        city,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ program: created }, { status: 201 })
  } catch (error) {
    console.error('[loyalty/program/upsert]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
