import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import {
  buildClaimTemplate,
  getInviteContent,
  isAlreadyClaimed,
  sendClaimInvite,
} from '@/lib/listing-engine/send-claim-invite'

// Sending renders the Present Mode PDF attachment in headless Chrome.
export const runtime = 'nodejs'
export const maxDuration = 60

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
      .select('id, business_name, email, city, status, owner_user_id, rating, review_count')
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
    if (isAlreadyClaimed(business)) {
      return NextResponse.json({ error: 'This business has already been claimed' }, { status: 400 })
    }

    if (!business.email) {
      return NextResponse.json(
        { error: 'No email on file for this business. Add one first.' },
        { status: 400 }
      )
    }

    const city = business.city || requestCity

    if (mode === 'preview') {
      const content = await getInviteContent(supabaseAdmin, business.id)
      const template = buildClaimTemplate(business, city, content)
      return NextResponse.json({
        success: true,
        preview: true,
        to: business.email,
        subject: template.subject,
        html: template.html,
      })
    }

    const outcome = await sendClaimInvite(supabaseAdmin, business, admin.id)
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error || 'Failed to send email' }, { status: 502 })
    }

    return NextResponse.json({ success: true, to: outcome.to })
  } catch (error) {
    console.error('send-claim-email API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
