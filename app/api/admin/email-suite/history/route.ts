import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const querySchema = z.object({
  businessId: z.string().uuid().optional(),
  status: z.string().optional(),
  direction: z.enum(['outbound', 'inbound', 'all']).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
  id: z.string().uuid().optional(),
})

/** Strip chars that break PostgREST `.or()` / ilike / in() filters. */
function sanitizeSearchTerm(raw: string): string {
  return raw.trim().replace(/[%_,.()"'\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { businessId, status, direction, q, limit = 50, offset = 0, id } = parsed.data
  const supabase = createAdminClient()

  if (id) {
    const { data, error } = await supabase
      .from('email_sends')
      .select(
        'id, city, business_id, direction, to_email, from_email, reply_to, subject, html_body, text_body, template_key, category, resend_message_id, status, sent_by, campaign_id, batch_id, thread_id, metadata, sent_at, created_at'
      )
      .eq('city', auth.city)
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let businessName: string | null = null
    if (data.business_id) {
      const { data: biz } = await supabase
        .from('business_profiles')
        .select('business_name')
        .eq('id', data.business_id)
        .maybeSingle()
      businessName = biz?.business_name || null
    }

    const { data: events } = await supabase
      .from('email_send_events')
      .select('id, event_type, payload, created_at')
      .eq('email_send_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      send: { ...data, business_name: businessName },
      events: events || [],
    })
  }

  const term = sanitizeSearchTerm(q || '')
  let matchingBusinessIds: string[] = []

  if (term.length >= 2) {
    const pattern = `%${term}%`
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('city', auth.city)
      .or(
        `business_name.ilike."${pattern}",first_name.ilike."${pattern}",last_name.ilike."${pattern}",email.ilike."${pattern}"`
      )
      .limit(50)
    matchingBusinessIds = (businesses || []).map((b) => b.id)
  }

  let query = supabase
    .from('email_sends')
    .select(
      'id, city, business_id, direction, to_email, from_email, subject, template_key, category, resend_message_id, status, sent_by, campaign_id, sent_at, created_at',
      { count: 'exact' }
    )
    .eq('city', auth.city)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (businessId) query = query.eq('business_id', businessId)
  if (status) query = query.eq('status', status)
  if (direction && direction !== 'all') query = query.eq('direction', direction)

  if (term.length >= 2) {
    const pattern = `"%${term}%"`
    if (matchingBusinessIds.length > 0) {
      const idList = matchingBusinessIds.join(',')
      query = query.or(
        `subject.ilike.${pattern},to_email.ilike.${pattern},business_id.in.(${idList})`
      )
    } else {
      query = query.or(`subject.ilike.${pattern},to_email.ilike.${pattern}`)
    }
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const bizIds = [...new Set(rows.map((r) => r.business_id).filter(Boolean))] as string[]
  const nameById = new Map<string, string>()

  if (bizIds.length > 0) {
    const { data: businesses } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .in('id', bizIds)
    for (const b of businesses || []) {
      nameById.set(b.id, b.business_name)
    }
  }

  const sends = rows.map((r) => ({
    ...r,
    business_name: r.business_id ? nameById.get(r.business_id) || null : null,
  }))

  return NextResponse.json({ sends, total: count || 0, limit, offset })
}
