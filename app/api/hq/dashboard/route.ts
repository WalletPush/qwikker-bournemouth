import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    // Use service role for reads (HQ operates above RLS)
    const supabase = createServiceRoleClient()

    // Fetch franchise count and status
    const { data: franchises, error: franchisesError } = await supabase
      .from('franchise_crm_configs')
      .select('id, city, status, sms_enabled, sms_verified, resend_api_key, created_at')
    
    if (franchisesError) {
      console.error('Error fetching franchises:', franchisesError)
      return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }

    // Count active/suspended
    const activeFranchises = franchises?.filter(f => f.status === 'active').length || 0
    const suspendedFranchises = franchises?.filter(f => f.status === 'suspended').length || 0

    // Fetch total businesses across all cities
    const { count: businessCount, error: businessError } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
    
    if (businessError) {
      console.error('Error counting businesses:', businessError)
    }

    // Fetch pending claims across all cities
    const { count: pendingClaimsCount, error: claimsError } = await supabase
      .from('claim_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    
    if (claimsError) {
      console.error('Error counting claims:', claimsError)
    }

    // Fetch recent claims (last 7 days) for activity tracking
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { count: recentClaimsCount, error: recentClaimsError } = await supabase
      .from('claim_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
    
    if (recentClaimsError) {
      console.error('Error counting recent claims:', recentClaimsError)
    }

    // Check system health indicators (real config completeness)
    const emailHealthy = franchises?.filter(f => f.resend_api_key).length || 0
    const smsHealthy = franchises?.filter(f => f.sms_enabled && f.sms_verified).length || 0

    // Build franchise status grid
    const franchiseGrid = franchises?.map(f => ({
      id: f.id,
      city: f.city,
      status: f.status,
      email_configured: !!f.resend_api_key,
      sms_configured: f.sms_enabled && f.sms_verified,
      created_at: f.created_at
    })) || []

    return NextResponse.json({
      kpis: {
        total_franchises: franchises?.length || 0,
        active_franchises: activeFranchises,
        suspended_franchises: suspendedFranchises,
        total_businesses: businessCount || 0,
        pending_claims: pendingClaimsCount || 0,
        recent_claims_7d: recentClaimsCount || 0
      },
      health: {
        email_healthy: emailHealthy,
        sms_healthy: smsHealthy
      },
      franchises: franchiseGrid
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
