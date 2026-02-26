import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'

/**
 * POST /api/admin/loyalty/request/activate
 *
 * City admin activates a loyalty program by providing WalletPush
 * credentials. Stores on both loyalty_programs and loyalty_pass_requests.
 * Sets program status to 'active'. Sends approval notification.
 *
 * Body: { requestId, walletpush_template_id, walletpush_api_key, walletpush_pass_type_id }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const city = admin.city

    const {
      requestId,
      walletpush_template_id,
      walletpush_api_key,
      walletpush_pass_type_id,
    } = await request.json()

    if (!requestId || !walletpush_template_id || !walletpush_api_key || !walletpush_pass_type_id) {
      return NextResponse.json(
        { error: 'All WalletPush credentials are required' },
        { status: 400 }
      )
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

    const { error: programError } = await serviceRole
      .from('loyalty_programs')
      .update({
        walletpush_template_id,
        walletpush_api_key,
        walletpush_pass_type_id,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId)

    if (programError) {
      return NextResponse.json({ error: programError.message }, { status: 500 })
    }

    await serviceRole
      .from('loyalty_pass_requests')
      .update({
        status: 'issued',
        walletpush_template_id,
        walletpush_api_key,
        walletpush_pass_type_id,
        reviewed_by_admin_id: admin.id,
      })
      .eq('id', requestId)

    // Fire-and-forget notification
    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName,
        category: 'loyalty',
        subject: 'Loyalty Card Activated',
        messagePreview: `${businessName}'s loyalty card has been activated and is now live.`,
        threadId: requestId,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block activation
    }

    return NextResponse.json({ success: true, status: 'active' })
  } catch (error) {
    console.error('[admin/loyalty/request/activate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
