import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    const { businessIds } = await request.json()
    
    if (!businessIds || !Array.isArray(businessIds) || businessIds.length === 0) {
      return NextResponse.json(
        { error: 'Business IDs array required', success: false },
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

    // Get all businesses with these IDs
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('id, city, status, auto_imported')
      .in('id', businessIds)

    if (fetchError) {
      console.error('Error fetching businesses:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch businesses', success: false },
        { status: 500 }
      )
    }

    // Validate all businesses belong to admin's city and are unclaimed
    const invalidBusinesses: string[] = []
    const validBusinessIds: string[] = []
    const errors: string[] = []

    for (const business of businesses || []) {
      if (business.city !== requestCity) {
        invalidBusinesses.push(business.id)
        errors.push(`Business ${business.id} is not in ${requestCity}`)
      } else if (business.status !== 'unclaimed') {
        invalidBusinesses.push(business.id)
        errors.push(`Business ${business.id} is not unclaimed (status: ${business.status})`)
      } else {
        validBusinessIds.push(business.id)
      }
    }

    // Check for businesses that don't exist
    const notFoundIds = businessIds.filter(
      id => !businesses?.some(b => b.id === id)
    )
    if (notFoundIds.length > 0) {
      notFoundIds.forEach(id => {
        invalidBusinesses.push(id)
        errors.push(`Business ${id} not found`)
      })
    }

    // Update valid businesses
    let updatedCount = 0
    if (validBusinessIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('business_profiles')
        .update({
          admin_chat_fallback_approved: true,
          updated_at: new Date().toISOString()
        })
        .in('id', validBusinessIds)

      if (updateError) {
        console.error('Error updating businesses:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to update businesses', 
            success: false,
            details: updateError.message 
          },
          { status: 500 }
        )
      }

      updatedCount = validBusinessIds.length
      
      // ✅ CRITICAL: Revalidate the admin page cache so data refreshes immediately
      revalidatePath('/admin')
      console.log('🔄 Revalidated /admin page cache')
    }

    const skippedCount = invalidBusinesses.length

    console.log(`✅ Bulk AI eligible update: ${updatedCount} updated, ${skippedCount} skipped`)

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error in bulk-ai-eligible:', error)
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
