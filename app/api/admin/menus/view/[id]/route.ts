import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient()
    
    // Fetch the menu URL - admin can access all menus
    const { data: menu, error } = await supabase
      .from('menus')
      .select('menu_url, menu_name')
      .eq('id', params.id)
      .single()
    
    if (error || !menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    }
    
    // Convert raw upload URL to proper Cloudinary URL for viewing
    let viewableUrl = menu.menu_url
    if (menu.menu_url && menu.menu_url.includes('/raw/upload/')) {
      // Convert from /raw/upload/ to /image/upload/ for better browser compatibility
      viewableUrl = menu.menu_url.replace('/raw/upload/', '/image/upload/')
    }
    
    return NextResponse.json({ 
      menu_url: viewableUrl,
      original_url: menu.menu_url,
      menu_name: menu.menu_name
    })
    
  } catch (error) {
    console.error('Error fetching menu URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
