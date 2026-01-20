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
      
      // ✅ LOCKDOWN: Use atomic RPC to ensure trial subscription is created
      const { data: rpcResult, error: rpcError } = await supabaseAdmin
        .rpc('approve_business_with_trial', {
          p_business_id: businessId,
          p_approved_by: user.id,
          p_manual_override: profile.verification_method === 'manual' && manualOverride === true,
          p_manual_override_by: profile.verification_method === 'manual' && manualOverride === true ? user.id : null
        })
      
      if (rpcError) {
        console.error('❌ Atomic approval failed:', rpcError)
        return NextResponse.json(
          { error: `Failed to approve business: ${rpcError.message}` },
          { status: 500 }
        )
      }
      
      console.log(`✅ Business approved atomically: ${profile.business_name}`, {
        verification_method: profile.verification_method,
        manual_override: profile.verification_method === 'manual' && manualOverride === true,
        trial_end_date: rpcResult?.trial_end_date,
        trial_days: rpcResult?.trial_days
      })
      
      // Fetch updated business for response
      const { data: updatedBusiness } = await supabaseAdmin
        .from('business_profiles')
        .select()
        .eq('id', businessId)
        .single()
      
      return NextResponse.json({
        success: true,
        business: updatedBusiness,
        trial_info: rpcResult,
        message: `Business approved successfully with ${rpcResult?.trial_days || 90}-day trial`
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
