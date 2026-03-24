import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { businessId, eventType, walletPassId } = await request.json()

    if (!businessId || !eventType) {
      return NextResponse.json({ error: 'Missing businessId or eventType' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('user_business_visits')
      .insert({
        business_id: businessId,
        event_type: eventType,
        wallet_pass_id: walletPassId || null,
        visit_date: new Date().toISOString(),
        is_first_visit: false,
        points_earned: 0,
      })

    if (error) {
      console.error('❌ Error tracking click event:', error)
      return NextResponse.json({ error: 'Failed to track event' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Track click API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
