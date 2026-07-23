import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { sendFranchiseEmail, getFranchiseSupportEmail } from '@/lib/email/send-franchise-email'
import { getFranchisePublicUrl } from '@/lib/utils/franchise-url'
import type { EmailTemplate } from '@/lib/email/email-service'

// Resend caps recipients per send; chunk BCC to stay well within limits and
// keep addresses private (recipients never see each other).
const BCC_CHUNK = 45

async function authCity(request: NextRequest): Promise<{ city: string } | { error: string; status: number }> {
  const cookieStore = await cookies()
  const adminSessionCookie = cookieStore.get('qwikker_admin_session')
  if (!adminSessionCookie?.value) return { error: 'Not authenticated', status: 401 }

  let adminSession
  try {
    adminSession = JSON.parse(adminSessionCookie.value)
  } catch {
    return { error: 'Invalid session', status: 401 }
  }

  const admin = await getAdminById(adminSession.adminId)
  const city = await getCityFromHostname(request.headers.get('host') || '')
  if (!admin || !(await isAdminForCity(adminSession.adminId, city))) {
    return { error: 'Insufficient permissions', status: 403 }
  }
  return { city }
}

function buildLaunchEmail(displayName: string, joinUrl: string): EmailTemplate {
  const subject = `${displayName} is live on QWIKKER 🎉`
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-size:26px;margin:0 0 12px">${displayName} is live 🎉</h1>
      <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 16px">
        You asked us to let you know — and we're ready. QWIKKER ${displayName} is now live with
        exclusive local offers, loyalty rewards and secret menus, straight to your phone wallet. No app to download.
      </p>
      <p style="margin:24px 0">
        <a href="${joinUrl}" style="display:inline-block;background:#00d083;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:14px;font-size:16px">
          Get your free pass
        </a>
      </p>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px">You're receiving this because you joined the ${displayName} waitlist.</p>
    </div>`
  const text = `${displayName} is live on QWIKKER!\n\nYou asked us to let you know — QWIKKER ${displayName} is now live with exclusive local offers, loyalty rewards and secret menus, straight to your phone wallet.\n\nGet your free pass: ${joinUrl}\n\nYou're receiving this because you joined the ${displayName} waitlist.`
  return { subject, html, text }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(request: NextRequest) {
  const auth = await authCity(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { city } = auth

  const supabase = createAdminClient()
  const url = new URL(request.url)

  // Render the launch email exactly as recipients will receive it (for the
  // confirm-before-send modal).
  if (url.searchParams.get('preview') === 'email') {
    const { data: cfgRow } = await supabase
      .from('franchise_crm_configs')
      .select('display_name')
      .eq('city', city)
      .single()
    const displayName = cfgRow?.display_name || city.charAt(0).toUpperCase() + city.slice(1)
    const template = buildLaunchEmail(displayName, `${getFranchisePublicUrl(city)}/join`)
    const { count: pending } = await supabase
      .from('city_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('city', city)
      .is('notified_at', null)
    return NextResponse.json({ success: true, subject: template.subject, html: template.html, pending: pending || 0 })
  }

  // CSV export of the city's waitlist.
  if (url.searchParams.get('export') === 'csv') {
    const { data, error } = await supabase
      .from('city_waitlist')
      .select('email, created_at, notified_at')
      .eq('city', city)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = [['email', 'joined', 'notified'], ...(data || []).map(r => [r.email, r.created_at, r.notified_at || ''])]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${city}-waitlist.csv"`,
      },
    })
  }

  const [{ count: total }, { count: pending }] = await Promise.all([
    supabase.from('city_waitlist').select('id', { count: 'exact', head: true }).eq('city', city),
    supabase.from('city_waitlist').select('id', { count: 'exact', head: true }).eq('city', city).is('notified_at', null),
  ])

  return NextResponse.json({
    success: true,
    total: total || 0,
    pending: pending || 0,
    notified: (total || 0) - (pending || 0),
  })
}

export async function POST(request: NextRequest) {
  const auth = await authCity(request)
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { city } = auth

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  if (body.action !== 'notify') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Confirm the city is actually live before emailing people to come install.
  const { data: cfgRow } = await supabase
    .from('franchise_crm_configs')
    .select('display_name, status, landing_page_config')
    .eq('city', city)
    .single()

  const cfg = (cfgRow?.landing_page_config as { publish_status?: string } | null) || {}
  const publiclyLive = cfg.publish_status === 'live' || (cfg.publish_status !== 'coming_soon' && cfgRow?.status === 'active')
  if (!publiclyLive) {
    return NextResponse.json({ error: 'Go live before notifying your waitlist.' }, { status: 400 })
  }

  const displayName = cfgRow?.display_name || city.charAt(0).toUpperCase() + city.slice(1)
  const joinUrl = `${getFranchisePublicUrl(city)}/join`
  const template = buildLaunchEmail(displayName, joinUrl)

  // Only people who haven't been emailed yet.
  const { data: pendingRows, error: fetchErr } = await supabase
    .from('city_waitlist')
    .select('id, email')
    .eq('city', city)
    .is('notified_at', null)
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ success: true, sent: 0, failed: 0, remaining: 0 })
  }

  let sent = 0
  let failed = 0
  const supportEmail = getFranchiseSupportEmail(city)

  for (const group of chunk(pendingRows, BCC_CHUNK)) {
    const res = await sendFranchiseEmail({
      city,
      to: supportEmail,
      bcc: group.map(g => g.email),
      template,
      tags: [{ name: 'type', value: 'waitlist_launch' }],
    })

    if (res.success) {
      const ids = group.map(g => g.id)
      await supabase.from('city_waitlist').update({ notified_at: new Date().toISOString() }).in('id', ids)
      sent += group.length
    } else {
      failed += group.length
    }
  }

  return NextResponse.json({ success: failed === 0, sent, failed, remaining: failed })
}
