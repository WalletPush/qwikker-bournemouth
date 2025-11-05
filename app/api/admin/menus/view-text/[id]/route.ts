import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    // Get the menu info
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('menu_name, business_id')
      .eq('id', params.id)
      .single()
    
    if (menuError || !menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    }
    
    // Find the corresponding knowledge base entry
    const { data: knowledgeEntry, error: kbError } = await supabase
      .from('knowledge_base')
      .select('title, content')
      .eq('business_id', menu.business_id)
      .ilike('title', `%${menu.menu_name}%`)
      .single()
    
    if (kbError || !knowledgeEntry) {
      return NextResponse.json({ 
        error: 'Menu content not found in knowledge base',
        menu_name: menu.menu_name 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      menu_name: menu.menu_name,
      content: knowledgeEntry.content,
      title: knowledgeEntry.title
    })
    
  } catch (error) {
    console.error('Error fetching menu content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
