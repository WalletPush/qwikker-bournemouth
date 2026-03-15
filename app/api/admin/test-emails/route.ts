import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById } from '@/lib/utils/admin-auth'
import { sendFranchiseEmail, getFranchiseBaseUrl } from '@/lib/email/send-franchise-email'
import {
  createOfferApprovalEmail,
  createEventApprovalEmail,
  createSecretMenuApprovalEmail,
  createImageApprovalEmail,
  createChangeRejectionEmail,
  createBusinessApprovalEmail,
} from '@/lib/email/templates/business-notifications'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * POST /api/admin/test-emails
 * Sends one of each email type to the provided recipientEmail.
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
    const results: Record<string, { success: boolean; error?: string }> = {}

    const templates = [
      {
        key: 'business_approval',
        template: createBusinessApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
          supportEmail: 'support@qwikker.com',
        }),
      },
      {
        key: 'offer_approval',
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
        key: 'event_approval',
        template: createEventApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          eventName: 'Friday Jazz Night',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard/events`,
        }),
      },
      {
        key: 'secret_menu_approval',
        template: createSecretMenuApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          itemName: 'Off-Menu Wagyu Burger',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: 'image_approval',
        template: createImageApprovalEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          imageType: 'logo',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
        }),
      },
      {
        key: 'change_rejection',
        template: createChangeRejectionEmail({
          firstName: 'Test User',
          businessName: 'Test Restaurant',
          changeType: 'offer',
          changeName: 'Free Drinks For Everyone',
          rejectionReason:
            'The offer description is too vague. Please add specific terms and conditions, and ensure the value is realistic.',
          city,
          dashboardUrl: `${dashboardUrl}/dashboard`,
          supportEmail: 'support@qwikker.com',
        }),
      },
    ]

    for (const { key, template } of templates) {
      results[key] = await sendFranchiseEmail({ city, to: recipientEmail, template })
      await sleep(1500)
    }

    const allSucceeded = Object.values(results).every((r) => r.success)
    const failedCount = Object.values(results).filter((r) => !r.success).length

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded
        ? `All 6 test emails sent to ${recipientEmail}`
        : `${6 - failedCount}/6 emails sent. ${failedCount} failed.`,
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
