import { NextRequest, NextResponse } from 'next/server'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('email_suppressions')
    .select('id, email, business_id, scope, reason, unsubscribed_at, source_send_id')
    .eq('city', auth.city)
    .order('unsubscribed_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suppressions: data || [] })
}
