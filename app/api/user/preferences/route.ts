import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletPassId = searchParams.get('walletPassId')

  if (!walletPassId) {
    return NextResponse.json({ error: 'Missing walletPassId' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('app_users')
    .select('preferred_categories, dietary_restrictions, preferred_radius_miles')
    .eq('wallet_pass_id', walletPassId)
    .single()

  if (error) {
    return NextResponse.json({ preferred_categories: [], dietary_restrictions: [], preferred_radius_miles: 3 })
  }

  return NextResponse.json({
    preferred_categories: data.preferred_categories || [],
    dietary_restrictions: data.dietary_restrictions || [],
    preferred_radius_miles: data.preferred_radius_miles || 3,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { walletPassId, preferred_categories, preferred_radius_miles, dietary_restrictions } = body

  if (!walletPassId) {
    return NextResponse.json({ error: 'Missing walletPassId' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (preferred_categories !== undefined) updateData.preferred_categories = preferred_categories
  if (preferred_radius_miles !== undefined) updateData.preferred_radius_miles = preferred_radius_miles
  if (dietary_restrictions !== undefined) updateData.dietary_restrictions = dietary_restrictions

  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('app_users')
    .update(updateData)
    .eq('wallet_pass_id', walletPassId)

  if (error) {
    console.error('[preferences] Error saving:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
