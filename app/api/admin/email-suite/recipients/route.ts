import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const querySchema = z.object({
  q: z.string().optional(),
  id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(20).optional(),
})

/** Strip chars that break PostgREST `.or()` / ilike patterns. */
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

  const { q, id, limit = 20 } = parsed.data
  const supabase = createAdminClient()
  const select = 'id, business_name, first_name, last_name, email'

  if (id) {
    const { data, error } = await supabase
      .from('business_profiles')
      .select(select)
      .eq('city', auth.city)
      .eq('id', id)
      .not('email', 'is', null)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.email?.trim()) {
      return NextResponse.json({ error: 'Business not found or has no email' }, { status: 404 })
    }
    return NextResponse.json({ recipient: data })
  }

  const term = sanitizeSearchTerm(q || '')
  if (term.length < 2) {
    return NextResponse.json({ recipients: [] })
  }

  // Quote pattern so spaces / reserved chars are safe in PostgREST `.or()`
  const pattern = `"%${term}%"`
  const { data, error } = await supabase
    .from('business_profiles')
    .select(select)
    .eq('city', auth.city)
    .not('email', 'is', null)
    .or(
      `business_name.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern}`
    )
    .order('business_name')
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recipients = (data || []).filter((r) => Boolean(r.email?.trim()))
  return NextResponse.json({ recipients })
}
