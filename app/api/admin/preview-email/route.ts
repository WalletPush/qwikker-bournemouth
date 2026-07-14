import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById } from '@/lib/utils/admin-auth'
import { getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import {
  createBusinessWelcomeEmail,
  createBusinessSubmittedEmail,
  createBusinessApprovalEmail,
  createBusinessRejectionEmail,
  createOfferApprovalEmail,
  createMenuApprovalEmail,
  createEventApprovalEmail,
  createSecretMenuApprovalEmail,
  createImageApprovalEmail,
  createChangeRejectionEmail,
  createFreeTierTrialNudgeEmail,
} from '@/lib/email/templates/business-notifications'
import { createCityLiveEmail } from '@/lib/email/templates/city-request-notifications'
import { createConsumerWelcomeEmail } from '@/lib/email/templates/consumer-notifications'
import { getTierFeatures } from '@/lib/utils/tier-limits'

/**
 * GET /api/admin/preview-email?template=<key>&city=<city>&tier=<tier>&days=<n>
 *
 * Renders an email template's HTML directly in the browser — NO email is sent.
 * Admin-only. Use ?format=text to view the plain-text version instead.
 *
 * Examples:
 *   /api/admin/preview-email                                   → free-tier trial nudge (default)
 *   /api/admin/preview-email?template=free_tier_trial_nudge&tier=Spotlight&days=60
 *   /api/admin/preview-email?template=business_welcome
 *   /api/admin/preview-email                                   (no ?template lists all keys)
 */
export async function GET(request: NextRequest) {
  // This route only renders email templates with DUMMY data (no real records,
  // no emails sent), so in local dev we skip the admin-cookie check to avoid the
  // host/subdomain cookie-scope friction. In production it stays admin-only.
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
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
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 403 })
    }
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('template') || 'free_tier_trial_nudge'
  const city = searchParams.get('city') || 'bournemouth'
  const format = searchParams.get('format') || 'html'
  // `tier` is the tier CODE (featured/spotlight/starter) so features + display
  // name both reflect the real tier, exactly like signup does.
  const tierCode = (searchParams.get('tier') || 'featured').toLowerCase()
  const tierDisplayName = tierCode.charAt(0).toUpperCase() + tierCode.slice(1)
  const days = parseInt(searchParams.get('days') || '90', 10)

  const baseUrl = getFranchiseBaseUrl(city)
  const supportEmail = await getFranchiseSupportEmail(city)
  const dashboardUrl = `${baseUrl}/dashboard`

  const templates: Record<string, () => { subject: string; html: string; text: string }> = {
    free_tier_trial_nudge: () =>
      createFreeTierTrialNudgeEmail({
        firstName: 'Test User',
        businessName: 'Test Restaurant',
        city,
        trialTierDisplayName: tierDisplayName,
        trialDays: days,
        features: getTierFeatures(tierCode),
        upgradeUrl: `${baseUrl}/dashboard/settings`,
        dashboardUrl,
        supportEmail,
        assetBaseUrl: baseUrl,
      }),
    business_welcome: () =>
      createBusinessWelcomeEmail({ firstName: 'Test User', businessName: 'Test Restaurant', city, dashboardUrl, supportEmail }),
    business_submitted: () =>
      createBusinessSubmittedEmail({ firstName: 'Test User', businessName: 'Test Restaurant', city, supportEmail }),
    business_approval: () =>
      createBusinessApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', city, dashboardUrl, supportEmail }),
    business_rejection: () =>
      createBusinessRejectionEmail({ firstName: 'Test User', businessName: 'Test Restaurant', rejectionReason: 'Please add more detail to your description.', city, supportEmail }),
    offer_approval: () =>
      createOfferApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', offerName: '20% Off Sunday Roast', offerValue: '20% off', city, dashboardUrl }),
    menu_approval: () =>
      createMenuApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', menuName: 'Spring Menu 2026', menuType: 'food', city, dashboardUrl }),
    event_approval: () =>
      createEventApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', eventName: 'Friday Jazz Night', city, dashboardUrl: `${dashboardUrl}/events` }),
    secret_menu_approval: () =>
      createSecretMenuApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', itemName: 'Off-Menu Wagyu Burger', city, dashboardUrl }),
    image_approval: () =>
      createImageApprovalEmail({ firstName: 'Test User', businessName: 'Test Restaurant', imageType: 'logo', city, dashboardUrl }),
    change_rejection: () =>
      createChangeRejectionEmail({ firstName: 'Test User', businessName: 'Test Restaurant', changeType: 'offer', changeName: 'Free Drinks For Everyone', rejectionReason: 'Please add specific terms.', city, dashboardUrl, supportEmail }),
    consumer_welcome: () =>
      createConsumerWelcomeEmail({ firstName: 'Test User', city, dashboardUrl: `${baseUrl}/user/dashboard?wallet_pass_id=TEST-PASS-123`, chatUrl: `${baseUrl}/user/chat?wallet_pass_id=TEST-PASS-123`, offersUrl: `${baseUrl}/user/offers?wallet_pass_id=TEST-PASS-123`, supportEmail }),
    city_live: () =>
      createCityLiveEmail({ cityName: city.charAt(0).toUpperCase() + city.slice(1), cityUrl: `https://${city}.qwikker.com` }),
  }

  const builder = templates[key]
  if (!builder) {
    return NextResponse.json(
      { error: `Unknown template '${key}'`, availableTemplates: Object.keys(templates) },
      { status: 400 }
    )
  }

  const template = builder()

  if (format === 'text') {
    return new NextResponse(template.text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  if (format === 'json') {
    return NextResponse.json({ subject: template.subject, html: template.html, text: template.text })
  }

  return new NextResponse(template.html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
