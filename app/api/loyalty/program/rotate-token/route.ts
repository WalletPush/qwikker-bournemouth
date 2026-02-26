import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'
import { generateCounterQrToken } from '@/lib/loyalty/loyalty-utils'

/**
 * POST /api/loyalty/program/rotate-token
 *
 * Rotates the counter QR token. Previous token remains valid
 * for 30 minutes (grace window for printed QR codes).
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

    const { data: current } = await supabase
      .from('loyalty_programs')
      .select('id, counter_qr_token')
      .eq('business_id', business.id)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'No loyalty program found' }, { status: 404 })
    }

    const newToken = generateCounterQrToken()
    const serviceRole = createServiceRoleClient()

    const { data: updated, error } = await serviceRole
      .from('loyalty_programs')
      .update({
        previous_counter_qr_token: current.counter_qr_token,
        counter_qr_token: newToken,
        counter_qr_token_rotated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select('id, counter_qr_token, counter_qr_token_rotated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      token: updated.counter_qr_token,
      rotatedAt: updated.counter_qr_token_rotated_at,
    })
  } catch (error) {
    console.error('[loyalty/program/rotate-token]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
