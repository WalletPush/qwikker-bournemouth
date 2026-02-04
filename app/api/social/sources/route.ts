/**
 * SOCIAL WIZARD — FETCH AVAILABLE SOURCES
 * GET /api/social/sources
 * 
 * Returns selectable offers, events, menu items, and secret menu for AI generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const business_id = searchParams.get('business_id')

    if (!business_id) {
      return NextResponse.json({ error: 'business_id required' }, { status: 400 })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('business_user_roles')
      .select('role')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch active offers
    const { data: offers } = await supabase
      .from('business_offers')
      .select('id, offer_name, offer_description')
      .eq('business_id', business_id)
      .eq('status', 'approved')
      .gte('offer_end_date', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch upcoming events
    const { data: events } = await supabase
      .from('business_events')
      .select('id, event_name, event_description')
      .eq('business_id', business_id)
      .eq('status', 'approved')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10)

    // Fetch menu highlights from knowledge base
    const { data: menuKb } = await supabase
      .from('knowledge_base')
      .select('id, title, content, metadata')
      .eq('business_id', business_id)
      .limit(50)

    // Helper function to detect if item is secret menu
    const isSecretMenuItem = (item: any): boolean => {
      const title = item.title?.toLowerCase() || ''
      const content = item.content?.toLowerCase() || ''
      const metadataType = item.metadata?.type?.toLowerCase() || ''
      
      // Check metadata flags first
      if (item.metadata?.is_secret === true || item.metadata?.secret === true) {
        return true
      }
      
      // Check for "secret menu" pattern in title or content (like chat does)
      if (
        title.includes('secret menu') ||
        title.includes('secret item') ||
        content.includes('secret menu') ||
        metadataType.includes('secret')
      ) {
        return true
      }
      
      return false
    }

    // Extract menu items (NOT secret)
    const menuItems = menuKb?.map(item => ({
      id: item.id,
      name: item.metadata?.name || item.title?.replace(/.*?-\s*/, '') || 'Menu Item',
      description: item.metadata?.description || item.content?.slice(0, 100)
    })).filter(item => !isSecretMenuItem(menuKb.find(kb => kb.id === item.id)!))
      .slice(0, 10) || []

    // Fetch secret menu items (uses same detection as chat system)
    const secretMenuItems = menuKb?.filter(isSecretMenuItem).map(item => {
      // Extract clean name from title (remove "Business - Secret Menu: " prefix)
      let name = item.metadata?.name || item.title || 'Secret Item'
      name = name.replace(/.*?-\s*Secret Menu:\s*/i, '')
      name = name.replace(/.*?-\s*/i, '')
      
      return {
        id: item.id,
        name: name,
        description: item.metadata?.description || item.content?.slice(0, 100)
      }
    }).slice(0, 10) || []

    return NextResponse.json({
      success: true,
      sources: {
        offers: offers?.map(o => ({ id: o.id, name: o.offer_name, description: o.offer_description })) || [],
        events: events?.map(e => ({ id: e.id, name: e.event_name, description: e.event_description })) || [],
        menuItems: menuItems,
        secretMenuItems: secretMenuItems
      }
    })

  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sources' 
    }, { status: 500 })
  }
}
