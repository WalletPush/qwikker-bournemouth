import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getSafeCurrentCity } from '@/lib/utils/tenant-security'

/**
 * Fields the business can edit themselves without going through the queue.
 * These don't affect the WalletPush template.
 */
const SELF_SERVICE_FIELDS = [
  'program_name',
  'earn_instructions',
  'redeem_instructions',
  'terms_and_conditions',
  'max_earns_per_day',
  'min_gap_minutes',
] as const

type SelfServiceField = typeof SELF_SERVICE_FIELDS[number]

/**
 * PATCH /api/loyalty/program/update
 *
 * Business owner updates non-template fields on their active/paused program.
 * These fields don't require a WalletPush template update.
 *
 * Body: { [field]: value, ... } -- only SELF_SERVICE_FIELDS are accepted
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()

    // Filter to only allowed self-service fields
    const updates: Record<string, unknown> = {}
    for (const field of SELF_SERVICE_FIELDS) {
      if (field in body && body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate numeric fields
    if ('max_earns_per_day' in updates) {
      const v = Number(updates.max_earns_per_day)
      if (!Number.isInteger(v) || v < 1 || v > 10) {
        return NextResponse.json({ error: 'max_earns_per_day must be 1-10' }, { status: 400 })
      }
      updates.max_earns_per_day = v
    }
    if ('min_gap_minutes' in updates) {
      const v = Number(updates.min_gap_minutes)
      if (!Number.isInteger(v) || v < 0 || v > 1440) {
        return NextResponse.json({ error: 'min_gap_minutes must be 0-1440' }, { status: 400 })
      }
      updates.min_gap_minutes = v
    }

    updates.updated_at = new Date().toISOString()

    const serviceRole = createServiceRoleClient()
    const { data: program, error } = await serviceRole
      .from('loyalty_programs')
      .update(updates)
      .eq('business_id', business.id)
      .in('status', ['active', 'paused'])
      .select('id, program_name, earn_instructions, redeem_instructions, terms_and_conditions, max_earns_per_day, min_gap_minutes, status')
      .single()

    if (error || !program) {
      return NextResponse.json(
        { error: 'No active/paused program found or update failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, program })
  } catch (error) {
    console.error('[loyalty/program/update]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
