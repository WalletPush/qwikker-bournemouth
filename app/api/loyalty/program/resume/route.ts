import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * POST /api/loyalty/program/resume
 *
 * Business owner resumes a paused loyalty program.
 * Only works if WalletPush credentials exist (program was activated).
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
      .select('id, city')
      .eq('user_id', user.id)
      .single()

    if (!business || business.city !== city) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const serviceRole = createServiceRoleClient()
    const { data: program, error } = await serviceRole
      .from('loyalty_programs')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('business_id', business.id)
      .eq('status', 'paused')
      .select('id, status')
      .single()

    if (error || !program) {
      return NextResponse.json({ error: 'No paused program to resume' }, { status: 400 })
    }

    return NextResponse.json({ success: true, status: program.status })
  } catch (error) {
    console.error('[loyalty/program/resume]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
