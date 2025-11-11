import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Check all events
    const { data: allEvents, error: allError } = await supabase
      .from('business_events')
      .select('id, event_name, status, event_date, business_id')
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Check approved events for bournemouth
    const { data: approvedEvents, error: approvedError } = await supabase
      .from('business_events')
      .select(`
        id,
        event_name,
        event_description,
        status,
        event_date,
        business_id,
        business_profiles!inner(business_name, city)
      `)
      .eq('status', 'approved')
      .eq('business_profiles.city', 'bournemouth')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
    
    return NextResponse.json({
      allEvents: {
        count: allEvents?.length || 0,
        data: allEvents,
        error: allError
      },
      approvedBournemouthEvents: {
        count: approvedEvents?.length || 0,
        data: approvedEvents,
        error: approvedError
      },
      today: new Date().toISOString().split('T')[0]
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

