import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { businessId, days } = await request.json()
    
    if (!businessId || !days) {
      return NextResponse.json(
        { error: 'Missing businessId or days' },
        { status: 400 }
      )
    }
    
    // Get admin ID from session cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')
    
    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated as admin' },
        { status: 401 }
      )
    }
    
    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      )
    }
    
    // Validate days is a number
    const additionalDays = parseInt(days)
    if (isNaN(additionalDays) || additionalDays <= 0) {
      return NextResponse.json(
        { error: 'Days must be a positive number' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Call the extend function with admin ID
    const { data, error } = await supabase.rpc('extend_business_trial', {
      p_business_id: businessId,
      p_additional_days: additionalDays,
      p_admin_id: adminSession.adminId
    })
    
    if (error) {
      console.error('Error extending trial:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from function' },
        { status: 500 }
      )
    }
    
    const result = data[0]
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      newEndDate: result.new_end_date
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extend trial' },
      { status: 500 }
    )
  }
}

