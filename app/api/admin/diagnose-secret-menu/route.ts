import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Diagnostic route to compare secret menu data across three sources:
 * 1. business_profiles.additional_notes JSON (source of truth for dashboards)
 * 2. knowledge_base table (for AI chat only)
 * 3. localStorage (client-side, not server-accessible)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const businessName = searchParams.get('business') || 'Ember and Oak Bistro'

  const supabase = createServiceRoleClient()

  try {
    // 1. Get the business profile with JSON secret menu items
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id, business_name, additional_notes, city')
      .ilike('business_name', `%${businessName}%`)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        error: 'Business not found',
        searchedFor: businessName
      }, { status: 404 })
    }

    // Parse JSON secret menu items
    let jsonItems: any[] = []
    if (profile.additional_notes) {
      try {
        const notes = JSON.parse(profile.additional_notes)
        jsonItems = notes.secret_menu_items || []
      } catch (e) {
        console.error('Failed to parse additional_notes JSON:', e)
      }
    }

    // 2. Get KB entries for this business (both active and archived)
    const { data: kbItems, error: kbError } = await supabase
      .from('knowledge_base')
      .select('id, title, status, metadata, created_at, updated_at')
      .eq('business_id', profile.id)
      .eq('knowledge_type', 'custom_knowledge')
      .eq('metadata->>type', 'secret_menu')
      .order('created_at', { ascending: false })

    if (kbError) {
      console.error('KB query error:', kbError)
    }

    // 3. Compare the data
    const comparison = {
      business: {
        id: profile.id,
        name: profile.business_name,
        city: profile.city
      },
      jsonItems: {
        count: jsonItems.length,
        items: jsonItems.map((item: any) => ({
          name: item.itemName,
          created_at: item.created_at,
          description: item.description?.substring(0, 50) + '...',
          price: item.price
        }))
      },
      kbItems: {
        total: kbItems?.length || 0,
        active: kbItems?.filter(kb => kb.status === 'active').length || 0,
        archived: kbItems?.filter(kb => kb.status === 'archived').length || 0,
        items: kbItems?.map(kb => ({
          kb_id: kb.id,
          title: kb.title,
          status: kb.status,
          item_name: kb.metadata?.item_name,
          item_created_at: kb.metadata?.item_created_at,
          last_updated: kb.updated_at
        }))
      },
      analysis: {
        jsonVsKbMismatch: jsonItems.length !== (kbItems?.filter(kb => kb.status === 'active').length || 0),
        recommendation: ''
      }
    }

    // Generate recommendation
    if (comparison.analysis.jsonVsKbMismatch) {
      comparison.analysis.recommendation = 
        `⚠️ MISMATCH DETECTED:\n` +
        `- Dashboard shows ${jsonItems.length} items (from JSON)\n` +
        `- KB has ${comparison.kbItems.active} active items\n` +
        `- KB has ${comparison.kbItems.archived} archived items\n\n` +
        `This is NORMAL if items were recently deleted. The KB should be archived when items are deleted from the dashboard.`
    } else {
      comparison.analysis.recommendation = '✅ JSON and KB are in sync'
    }

    // Check for orphaned KB entries (KB items without matching JSON entries)
    const orphanedKbItems = kbItems?.filter(kb => {
      const itemCreatedAt = kb.metadata?.item_created_at
      return !jsonItems.some((jsonItem: any) => jsonItem.created_at === itemCreatedAt)
    }) || []

    if (orphanedKbItems.length > 0) {
      comparison.analysis.recommendation += `\n\n⚠️ Found ${orphanedKbItems.length} orphaned KB entries (exist in KB but not in JSON). These should be archived.`
    }

    return NextResponse.json(comparison, { status: 200 })

  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
