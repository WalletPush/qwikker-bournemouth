import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    const { businessId, action } = await request.json()
    
    if (!businessId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get admin session from cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Verify admin exists and get city from request
    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = getCityFromHostname(hostname)
    
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Update business status using admin client
    const supabaseAdmin = createAdminClient()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        status: newStatus,
        approved_by: admin.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', businessId)
      .eq('city', requestCity) // Only allow approving businesses in admin's city
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to update business status' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Business ${data.business_name} ${action}d by ${admin.username} in ${requestCity}`)
    
    return NextResponse.json({
      success: true,
      business: data,
      message: `Business ${action}d successfully`
    })
    
  } catch (error) {
    console.error('Admin approval API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
