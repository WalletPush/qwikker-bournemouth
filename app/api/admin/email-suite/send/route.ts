import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderSuiteTemplate, SUITE_TEMPLATES } from '@/lib/email/suite-templates'
import { sendFranchiseEmail } from '@/lib/email/send-franchise-email'
import { isEmailSuppressed } from '@/lib/email/suppressions'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import { resolveAudience, type AudiencePreset } from '@/lib/email/suite-audience'
import { loadSuiteOfferIdeas } from '@/lib/email/suite-offers'
import type { EmailCategory } from '@/lib/email/email-logger'

const bodySchema = z.object({
  templateKey: z.string().min(1),
  businessIds: z.array(z.string().uuid()).optional(),
  audiencePreset: z
    .enum(['business_ids', 'live', 'unclaimed_with_email', 'incomplete', 'expired_trial', 'free_tier'])
    .optional(),
  customSubject: z.string().optional(),
  customText: z.string().optional(),
  customHtml: z.string().optional(),
  trialDays: z.number().optional(),
  missingItems: z.array(z.string()).optional(),
  loyaltyUrl: z.string().optional(),
  /** Required for any send with 2+ recipients — admin saw recipient list. */
  confirmBulk: z.boolean().optional(),
  /** Required for every send — admin previewed HTML first. */
  previewAcknowledged: z.boolean().optional(),
  /** Resolve audience + return list without sending. */
  dryRun: z.boolean().optional(),
  campaignId: z.string().uuid().optional(),
})

/** Soft warn / hard confirm threshold */
const BULK_CONFIRM_AT = 2
/** Absolute cap — domain reputation safety */
const BULK_HARD_CAP = 50

