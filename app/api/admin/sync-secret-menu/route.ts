import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncSecretMenuItemToKnowledgeBase } from '@/lib/ai/embeddings'

/**
 * Manually sync approved secret menu items to knowledge base
 * Useful for fixing missing items after a bug fix
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get all approved secret menu items
    const { data: secretMenuItems, error } = await supabase
      .from('business_changes')
      .select('id, business_id, change_data, business:business_profiles(business_name)')
      .eq('change_type', 'secret_menu')
      .eq('status', 'approved')
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }
    
    const results = []
    
    // Sync each item
    for (const item of secretMenuItems || []) {
      const syncResult = await syncSecretMenuItemToKnowledgeBase(item.id)
      results.push({
        id: item.id,
        business: item.business?.business_name,
        item_name: item.change_data.itemName,
        ...syncResult
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} secret menu items`,
      results
    })
    
  } catch (error: any) {
    console.error('Error syncing secret menu items:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

