import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to delete menus' },
        { status: 401 }
      )
    }

    const { menuId } = await request.json()

    if (!menuId) {
      return NextResponse.json({
        success: false,
        error: 'Menu ID is required'
      }, { status: 400 })
    }

    // Get business profile
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !businessProfile) {
      return NextResponse.json({
        success: false,
        error: 'Business profile not found'
      }, { status: 404 })
    }

    // Check if menu exists and belongs to this business
    const { data: menu, error: menuError } = await supabase
      .from('menus')
      .select('id, status, menu_name')
      .eq('id', menuId)
      .eq('business_id', businessProfile.id)
      .single()

    if (menuError || !menu) {
      return NextResponse.json({
        success: false,
        error: 'Menu not found or you do not have permission to delete it'
      }, { status: 404 })
    }

    // Only allow deletion of pending menus
    if (menu.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: 'Only pending menus can be deleted. Contact admin to remove approved menus.'
      }, { status: 403 })
    }

    // If menu was approved, remove from knowledge base first
    if (menu.status === 'approved') {
      try {
        // Get the city for knowledge base cleanup
        const { data: profile, error: profileError } = await supabase
          .from('business_profiles')
          .select('city')
          .eq('id', businessProfile.id)
          .single()

        if (profile?.city) {
          const { removeMenuFromKnowledgeBase } = await import('@/lib/ai/menu-knowledge')
          
          const result = await removeMenuFromKnowledgeBase(menuId, profile.city)
          if (result.success) {
            console.log(`✅ Removed deleted menu from knowledge base: ${result.message}`)
          } else {
            console.error(`❌ Failed to remove menu from knowledge base: ${result.error}`)
          }
        }
      } catch (error) {
        console.error('❌ Error removing menu from knowledge base:', error)
        // Continue with deletion even if knowledge base cleanup fails
      }
    }

    // Delete the menu from database
    const { error: deleteError } = await supabase
      .from('menus')
      .delete()
      .eq('id', menuId)
      .eq('business_id', businessProfile.id)

    if (deleteError) {
      console.error('Error deleting menu:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete menu'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Menu "${menu.menu_name}" has been deleted successfully`
    })

  } catch (error) {
    console.error('Menu delete error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
