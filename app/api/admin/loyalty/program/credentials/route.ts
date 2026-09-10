import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/loyalty/program/credentials
 *
 * Update WalletPush credentials on an active/paused loyalty program.
 * Trims pasted values (spaces caused 403s). City-scoped to the admin session.
 *
 * Body: {
 *   programId,
 *   walletpush_template_id,
 *   walletpush_api_key,
 *   walletpush_pass_type_id
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const programId = typeof body.programId === 'string' ? body.programId.trim() : ''
    const walletpush_template_id =
      typeof body.walletpush_template_id === 'string' ? body.walletpush_template_id.trim() : ''
    const walletpush_api_key =
      typeof body.walletpush_api_key === 'string' ? body.walletpush_api_key.trim() : ''
    const walletpush_pass_type_id =
      typeof body.walletpush_pass_type_id === 'string' ? body.walletpush_pass_type_id.trim() : ''

    if (!programId || !walletpush_template_id || !walletpush_api_key || !walletpush_pass_type_id) {
      return NextResponse.json(
        { error: 'programId and all three WalletPush credentials are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    const { data: program, error: lookupError } = await serviceRole
      .from('loyalty_programs')
      .select('id, city, status')
      .eq('id', programId)
      .single()

    if (lookupError || !program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 })
    }

    if (program.city !== admin.city) {
      return NextResponse.json({ error: 'Not authorized for this city' }, { status: 403 })
    }

    if (!['active', 'paused'].includes(program.status)) {
      return NextResponse.json(
        { error: 'Only active or paused programs can update credentials' },
        { status: 400 }
      )
    }

    const { error: updateError } = await serviceRole
      .from('loyalty_programs')
      .update({
        walletpush_template_id,
        walletpush_api_key,
        walletpush_pass_type_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)

    if (updateError) {
      console.error('[admin/loyalty/program/credentials]', updateError)
      return NextResponse.json({ error: 'Failed to update credentials' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      walletpush_template_id,
      walletpush_pass_type_id,
    })
  } catch (error) {
    console.error('[admin/loyalty/program/credentials]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