export async function POST(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = await isCityEmailConfigured(auth.city)
  if (!config.configured) {
    return NextResponse.json({ error: 'Email not configured for this city' }, { status: 400 })
  }

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  const def = SUITE_TEMPLATES.find((t) => t.key === body.templateKey)
  if (!def) {
    return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
  }
  if (!def.visibleInSuite) {
    return NextResponse.json(
      {
        error:
          'This is a system email (sent automatically). It cannot be sent from the Suite — use Automations or the product action that triggers it.',
      },
      { status: 400 }
    )
  }

  if (body.templateKey === 'custom') {
    if (!body.customSubject?.trim() || !body.customText?.trim()) {
      return NextResponse.json(
        { error: 'Custom messages need a subject and body before send' },
        { status: 400 }
      )
    }
  }

  const preset = (body.audiencePreset || 'business_ids') as AudiencePreset

  // Block nonsensical campaign combos (e.g. completion reminder → all live)
  if (preset !== 'business_ids' && def.recommendedAudiences.length > 0) {
    if (!def.recommendedAudiences.includes(preset)) {
      return NextResponse.json(
        {
          error: `Audience "${preset}" is not valid for template "${def.name}". Use: ${def.recommendedAudiences.join(', ')}`,
        },
        { status: 400 }
      )
    }
  }

  const recipients = await resolveAudience({
    city: auth.city,
    preset,
    businessIds: body.businessIds,
    limit: BULK_HARD_CAP,
  })

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients with email' }, { status: 400 })
  }

  if (recipients.length > BULK_HARD_CAP) {
    return NextResponse.json(
      {
        error: `Hard cap is ${BULK_HARD_CAP} recipients per send to protect domain reputation. Narrow the audience.`,
      },
      { status: 400 }
    )
  }

  // Dry-run: always return audience + sample preview — never send
  if (body.dryRun) {
    const sampleBiz = recipients[0]
    let offers
    if (body.templateKey === 'offer_suggestions') {
      const loaded = await loadSuiteOfferIdeas(sampleBiz.id)
      offers = loaded.offers
    }
    const sample = renderSuiteTemplate(body.templateKey, {
      city: auth.city,
      businessName: sampleBiz.business_name,
      firstName: sampleBiz.first_name,
      email: sampleBiz.email,
      businessId: sampleBiz.id,
      customSubject: body.customSubject,
      customText: body.customText,
      customHtml: body.customHtml,
      trialDays: body.trialDays,
      missingItems: body.missingItems,
      loyaltyUrl: body.loyaltyUrl,
      offers,
    })
    return NextResponse.json({
      dryRun: true,
      recipientCount: recipients.length,
      recipients: recipients.map((r) => ({
        id: r.id,
        business_name: r.business_name,
        email: r.email,
      })),
      samplePreview: {
        to: sampleBiz.email,
        subject: sample.subject,
        html: sample.html,
      },
      hardCap: BULK_HARD_CAP,
      warning:
        recipients.length >= 10
          ? `Large send (${recipients.length}). High volume can hurt Resend/domain reputation — send in smaller batches when possible.`
          : null,
    })
  }

  if (!body.previewAcknowledged) {
    return NextResponse.json(
      {
        error: 'Preview the email before sending.',
        requiresPreview: true,
      },
      { status: 409 }
    )
  }

  if (recipients.length >= BULK_CONFIRM_AT && !body.confirmBulk) {
    return NextResponse.json(
      {
        requiresConfirmation: true,
        recipientCount: recipients.length,
        recipients: recipients.map((r) => ({
          id: r.id,
          business_name: r.business_name,
          email: r.email,
        })),
        message: `Confirm send to ${recipients.length} businesses. This cannot be undone.`,
        warning:
          recipients.length >= 10
            ? 'Large batch — prefer smaller audiences to protect deliverability.'
            : undefined,
      },
      { status: 409 }
    )
  }

  const category = (def.category === 'digest'
    ? 'digest'
    : def.category === 'outreach'
      ? 'outreach'
      : def.category === 'lifecycle'
        ? 'lifecycle'
        : def.requiresMarketingUnsub
          ? 'marketing'
          : 'transactional') as EmailCategory

  const supabase = createAdminClient()
  let batchId: string | null = null

  if (recipients.length > 1) {
    const sample = renderSuiteTemplate(body.templateKey, {
      city: auth.city,
      businessName: recipients[0].business_name,
      firstName: recipients[0].first_name,
      email: recipients[0].email,
      businessId: recipients[0].id,
      customSubject: body.customSubject,
      customText: body.customText,
      customHtml: body.customHtml,
      trialDays: body.trialDays,
      missingItems: body.missingItems,
      loyaltyUrl: body.loyaltyUrl,
    })
    const { data: batch } = await supabase
      .from('email_send_batches')
      .insert({
        city: auth.city,
        template_key: body.templateKey,
        category,
        subject: sample.subject,
        html_body: sample.html,
        text_body: sample.text,
        created_by: auth.adminId,
        campaign_id: body.campaignId || null,
      })
      .select('id')
      .single()
    batchId = batch?.id || null
  }

  const results: Array<{
    businessId: string
    email: string
    ok: boolean
    skipped?: boolean
    error?: string
    emailSendId?: string
  }> = []

  for (const biz of recipients) {
    const email = biz.email.trim().toLowerCase()
    if (def.requiresMarketingUnsub) {
      const blocked = await isEmailSuppressed({
        city: auth.city,
        email,
        scope: 'all_marketing',
      })
      if (blocked) {
        results.push({ businessId: biz.id, email, ok: false, skipped: true, error: 'suppressed' })
        continue
      }
    }

    try {
      let offers
      if (body.templateKey === 'offer_suggestions') {
        const loaded = await loadSuiteOfferIdeas(biz.id)
        offers = loaded.offers
      }

      const template = renderSuiteTemplate(body.templateKey, {
        city: auth.city,
        businessName: biz.business_name,
        firstName: biz.first_name,
        email,
        businessId: biz.id,
        customSubject: body.customSubject,
        customText: body.customText,
        customHtml: body.customHtml,
        trialDays: body.trialDays,
        missingItems: body.missingItems,
        loyaltyUrl: body.loyaltyUrl,
        offers,
      })

      const sendResult = await sendFranchiseEmail({
        city: auth.city,
        to: email,
        template,
        tags: [{ name: 'type', value: body.templateKey }],
        logMeta: {
          businessId: biz.id,
          templateKey: body.templateKey,
          category,
          sentBy: auth.adminId,
          campaignId: body.campaignId,
          batchId: batchId || undefined,
        },
      })

      results.push({
        businessId: biz.id,
        email,
        ok: sendResult.success,
        error: sendResult.error,
        emailSendId: sendResult.emailSendId,
      })

      // Light pacing for multi-sends (domain reputation)
      if (recipients.length > 5) {
        await new Promise((r) => setTimeout(r, 120))
      }
    } catch (e) {
      results.push({
        businessId: biz.id,
        email,
        ok: false,
        error: e instanceof Error ? e.message : 'send failed',
      })
    }
  }

  const sent = results.filter((r) => r.ok).length
  const skipped = results.filter((r) => r.skipped).length
  const failed = results.filter((r) => !r.ok && !r.skipped).length

  return NextResponse.json({
    sent,
    skipped,
    failed,
    total: results.length,
    batchId,
    results,
  })
}
