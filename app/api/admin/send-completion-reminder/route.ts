import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { sendFranchiseEmail, getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import { createCompletionReminderEmail } from '@/lib/email/templates/business-notifications'
import { getBusinessCompletion } from '@/lib/utils/business-completion'

/**
 * Admin action: send (or preview) a "complete your listing" reminder email
 * to an incomplete business. The email is sent from the city subdomain Resend
 * (no-reply@{city}.qwikker.com) and lists exactly which required items remain.
 *
 * Body: { businessId: string, mode: 'preview' | 'send' }
 * - preview: returns the rendered subject/html and recipient without sending
 * - send: actually dispatches the email
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
      .select(
        'id, business_name, email, first_name, city, status, business_type, business_category, business_address, phone, business_tagline, business_description, business_hours, business_hours_structured, logo, business_images'
      )
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Tenant isolation: admin can only act on businesses in their own city
    if (business.city !== requestCity) {
      return NextResponse.json({ error: 'Unauthorized access to this business' }, { status: 403 })
    }

    if (!business.email) {
      return NextResponse.json({ error: 'This business has no email address on file' }, { status: 400 })
    }

    const { missing, completionPercentage } = getBusinessCompletion(business)

    if (missing.length === 0) {
      return NextResponse.json(
        { error: 'This listing has no outstanding required items' },
        { status: 400 }
      )
    }

    const city = business.city || requestCity
    const baseUrl = getFranchiseBaseUrl(city)
    const supportEmail = getFranchiseSupportEmail(city)

    // Capitalize the first letter of the contact's name for the greeting (e.g. "darryl" -> "Darryl")
    const rawFirstName = (business.first_name || '').trim()
    const greetingName = rawFirstName
      ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
      : 'there'

    const template = createCompletionReminderEmail({
      firstName: greetingName,
      businessName: business.business_name || 'your business',
      city,
      dashboardUrl: `${baseUrl}/dashboard`,
      contactCentreUrl: `${baseUrl}/dashboard/contact-centre`,
      supportEmail,
      missingItems: missing,
      completionPercentage,
    })

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        preview: true,
        to: business.email,
        subject: template.subject,
        html: template.html,
        missingItems: missing,
        completionPercentage,
      })
    }

    const emailResult = await sendFranchiseEmail({
      city,
      to: business.email,
      template,
      tags: [{ name: 'type', value: 'completion_reminder' }],
    })

    if (!emailResult.success) {
      console.error(`❌ [${city}] Completion reminder failed for ${business.email}: ${emailResult.error}`)
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 502 }
      )
    }

    console.log(`📧 [${city}] Completion reminder sent to ${business.email} (${business.business_name})`)

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      to: business.email,
    })
  } catch (error) {
    console.error('send-completion-reminder API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
