import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

/**
 * POST /api/admin/loyalty/request/reject
 *
 * City admin rejects a loyalty program request with a reason.
 * Sets program status back to 'draft' so business can revise.
 *
 * Body: { requestId, reason }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const city = admin.city

    const { requestId, reason } = await request.json()

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const serviceRole = createServiceRoleClient()

    const { data: passRequest } = await serviceRole
      .from('loyalty_pass_requests')
      .select('*, business_profiles!inner(id, city, business_name)')
      .eq('id', requestId)
      .eq('status', 'submitted')
      .single()

    if (!passRequest) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
    }

    if ((passRequest as any).business_profiles.city !== city) {
      return NextResponse.json({ error: 'City mismatch' }, { status: 403 })
    }

    const businessId = (passRequest as any).business_profiles.id
    const businessName = (passRequest as any).business_profiles.business_name

    await serviceRole
      .from('loyalty_pass_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason || 'No reason provided',
        reviewed_by_admin_id: admin.id,
      })
      .eq('id', requestId)

    await serviceRole
      .from('loyalty_programs')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)

    // Fire-and-forget notification
    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName,
        category: 'loyalty',
        subject: 'Loyalty Card Request Rejected',
        messagePreview: `${businessName}'s loyalty card request was rejected. Reason: ${reason || 'Not specified'}`,
        threadId: requestId,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block rejection
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  } catch (error) {
    console.error('[admin/loyalty/request/reject]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
