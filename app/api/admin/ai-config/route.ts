import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    if (!adminSessionCookie?.value) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const admin = await getAdminById(adminSessionCookie.value)
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin session' }, { status: 401 })
    }

    const city = getCityFromHostname(request.headers.get('host') || '')
    if (!city || !isAdminForCity(admin, city)) {
      return NextResponse.json({ error: 'Not authorized for this city' }, { status: 403 })
    }

    const supabase = createAdminClient()
    const { data: config } = await supabase
      .from('franchise_crm_configs')
      .select('openai_api_key, anthropic_api_key')
      .eq('city', city.toLowerCase())
      .single()

    return NextResponse.json({
      openai_key_set: !!(config?.openai_api_key && config.openai_api_key.length > 10),
      anthropic_key_set: !!(config?.anthropic_api_key && config.anthropic_api_key.length > 10),
    })
  } catch (error) {
    console.error('AI config API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
