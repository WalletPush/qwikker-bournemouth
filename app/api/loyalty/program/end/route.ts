import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * POST /api/loyalty/program/end
 *
 * Business owner permanently ends their loyalty program.
 * Sets status to 'ended' and records the timestamp.
 * Memberships are preserved for historical data.
 * Earns, redemptions, and new joins stop immediately.
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

    const serviceRole = createServiceRoleClient()

    // Only active or paused programs can be ended
    const { data: program, error } = await serviceRole
      .from('loyalty_programs')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', business.id)
      .in('status', ['active', 'paused'])
      .select('id, status, program_name')
      .single()

    if (error || !program) {
      return NextResponse.json(
        { error: 'No active or paused program to end' },
        { status: 400 }
      )
    }

    // Get member count for the notification
    const { count: memberCount } = await serviceRole
      .from('loyalty_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', program.id)
      .eq('status', 'active')

    // Slack notification (fire-and-forget)
    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName: business.business_name,
        category: 'loyalty',
        subject: 'Loyalty Program Ended',
        messagePreview: `${business.business_name} has permanently ended their loyalty program "${program.program_name || 'Unnamed'}". ${memberCount || 0} active members affected.`,
        threadId: program.id,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block the operation
    }

    return NextResponse.json({
      success: true,
      status: 'ended',
      membersAffected: memberCount || 0,
    })
  } catch (error) {
    console.error('[loyalty/program/end]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
