import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import type { DesignSpecJson } from '@/lib/loyalty/loyalty-types'

/**
 * POST /api/loyalty/request/edit
 *
 * Business submits a change request for template-level fields
 * (branding, images, reward config) that require admin review
 * and a WalletPush template update.
 *
 * Body: partial DesignSpecJson with only the fields the business wants to change.
 * The API snapshots the full current + proposed state for admin to diff.
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
      .select('id, city, business_name')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: program } = await serviceRole
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .in('status', ['active', 'paused'])
      .single()

    if (!program) {
      return NextResponse.json(
        { error: 'No active/paused program found' },
        { status: 400 }
      )
    }

    // Check for existing pending edit request
    const { data: existingRequest } = await serviceRole
      .from('loyalty_pass_requests')
      .select('id')
      .eq('business_id', business.id)
      .eq('request_type', 'edit')
      .eq('status', 'submitted')
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending edit request. Please wait for it to be reviewed.' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { changes, changeDescription } = body as {
      changes: Partial<DesignSpecJson>
      changeDescription: string
    }

    if (!changes || Object.keys(changes).length === 0) {
      return NextResponse.json({ error: 'No changes specified' }, { status: 400 })
    }

    // Build the proposed design spec (current values merged with changes)
    const proposedSpec: DesignSpecJson = {
      program_name: changes.program_name ?? program.program_name ?? `${business.business_name} Rewards`,
      type: changes.type ?? program.type,
      reward_threshold: changes.reward_threshold ?? program.reward_threshold,
      reward_description: changes.reward_description ?? program.reward_description,
      stamp_label: changes.stamp_label ?? program.stamp_label,
      earn_mode: changes.earn_mode ?? program.earn_mode,
      stamp_icon: changes.stamp_icon ?? program.stamp_icon,
      earn_instructions: changes.earn_instructions ?? program.earn_instructions,
      redeem_instructions: changes.redeem_instructions ?? program.redeem_instructions,
      primary_color: changes.primary_color ?? program.primary_color,
      background_color: changes.background_color ?? program.background_color,
      logo_url: changes.logo_url ?? program.logo_url,
      logo_description: changes.logo_description ?? program.logo_description,
      strip_image_url: changes.strip_image_url ?? program.strip_image_url,
      strip_image_description: changes.strip_image_description ?? program.strip_image_description,
      terms_and_conditions: changes.terms_and_conditions ?? program.terms_and_conditions,
      timezone: changes.timezone ?? program.timezone,
      max_earns_per_day: changes.max_earns_per_day ?? program.max_earns_per_day,
      min_gap_minutes: changes.min_gap_minutes ?? program.min_gap_minutes,
      business_name: business.business_name,
      business_city: city,
    }

    const { error: insertError } = await serviceRole
      .from('loyalty_pass_requests')
      .insert({
        business_id: business.id,
        design_spec_json: {
          ...proposedSpec,
          _change_description: changeDescription || 'Edit request',
          _changed_fields: Object.keys(changes),
        },
        status: 'submitted',
        request_type: 'edit',
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Slack notification (fire-and-forget)
    try {
      const changedFieldsList = Object.keys(changes).join(', ')
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName: business.business_name,
        category: 'loyalty',
        subject: 'Loyalty Card Edit Request',
        messagePreview: `${business.business_name} requested changes to their loyalty card. Fields: ${changedFieldsList}. ${changeDescription ? `Note: "${changeDescription}"` : ''}`,
        threadId: program.id,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block
    }

    return NextResponse.json({ success: true, status: 'submitted' })
  } catch (error) {
    console.error('[loyalty/request/edit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
