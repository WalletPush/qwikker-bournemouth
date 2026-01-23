import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Admin-only route to manually trigger archiving of expired KB entries
 * This runs the same logic as the daily cron job
 */
export async function POST() {
  try {
    const supabase = createServiceRoleClient()

    // Call the archive_expired_kb_entries() function
    const { data, error } = await supabase.rpc('archive_expired_kb_entries')

    if (error) {
      console.error('❌ Error running archive_expired_kb_entries:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Archive cron executed successfully:`, data)

    // Format results for display
    const results = {
      success: true,
      data,
      summary: {
        totalArchived: data?.reduce((sum: number, row: any) => sum + (row.archived_count || 0), 0) || 0,
        offerCount: data?.find((r: any) => r.archived_type === 'offers')?.archived_count || 0,
        eventCount: data?.find((r: any) => r.archived_type === 'events')?.archived_count || 0,
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('❌ Error in archive-expired-kb route:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check for expired KB entries without archiving them
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Check for expired offers still active in KB
    const { data: expiredOffers } = await supabase
      .from('knowledge_base')
      .select('id, title, status, metadata, created_at')
      .eq('status', 'active')
      .eq('knowledge_type', 'custom_knowledge')
      .filter('metadata->>type', 'eq', 'offer')
      .not('metadata->>offer_id', 'is', null)
      .not('metadata->>offer_end_date', 'is', null)
      .limit(50)

    // Check for expired events still active in KB
    const { data: expiredEvents } = await supabase
      .from('knowledge_base')
      .select('id, title, status, metadata, created_at')
      .eq('status', 'active')
      .eq('knowledge_type', 'event')
      .not('metadata->>event_id', 'is', null)
      .not('metadata->>event_date', 'is', null)
      .limit(50)

    // Filter by date on client side (safer than casting in query)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expiredOffersFiltered = (expiredOffers || []).filter(offer => {
      const endDate = new Date(offer.metadata?.offer_end_date)
      return endDate < today
    })

    const expiredEventsFiltered = (expiredEvents || []).filter(event => {
      const eventDate = new Date(event.metadata?.event_date)
      return eventDate < today
    })

    // Check for "Current Offers" contamination (offer_id = null)
    const { data: contaminationRows } = await supabase
      .from('knowledge_base')
      .select('id, title, status, metadata, created_at')
      .eq('status', 'active')
      .eq('knowledge_type', 'custom_knowledge')
      .filter('metadata->>type', 'eq', 'offer')
      .is('metadata->>offer_id', null)
      .limit(20)

    return NextResponse.json({
      success: true,
      expiredOffers: expiredOffersFiltered.map(o => ({
        id: o.id,
        title: o.title,
        offer_name: o.metadata?.offer_name,
        offer_end_date: o.metadata?.offer_end_date,
        created_at: o.created_at
      })),
      expiredEvents: expiredEventsFiltered.map(e => ({
        id: e.id,
        title: e.title,
        event_name: e.metadata?.event_name,
        event_date: e.metadata?.event_date,
        created_at: e.created_at
      })),
      contaminationRows: (contaminationRows || []).map(c => ({
        id: c.id,
        title: c.title,
        metadata: c.metadata,
        created_at: c.created_at
      })),
      summary: {
        expiredOffersCount: expiredOffersFiltered.length,
        expiredEventsCount: expiredEventsFiltered.length,
        contaminationCount: contaminationRows?.length || 0,
        totalNeedingArchive: expiredOffersFiltered.length + expiredEventsFiltered.length + (contaminationRows?.length || 0)
      }
    })
  } catch (error: any) {
    console.error('❌ Error checking expired KB entries:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
