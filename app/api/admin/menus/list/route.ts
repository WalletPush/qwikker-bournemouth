import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get franchise city for admin isolation
    const city = await getFranchiseCityFromRequest()
    
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const businessId = searchParams.get('businessId')

    let query = supabase
      .from('menus')
      .select(`
        *,
        business_profiles!inner(
          id,
          business_name,
          business_town,
          city,
          user_id,
          email,
          phone
        )
      `)
      .eq('business_profiles.city', city)
      .order('created_at', { ascending: false })

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // Filter by business if provided
    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data: menus, error: menusError } = await query

    if (menusError) {
      console.error('Error fetching admin menus:', menusError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch menus'
      }, { status: 500 })
    }

    // Group menus by status for admin dashboard
    const menusByStatus = {
      pending: menus?.filter(m => m.status === 'pending') || [],
      approved: menus?.filter(m => m.status === 'approved') || [],
      rejected: menus?.filter(m => m.status === 'rejected') || [],
      needs_revision: menus?.filter(m => m.status === 'needs_revision') || []
    }

    return NextResponse.json({
      success: true,
      data: {
        menus: menus || [],
        menusByStatus,
        totalCount: menus?.length || 0,
        pendingCount: menusByStatus.pending.length
      }
    })

  } catch (error) {
    console.error('Admin menu list error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
