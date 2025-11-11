import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    const city = 'bournemouth'
    
    console.log('Testing event fetch...')
    
    const { data: events, error } = await supabase
      .from('business_events')
      .select(`
        id,
        event_name,
        event_description,
        event_type,
        event_date,
        event_start_time,
        event_end_time,
        custom_location_name,
        booking_url,
        event_image,
        business_id,
        business_profiles!inner(business_name, city)
      `)
      .eq('status', 'approved')
      .eq('business_profiles.city', city)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(10)
    
    console.log('Query result:', events?.length, 'events')
    
    let eventCards = []
    
    if (!error && events && events.length > 0) {
      eventCards = events.map(event => ({
        id: event.id,
        title: event.event_name?.trim() || 'Untitled Event',
        description: event.event_description || 'No description',
        event_type: event.event_type || 'Other',
        start_date: event.event_date,
        start_time: event.event_start_time || null,
        end_date: null,
        end_time: event.event_end_time || null,
        location: event.custom_location_name || event.business_profiles?.business_name || 'TBA',
        ticket_url: event.booking_url || null,
        image_url: event.event_image || null,
        business_name: event.business_profiles?.business_name || 'Unknown Business',
        business_id: event.business_id
      }))
    }
    
    return NextResponse.json({
      success: true,
      rawEventsCount: events?.length || 0,
      rawEvents: events,
      mappedEventCardsCount: eventCards.length,
      eventCards,
      error,
      query: {
        city,
        today: new Date().toISOString().split('T')[0]
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

