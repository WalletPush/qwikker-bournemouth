import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'
import { sendFranchiseEmail, getFranchiseBaseUrl } from '@/lib/email/send-franchise-email'
import { renderSuiteTemplate } from '@/lib/email/suite-templates'

/**
 * POST /api/admin/loyalty/request/activate
 *
 * City admin activates a loyalty program by providing WalletPush
 * credentials. Stores on both loyalty_programs and loyalty_pass_requests.
 * Sets program status to 'active'. Emails the business (loyalty_card_ready)
 * and pings Slack. Email/Slack failures never block activation.
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
      .select(
        '*, business_profiles!inner(id, city, business_name, email, first_name)'
      )
      .eq('id', requestId)
      .eq('status', 'submitted')
      .single()

    if (!passRequest) {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
    }

    const profile = passRequest.business_profiles as {
      id: string
      city: string
      business_name: string
      email: string | null
      first_name: string | null
    }

    if (profile.city !== city) {
      return NextResponse.json({ error: 'City mismatch' }, { status: 403 })
    }

    const businessId = profile.id
    const businessName = profile.business_name

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

    // Transactional email to the business — non-blocking
    let emailSent = false
    const toEmail = profile.email?.trim().toLowerCase()
    if (toEmail) {
      try {
        const loyaltyUrl = `${getFranchiseBaseUrl(city)}/dashboard/loyalty`
        const template = renderSuiteTemplate('loyalty_card_ready', {
          city,
          businessName,
          firstName: profile.first_name,
          email: toEmail,
          businessId,
          loyaltyUrl,
        })
        const emailResult = await sendFranchiseEmail({
          city,
          to: toEmail,
          template,
          tags: [{ name: 'type', value: 'loyalty_card_ready' }],
          logMeta: {
            businessId,
            templateKey: 'loyalty_card_ready',
            category: 'lifecycle',
            sentBy: admin.id,
          },
        })
        emailSent = Boolean(emailResult.success)
        if (!emailResult.success) {
          console.error(
            `[admin/loyalty/request/activate] email failed for ${businessName}:`,
            emailResult.error
          )
        }
      } catch (emailErr) {
        console.error('[admin/loyalty/request/activate] email error:', emailErr)
      }
    } else {
      console.warn(
        `[admin/loyalty/request/activate] no email on file for ${businessName} — skipped loyalty_card_ready`
      )
    }

    // Fire-and-forget Slack
    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName,
        category: 'loyalty',
        subject: 'Loyalty Card Activated',
        messagePreview: `${businessName}'s loyalty card has been activated and is now live.${
          emailSent ? ' Owner emailed.' : toEmail ? ' Owner email failed.' : ' No owner email on file.'
        }`,
        threadId: requestId,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block activation
    }

    return NextResponse.json({ success: true, status: 'active', emailSent })
  } catch (error) {
    console.error('[admin/loyalty/request/activate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
