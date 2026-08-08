import { NextRequest, NextResponse } from 'next/server'
import { requireCityAdmin } from '@/lib/email/admin-email-auth'
import { isCityEmailConfigured } from '@/lib/email/suite-config'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await requireCityAdmin(request)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const config = await isCityEmailConfigured(auth.city)
  const supabase = createAdminClient()

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ count: failedCount }, { count: inboundUnread }] = await Promise.all([
    supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('city', auth.city)
      .eq('direction', 'outbound')
      .eq('status', 'failed')
      .gte('created_at', since),
    // Unread = inbound with no metadata.read_at (set when admin opens the message)
    supabase
      .from('email_sends')
      .select('id', { count: 'exact', head: true })
      .eq('city', auth.city)
      .eq('direction', 'inbound')
      .filter('metadata->>read_at', 'is', null),
  ])

  return NextResponse.json({
    city: auth.city,
    configured: config.configured,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    replyTo: `hello@${auth.city}.qwikker.com`,
    failedLast7d: failedCount || 0,
    inboundUnread: inboundUnread || 0,
  })
}
