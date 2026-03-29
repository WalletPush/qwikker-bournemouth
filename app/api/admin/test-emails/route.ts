import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById } from '@/lib/utils/admin-auth'
import { sendFranchiseEmail, getFranchiseBaseUrl, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
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
} from '@/lib/email/templates/business-notifications'
import { createCityLiveEmail } from '@/lib/email/templates/city-request-notifications'
import { createConsumerWelcomeEmail } from '@/lib/email/templates/consumer-notifications'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * POST /api/admin/test-emails
 * Sends one of every email template to the provided recipientEmail.
 * Protected by admin auth. Uses Bournemouth franchise config.
 * Adds a 1.5s delay between sends to avoid Resend rate limits.
 */
export async function POST(request: NextRequest) {
  try {
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

    const { recipientEmail } = await request.json()
    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 })
    }

    const city = 'bournemouth'
    const dashboardUrl = getFranchiseBaseUrl(city)
    const supportEmail = await getFranchiseSupportEmail(city)
    const results: Record<string, { success: boolean; error?: string }> = {}

    const templates = [
      {
        key: '1_business_welcome',
        template: createBusinessWelcomeEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
          supportEmail,
        }),
      },
      {
        key: '2_business_submitted',
        template: createBusinessSubmittedEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          city,
          supportEmail,
        }),
      },
      {
        key: '3_business_approval',
        template: createBusinessApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
          supportEmail,
        }),
      },
      {
        key: '4_business_rejection',
        template: createBusinessRejectionEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          rejectionReason:
            'Your business description needs more detail. Please include your cuisine type, seating capacity, and any unique features.',
          city,
          supportEmail,
        }),
      },
      {
        key: '5_offer_approval',
        template: createOfferApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          offerName: '20% Off Sunday Roast',
          offerValue: '20% off',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: '6_menu_approval',
        template: createMenuApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          menuName: 'Spring Menu 2026',
          menuType: 'food',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: '7_event_approval',
        template: createEventApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          eventName: 'Friday Jazz Night',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard/events`,
        }),
      },
      {
        key: '8_secret_menu_approval',
        template: createSecretMenuApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          itemName: 'Off-Menu Wagyu Burger',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: '9_image_approval',
        template: createImageApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          imageType: 'logo',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: '10_change_rejection',
        template: createChangeRejectionEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          changeType: 'offer',
          changeName: 'Free Drinks For Everyone',
          rejectionReason:
            'The offer description is too vague. Please add specific terms and conditions, and ensure the value is realistic.',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
          supportEmail,
        }),
      },
      {
        key: '11_consumer_welcome',
        template: createConsumerWelcomeEmail({
          firstName: 'Test User',
          city,
          dashboardUrl: `${dashboardUrl}/user/dashboard?wallet_pass_id=TEST-PASS-123`,
          chatUrl: `${dashboardUrl}/user/chat?wallet_pass_id=TEST-PASS-123`,
          offersUrl: `${dashboardUrl}/user/offers?wallet_pass_id=TEST-PASS-123`,
          supportEmail,
        }),
      },
      {
        key: '12_city_live',
        template: createCityLiveEmail({
          cityName: 'Bournemouth',
          cityUrl: 'https://bournemouth.qwikker.com',
        }),
      },
    ]

    const total = templates.length

    for (const { key, template } of templates) {
      results[key] = await sendFranchiseEmail({ city, to: recipientEmail, template })
      await sleep(1500)
    }

    const allSucceeded = Object.values(results).every((r) => r.success)
    const failedCount = Object.values(results).filter((r) => !r.success).length

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? `All ${total} test emails sent to ${recipientEmail}`
        : `${total - failedCount}/${total} emails sent. ${failedCount} failed.`,
      results,
    })
  } catch (error) {
    console.error('Test emails error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
