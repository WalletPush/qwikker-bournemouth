import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getSystemCategoryFromDisplayLabel } from '@/lib/constants/system-categories'

export async function POST(request: NextRequest) {
  try {
    const { businessId, category } = await request.json()
    
    if (!businessId || !category) {
      return NextResponse.json(
        { error: 'Business ID and category required', success: false },
        { status: 400 }
      )
    }
    
    // Get admin session from cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Admin authentication required', success: false },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session', success: false },
        { status: 401 }
      )
    }

    // Verify admin exists and get city from request
    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)
    
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', success: false },
        { status: 403 }
      )
    }

    const supabaseAdmin = createAdminClient()

    // Get business and verify it belongs to admin's city
    const { data: business, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      console.error('Error fetching business:', fetchError)
      return NextResponse.json(
        { error: 'Business not found', success: false },
        { status: 404 }
      )
    }

    if (business.city !== requestCity) {
      return NextResponse.json(
        { error: 'Business not in your city', success: false },
        { status: 403 }
      )
    }

    // Derive the canonical system_category from the admin-entered label using the
    // single source of truth (handles all verticals incl. rental/automotive/health/
    // tours/grocery, and safely falls back to 'other').
    const systemCategory = getSystemCategoryFromDisplayLabel(category)
    const businessType = systemCategory
    
    // Update ALL category-related fields so changes appear everywhere
    const { error: updateError } = await supabaseAdmin
      .from('business_profiles')
      .update({
        business_category: category,
        display_category: category,
        system_category: systemCategory,
        business_type: businessType,
        google_primary_type: category.toLowerCase().replace(/ /g, '_'), // Convert to snake_case for consistency
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating category:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update category', 
          success: false,
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Category updated for business ${businessId}: ${category} (system_category: ${systemCategory})`)

    // Revalidate admin page AND discover page so changes appear everywhere
    revalidatePath('/admin')
    revalidatePath('/user/discover')

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully'
    })

  } catch (error) {
    console.error('Error in update-category:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
