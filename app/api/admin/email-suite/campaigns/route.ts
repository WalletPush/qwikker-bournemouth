import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import { resolveAudience } from '@/lib/email/suite-audience'
import { SUITE_TEMPLATES } from '@/lib/email/suite-templates'

const createSchema = z.object({
  name: z.string().min(1).max(120),
  templateKey: z.string().min(1),
  subjectOverride: z.string().optional(),
  audienceFilter: z
    .object({
      preset: z
        .enum(['business_ids', 'live', 'unclaimed_with_email', 'incomplete', 'expired_trial', 'free_tier'])
        .default('live'),
      businessIds: z.array(z.string().uuid()).optional(),
    })
    .default({ preset: 'live' }),
  scheduledAt: z.string().datetime().optional().nullable(),
  sendNow: z.boolean().optional(),
  confirmBulk: z.boolean().optional(),
  previewAcknowledged: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  customSubject: z.string().optional(),
  customText: z.string().optional(),
  trialDays: z.number().int().min(1).max(365).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('city', auth.city)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = await isCityEmailConfigured(auth.city)
  if (!config.configured) {
    return NextResponse.json({ error: 'Email not configured for this city' }, { status: 400 })
  }

  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  const def = SUITE_TEMPLATES.find((t) => t.key === body.templateKey)
  if (!def) {
    return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
  }
  if (!def.campaignAllowed) {
    return NextResponse.json(
      { error: `"${def.name}" is not a campaign template — use Templates for 1:1 sends, or Automations for digests.` },
      { status: 400 }
    )
  }
  if (
    body.audienceFilter.preset !== 'business_ids' &&
    !def.recommendedAudiences.includes(body.audienceFilter.preset)
  ) {
    return NextResponse.json(
      {
        error: `Audience not valid for ${def.name}. Allowed: ${def.recommendedAudiences.join(', ')}`,
      },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const status = body.sendNow ? 'sending' : body.scheduledAt ? 'scheduled' : 'draft'

  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .insert({
      city: auth.city,
      name: body.name,
      template_key: body.templateKey,
      subject_override: body.subjectOverride || body.customSubject || null,
      audience_filter: body.audienceFilter,
      status,
      scheduled_at: body.scheduledAt || null,
      created_by: auth.adminId,
    })
    .select('*')
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 })
  }

  if (!body.sendNow) {
    const audience = await resolveAudience({
      city: auth.city,
      preset: body.audienceFilter.preset,
      businessIds: body.audienceFilter.businessIds,
    })
    return NextResponse.json({
      campaign,
      audiencePreviewCount: audience.length,
    })
  }

  // Send immediately via suite send (preview → confirm required)
  const baseUrl = new URL(request.url).origin
  const cookie = request.headers.get('cookie') || ''
  const sendRes = await fetch(`${baseUrl}/api/admin/email-suite/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      templateKey: body.templateKey,
      audiencePreset: body.audienceFilter.preset,
      businessIds: body.audienceFilter.businessIds,
      customSubject: body.customSubject || body.subjectOverride,
      customText: body.customText,
      trialDays: body.trialDays,
      confirmBulk: body.confirmBulk,
      previewAcknowledged: body.previewAcknowledged,
      dryRun: body.dryRun,
      campaignId: campaign.id,
    }),
  })

  const sendJson = await sendRes.json()
  if (sendRes.status === 409) {
    await supabase.from('email_campaigns').update({ status: 'draft' }).eq('id', campaign.id)
    return NextResponse.json({ ...sendJson, campaignId: campaign.id }, { status: 409 })
  }

  const nextStatus = sendRes.ok ? 'sent' : 'failed'
  await supabase
    .from('email_campaigns')
    .update({
      status: nextStatus,
      sent_at: nextStatus === 'sent' ? new Date().toISOString() : null,
      stats: {
        sent: sendJson.sent || 0,
        skipped: sendJson.skipped || 0,
        failed: sendJson.failed || 0,
        total: sendJson.total || 0,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaign.id)

  return NextResponse.json({ campaign: { ...campaign, status: nextStatus }, send: sendJson }, { status: sendRes.ok ? 200 : 500 })
}
