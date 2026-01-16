import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { canApprove } from '@/lib/utils/verification-utils'

export async function POST(request: NextRequest) {
  try {
    const { businessId, action, adminEmail, manualOverride } = await request.json()
    
    if (!businessId || !action || !adminEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    
    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user is admin - must be specific admin emails only
    const adminEmails = [
      'admin@qwikker.com',
      'admin@walletpush.io'
    ]
    
    const isAdmin = user.email && adminEmails.includes(user.email)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // If approving, fetch profile and enforce verification gates
    if (action === 'approve') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('business_profiles')
        .select('id, business_name, verification_method, google_place_id, rating, manual_override')
        .eq('id', businessId)
        .single()
      
      if (profileError || !profile) {
        return NextResponse.json(
          { error: 'Business profile not found' },
          { status: 404 }
        )
      }
      
      // Check if approval is allowed
      const approvalCheck = canApprove(profile, manualOverride === true)
      
      if (!approvalCheck.canApprove) {
        console.warn(`❌ Approval blocked for ${profile.business_name}: ${approvalCheck.reason}`)
        return NextResponse.json(
          { error: approvalCheck.reason },
          { status: 400 }
        )
      }
      
      // Build update data
      const updateData: any = {
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }
      
      // If manual listing and manual override requested, set the fields
      if (profile.verification_method === 'manual' && manualOverride === true) {
        updateData.manual_override = true
        updateData.manual_override_at = new Date().toISOString()
        updateData.manual_override_by = user.id
      }
      
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .update(updateData)
        .eq('id', businessId)
        .select()
        .single()
      
      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to update business status' },
          { status: 500 }
        )
      }
      
      console.log(`✅ Business approved: ${profile.business_name}`, {
        verification_method: profile.verification_method,
        manual_override: updateData.manual_override || false
      })
      
      return NextResponse.json({
        success: true,
        business: data,
        message: `Business approved successfully`
      })
    }
    
    // Reject action
    if (action === 'reject') {
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', businessId)
        .select()
        .single()
      
      if (error) {
        console.error('Database error:', error)
        return NextResponse.json(
          { error: 'Failed to update business status' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        business: data,
        message: `Business rejected successfully`
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
