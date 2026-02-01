import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'

export async function DELETE(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({
        success: false,
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid admin session'
      }, { status: 401 })
    }

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 🔒 SECURITY: Get business to verify city access
    const { data: business, error: fetchError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // 🔒 SECURITY: Verify admin has access to this city
    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !(await isAdminForCity(adminSession.adminId, business.city))) {
      return NextResponse.json({
        success: false,
        error: `You don't have admin access to ${business.city}`
      }, { status: 403 })
    }

    console.log(`🗑️ Admin ${admin.email} deleting business: ${business.business_name} (${businessId})`)

    // 🗑️ DELETE CASCADE: Delete all related data
    // Note: Some deletions may be handled by database CASCADE constraints
    // But we'll explicitly delete to ensure cleanup

    // 1. Delete offers
    const { error: offersError } = await supabase
      .from('offers')
      .delete()
      .eq('business_id', businessId)

    if (offersError) {
      console.error('Error deleting offers:', offersError)
    }

    // 2. Delete menus
    const { error: menusError } = await supabase
      .from('menus')
      .delete()
      .eq('business_id', businessId)

    if (menusError) {
      console.error('Error deleting menus:', menusError)
    }

    // 3. Delete subscription records
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('business_id', businessId)

    if (subsError) {
      console.error('Error deleting subscriptions:', subsError)
    }

    // 4. Delete claim requests
    const { error: claimsError } = await supabase
      .from('claim_requests')
      .delete()
      .eq('business_id', businessId)

    if (claimsError) {
      console.error('Error deleting claim requests:', claimsError)
    }

    // 5. Delete user_offer_claims (if any)
    const { error: userClaimsError } = await supabase
      .from('user_offer_claims')
      .delete()
      .eq('offer_id', supabase
        .from('offers')
        .select('id')
        .eq('business_id', businessId)
      )

    if (userClaimsError) {
      console.error('Error deleting user offer claims:', userClaimsError)
    }

    // 6. Finally, delete the business profile
    const { error: deleteError } = await supabase
      .from('business_profiles')
      .delete()
      .eq('id', businessId)

    if (deleteError) {
      console.error('Error deleting business profile:', deleteError)
      return NextResponse.json({
        success: false,
        error: `Failed to delete business: ${deleteError.message}`
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted business: ${business.business_name}`)

    return NextResponse.json({
      success: true,
      message: `Business "${business.business_name}" has been permanently deleted`
    })

  } catch (error: any) {
    console.error('Delete business error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete business'
    }, { status: 500 })
  }
}
