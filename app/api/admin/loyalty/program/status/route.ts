import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/loyalty/program/status
 *
 * Toggle a loyalty program between active and paused.
 * Body: { programId: string, status: 'active' | 'paused' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { programId, status } = body

    if (!programId || !['active', 'paused'].includes(status)) {
      return NextResponse.json(
        { error: 'programId and status (active|paused) are required' },
        { status: 400 }
      )
    }

    const serviceRole = createServiceRoleClient()

    // Verify the program belongs to this admin's city
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

    const { error: updateError } = await serviceRole
      .from('loyalty_programs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', programId)

    if (updateError) {
      console.error('[admin/loyalty/program/status]', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('[admin/loyalty/program/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
