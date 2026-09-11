import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'
import { sendFranchiseEmail, getFranchiseBaseUrl } from '@/lib/email/send-franchise-email'
import { renderSuiteTemplate } from '@/lib/email/suite-templates'
import type { DesignSpecJson } from '@/lib/loyalty/loyalty-types'
import {
  provisionLoyaltyWalletPass,
  WalletPushProvisionError,
} from '@/lib/loyalty/walletpush-provision'

/**
 * POST /api/admin/loyalty/request/activate
 *
 * Activates a submitted loyalty program.
 *
 * Preferred (one-click / semi-auto):
 *   { requestId }
 *   { requestId, walletpush_template_id }  // duplicate MASTER in Pass Designer, paste id
 *
 * Legacy manual:
 *   { requestId, walletpush_template_id, walletpush_api_key, walletpush_pass_type_id }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const city = admin.city
    const body = await request.json()
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : ''

    if (!requestId) {
      return NextResponse.json({ error: 'requestId is required' }, { status: 400 })
    }

    const manualTemplateId =
      typeof body.walletpush_template_id === 'string' ? body.walletpush_template_id.trim() : ''
    const manualApiKey =
      typeof body.walletpush_api_key === 'string' ? body.walletpush_api_key.trim() : ''
    const manualPassType =
      typeof body.walletpush_pass_type_id === 'string' ? body.walletpush_pass_type_id.trim() : ''

    const hasFullManual = !!(manualTemplateId && manualApiKey && manualPassType)
    const hasTemplateOnly = !!(manualTemplateId && !manualApiKey && !manualPassType)

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
    const designSpec = (passRequest.design_spec_json || {}) as DesignSpecJson

    let walletpush_template_id = manualTemplateId
    let walletpush_api_key = manualApiKey
    let walletpush_pass_type_id = manualPassType
    let provisionMode: string | null = hasFullManual ? 'manual' : null

    if (!hasFullManual) {
      try {
        const provisioned = await provisionLoyaltyWalletPass({
          city,
          designSpec: {
            ...designSpec,
            business_name: designSpec.business_name || businessName,
            business_city: designSpec.business_city || city,
            program_name:
              designSpec.program_name || `${businessName} Rewards`,
            type: designSpec.type || 'stamps',
            reward_threshold: designSpec.reward_threshold || 10,
            reward_description: designSpec.reward_description || '',
            stamp_label: designSpec.stamp_label || 'Stamps',
            earn_mode: designSpec.earn_mode || 'per_visit',
            stamp_icon: designSpec.stamp_icon || 'stamp',
            earn_instructions: designSpec.earn_instructions ?? null,
            redeem_instructions: designSpec.redeem_instructions ?? null,
            primary_color: designSpec.primary_color ?? null,
            background_color: designSpec.background_color ?? null,
            logo_url: designSpec.logo_url ?? null,
            logo_description: designSpec.logo_description ?? null,
            strip_image_url: designSpec.strip_image_url ?? null,
            strip_image_description: designSpec.strip_image_description ?? null,
            terms_and_conditions: designSpec.terms_and_conditions ?? null,
            timezone: designSpec.timezone || 'Europe/London',
            max_earns_per_day: designSpec.max_earns_per_day ?? 1,
            min_gap_minutes: designSpec.min_gap_minutes ?? 30,
          },
          templateId: hasTemplateOnly || manualTemplateId ? manualTemplateId : undefined,
        })
        walletpush_template_id = provisioned.walletpush_template_id
        walletpush_api_key = provisioned.walletpush_api_key
        walletpush_pass_type_id = provisioned.walletpush_pass_type_id
        provisionMode = provisioned.mode
      } catch (err) {
        if (err instanceof WalletPushProvisionError) {
          return NextResponse.json(
            {
              error: err.message,
              code: err.code,
              details: err.details || null,
            },
            { status: 422 }
          )
        }
        throw err
      }
    }

    if (!walletpush_template_id || !walletpush_api_key || !walletpush_pass_type_id) {
      return NextResponse.json(
        { error: 'WalletPush credentials incomplete after provision' },
        { status: 500 }
      )
    }

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

    try {
      const { sendContactSlackNotification } = await import('@/lib/utils/contact-slack')
      await sendContactSlackNotification({
        city: city as any,
        businessName,
        category: 'loyalty',
        subject: 'Loyalty Card Activated',
        messagePreview: `${businessName}'s stamp card is live (${provisionMode || 'manual'}).${
          emailSent ? ' Owner emailed.' : toEmail ? ' Owner email failed.' : ' No owner email on file.'
        }`,
        threadId: requestId,
        eventType: 'new_message',
      })
    } catch {
      // Notification failure should not block activation
    }

    return NextResponse.json({
      success: true,
      status: 'active',
      emailSent,
      provisionMode,
      walletpush_template_id,
      walletpush_pass_type_id,
      warning:
        provisionMode === 'shared_master'
          ? 'Activated on the shared city Loyalty MASTER (join/earn works). Stamp card chrome is the MASTER design until WalletPush deep-clone exists — duplicate MASTER in Pass Designer + Activate with that template id for a branded card.'
          : null,
    })
  } catch (error) {
    console.error('[admin/loyalty/request/activate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
