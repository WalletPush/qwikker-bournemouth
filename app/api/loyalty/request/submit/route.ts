import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import type { DesignSpecJson } from '@/lib/loyalty/loyalty-types'

/**
 * POST /api/loyalty/request/submit
 *
 * Business submits their loyalty program for admin provisioning.
 * Creates a frozen design spec snapshot in loyalty_pass_requests,
 * sets program status to 'submitted'.
 */
export async function POST() {
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

    const { data: program } = await supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', business.id)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'No loyalty program found. Create one first.' }, { status: 400 })
    }

    if (program.status !== 'draft') {
      return NextResponse.json({ error: `Program is already ${program.status}` }, { status: 400 })
    }

    if (!program.reward_threshold || !program.reward_description) {
      return NextResponse.json({ error: 'Reward threshold and description are required' }, { status: 400 })
    }

    const designSpec: DesignSpecJson = {
      program_name: program.program_name || `${business.business_name} Rewards`,
      type: program.type,
      reward_threshold: program.reward_threshold,
      reward_description: program.reward_description,
      stamp_label: program.stamp_label || 'Stamps',
      earn_mode: program.earn_mode,
      stamp_icon: program.stamp_icon,
      earn_instructions: program.earn_instructions,
      redeem_instructions: program.redeem_instructions,
      primary_color: program.primary_color,
      background_color: program.background_color,
      logo_url: program.logo_url,
      logo_description: program.logo_description,
      strip_image_url: program.strip_image_url,
      strip_image_description: program.strip_image_description,
      terms_and_conditions: program.terms_and_conditions,
      timezone: program.timezone,
      max_earns_per_day: program.max_earns_per_day,
      min_gap_minutes: program.min_gap_minutes,
      business_name: business.business_name,
      business_city: city,
    }

    const serviceRole = createServiceRoleClient()

    const { error: requestError } = await serviceRole
      .from('loyalty_pass_requests')
      .insert({
        business_id: business.id,
        design_spec_json: designSpec,
        status: 'submitted',
      })

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 })
    }

    const { error: statusError } = await serviceRole
      .from('loyalty_programs')
      .update({ status: 'submitted', updated_at: new Date().toISOString() })
      .eq('id', program.id)

    if (statusError) {
      console.error('[loyalty/request/submit] status update failed:', statusError)
    }

    // Fire-and-forget: Slack notification to city admin
    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName: business.business_name,
        category: 'loyalty',
        subject: 'New Loyalty Card Request',
        messagePreview: `${business.business_name} submitted a loyalty card for provisioning. Reward: "${program.reward_description}" (${program.reward_threshold} ${program.stamp_label}).`,
        threadId: program.id,
        eventType: 'new_thread',
      })
    } catch (slackError) {
      console.error('[loyalty/request/submit] Slack notification failed:', slackError)
    }

    return NextResponse.json({ success: true, status: 'submitted' })
  } catch (error) {
    console.error('[loyalty/request/submit]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
