import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { sendFranchiseEmail, getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import { createClaimInvitationEmail } from '@/lib/email/templates/business-notifications'

/**
 * Admin action: send (or preview) a branded "claim your listing" outreach email
 * to an UNCLAIMED business. The CTA deep-links straight into the claim flow
 * pre-selected for this business (/claim?business_id=...). Sent from the city
 * subdomain Resend (no-reply@{city}.qwikker.com).
 *
 * Body: { businessId: string, mode: 'preview' | 'send' }
 */
export async function POST(request: NextRequest) {
  try {
    const { businessId, mode = 'preview' } = await request.json()

    if (!businessId) {
      return NextResponse.json({ error: 'Missing businessId' }, { status: 400 })
    }

    // Admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)

    if (!admin || !(await isAdminForCity(adminSession.adminId, requestCity))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    const { data: business, error: businessError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, business_name, email, city, status, owner_user_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Tenant isolation: admin can only act on businesses in their own city
    if (business.city !== requestCity) {
      return NextResponse.json({ error: 'Unauthorized access to this business' }, { status: 403 })
    }

    // Only unclaimed listings can be invited to claim
    const isClaimed = !!business.owner_user_id || business.status === 'approved' || business.status === 'live'
    if (isClaimed) {
      return NextResponse.json(
        { error: 'This business has already been claimed' },
        { status: 400 }
      )
    }

    if (!business.email) {
      return NextResponse.json(
        { error: 'No email on file for this business. Add one first.' },
        { status: 400 }
      )
    }

    const city = business.city || requestCity
    const baseUrl = getFranchiseBaseUrl(city)
    const supportEmail = getFranchiseSupportEmail(city)

    const template = createClaimInvitationEmail({
      businessName: business.business_name || 'your business',
      city,
      claimUrl: `${baseUrl}/claim?business_id=${business.id}`,
      supportEmail,
    })

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: true,
        to: business.email,
        subject: template.subject,
        html: template.html,
      })
    }

    const emailResult = await sendFranchiseEmail({
      city,
      to: business.email,
      template,
      tags: [{ name: 'type', value: 'claim_invitation' }],
    })

    if (!emailResult.success) {
      console.error(`❌ [${city}] Claim invitation failed for ${business.email}: ${emailResult.error}`)
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 502 }
      )
    }

    console.log(`📧 [${city}] Claim invitation sent to ${business.email} (${business.business_name})`)

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      to: business.email,
    })
  } catch (error) {
    console.error('send-claim-email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
