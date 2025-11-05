import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to view menus' },
        { status: 401 }
      )
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

    // Fetch all menus for this business
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('*')
      .eq('business_id', businessProfile.id)
      .order('created_at', { ascending: false })

    if (menusError) {
      console.error('Error fetching menus:', menusError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch menus'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: menus || []
    })

  } catch (error) {
    console.error('Menu list error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
