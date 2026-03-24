import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const auth = await requireHQAdmin()
  if (!auth.ok) return auth.response

  try {
    const { adminId } = await request.json()

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: targetAdmin, error } = await supabase
      .from('city_admins')
      .select('id, city, username, full_name, is_active')
      .eq('id', adminId)
      .single()

    if (error || !targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    if (!targetAdmin.is_active) {
      return NextResponse.json({ error: 'Target admin is inactive' }, { status: 403 })
    }

    const sessionData = {
      adminId: targetAdmin.id,
      city: targetAdmin.city,
      username: targetAdmin.username,
      loginTime: new Date().toISOString(),
      hq_impersonating: true,
      hq_user_email: auth.hqAdmin.email,
    }

    console.log(`🔑 HQ impersonation: ${auth.hqAdmin.email} → ${targetAdmin.username} (${targetAdmin.city})`)

    const isLocal = request.headers.get('host')?.includes('localhost') || request.headers.get('host')?.includes('127.0.0.1')
    const redirectUrl = isLocal
      ? 'http://localhost:3000/admin'
      : `https://${targetAdmin.city}.qwikker.com/admin`

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      admin: {
        username: targetAdmin.username,
        city: targetAdmin.city,
        full_name: targetAdmin.full_name,
      },
    })

    const cookieOptions: Parameters<typeof response.cookies.set>[2] = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 2,
      path: '/',
    }

    // On production, set domain to .qwikker.com so the cookie is shared across subdomains
    // (HQ is on a different subdomain than the franchise admin dashboard)
    if (!isLocal) {
      cookieOptions.domain = '.qwikker.com'
    }

    response.cookies.set('qwikker_admin_session', JSON.stringify(sessionData), cookieOptions)

    return response
  } catch (err) {
    console.error('Impersonate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
