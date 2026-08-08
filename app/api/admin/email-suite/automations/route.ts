import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const AUTOMATION_CATALOGUE = [
  {
    key: 'weekly_digest',
    name: 'Weekly ROI digest',
    description: 'Mondays: send performance summary to approved businesses with activity (off by default).',
  },
  {
    key: 'trial_ending',
    name: 'Trial ending soon',
    description: 'Notify businesses whose trial ends in 3 days (off by default; not wired to cron yet).',
  },
  {
    key: 'completion_nudge',
    name: 'Incomplete profile nudge',
    description: 'Remind incomplete listings after N days (off by default; not wired to cron yet).',
  },
] as const

const patchSchema = z.object({
  automationKey: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { data } = await supabase.from('email_automations').select('*').eq('city', auth.city)

  const byKey = new Map((data || []).map((r: { automation_key: string }) => [r.automation_key, r]))

  const automations = AUTOMATION_CATALOGUE.map((item) => {
    const row = byKey.get(item.key) as
      | {
          id: string
          enabled: boolean
          config: Record<string, unknown>
          last_run_at: string | null
        }
      | undefined
    return {
      key: item.key,
      name: item.name,
      description: item.description,
      enabled: row?.enabled ?? false,
      config: row?.config ?? {},
      lastRunAt: row?.last_run_at ?? null,
      id: row?.id ?? null,
    }
  })

  return NextResponse.json({ automations })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch (e) {
    return NextResponse.json({ error: 'Invalid body', details: e }, { status: 400 })
  }

  if (!AUTOMATION_CATALOGUE.some((a) => a.key === body.automationKey)) {
    return NextResponse.json({ error: 'Unknown automation' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('email_automations')
    .upsert(
      {
        city: auth.city,
        automation_key: body.automationKey,
        enabled: body.enabled,
        config: body.config || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'city,automation_key' }
    )
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ automation: data })
}
