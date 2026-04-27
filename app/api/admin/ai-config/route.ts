import { NextResponse } from 'next/server'
import { getAdminFromSession } from '@/lib/utils/admin-session'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const admin = await getAdminFromSession()
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const city = admin.city
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
