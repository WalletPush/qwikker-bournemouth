import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    const { changeId, action } = await request.json()
    
    if (!changeId || !action) {
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
        { error: 'Admin authentication required' },
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
    
    const supabaseAdmin = createAdminClient()
    
    // Get the change record
    const { data: change, error: changeError } = await supabaseAdmin
      .from('business_changes')
      .select(`
        *,
        business:business_id (
          id,
          business_name,
          city,
          offer_name,
          offer_type,
          offer_value,
          offer_terms,
          offer_start_date,
          offer_end_date,
          offer_image
        )
      `)
      .eq('id', changeId)
      .single()
    
    if (changeError || !change) {
      return NextResponse.json(
        { error: 'Change record not found' },
        { status: 404 }
      )
    }
    
    // Verify the change belongs to the admin's city
    if (change.business?.city !== requestCity) {
      return NextResponse.json(
        { error: 'Unauthorized access to this change' },
        { status: 403 }
      )
    }
    
    if (action === 'approve') {
      // Apply the change to the business profile
      let updateData = {}
      
      if (change.change_type === 'offer') {
        updateData = {
          offer_name: change.change_data.offer_name,
          offer_type: change.change_data.offer_type,
          offer_value: change.change_data.offer_value,
          offer_claim_amount: change.change_data.offer_claim_amount,
          offer_terms: change.change_data.offer_terms,
          offer_start_date: change.change_data.offer_start_date,
          offer_end_date: change.change_data.offer_end_date,
          offer_image: change.change_data.offer_image
        }
      } else if (change.change_type === 'secret_menu') {
        // For secret menu, we need to append to existing additional_notes
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles')
          .select('additional_notes')
          .eq('id', change.business_id)
          .single()
        
        let existingNotes = {}
        if (currentProfile?.additional_notes) {
          try {
            existingNotes = JSON.parse(currentProfile.additional_notes)
          } catch (e) {
            existingNotes = {}
          }
        }
        
        const secretMenuItems = existingNotes.secret_menu_items || []
        secretMenuItems.push(change.change_data)
        
        updateData = {
          additional_notes: JSON.stringify({
            ...existingNotes,
            secret_menu_items: secretMenuItems
          })
        }
      }
      
      // Update the business profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', change.business_id)
      
      if (updateError) {
        console.error('Error updating business profile:', updateError)
        return NextResponse.json(
          { error: 'Failed to apply changes to business profile' },
          { status: 500 }
        )
      }
      
      // Mark the change as approved
      const { error: approveError } = await supabaseAdmin
        .from('business_changes')
        .update({
          status: 'approved',
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', changeId)
      
      if (approveError) {
        console.error('Error marking change as approved:', approveError)
        return NextResponse.json(
          { error: 'Failed to mark change as approved' },
          { status: 500 }
        )
      }
      
      console.log(`✅ Change ${changeId} approved by ${admin.username} - ${change.change_type} for ${change.business?.business_name}`)
      
    } else if (action === 'reject') {
      // Mark the change as rejected
      const { error: rejectError } = await supabaseAdmin
        .from('business_changes')
        .update({
          status: 'rejected',
          reviewed_by: admin.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', changeId)
      
      if (rejectError) {
        console.error('Error marking change as rejected:', rejectError)
        return NextResponse.json(
          { error: 'Failed to mark change as rejected' },
          { status: 500 }
        )
      }
      
      console.log(`❌ Change ${changeId} rejected by ${admin.username} - ${change.change_type} for ${change.business?.business_name}`)
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Change ${action}d successfully`
    })
    
  } catch (error) {
    console.error('Admin approve-change API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
