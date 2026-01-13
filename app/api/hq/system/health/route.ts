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

    // Fetch all franchises with integration status
    const { data: franchises, error: franchisesError } = await supabase
      .from('franchise_crm_configs')
      .select('id, city, status, sms_enabled, sms_verified, sms_last_error, resend_api_key, google_places_api_key, twilio_account_sid, twilio_auth_token, twilio_messaging_service_sid')
    
    if (franchisesError) {
      console.error('Error fetching franchises:', franchisesError)
      return NextResponse.json({ error: 'Failed to fetch franchises' }, { status: 500 })
    }

    const totalFranchises = franchises?.length || 0

    // Email health (Resend configured)
    const emailConfigured = franchises?.filter(f => f.resend_api_key).length || 0

    // SMS health (Twilio configured AND verified)
    const smsConfigured = franchises?.filter(f => 
      f.sms_enabled && 
      f.sms_verified && 
      f.twilio_account_sid && 
      f.twilio_auth_token && 
      f.twilio_messaging_service_sid
    ).length || 0

    const smsErrors = franchises?.filter(f => f.sms_enabled && f.sms_last_error).length || 0

    // Import health (Google Places key present)
    const importsConfigured = franchises?.filter(f => f.google_places_api_key).length || 0

    // Fetch SMS logs for last 24h
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data: smsLogs, error: smsLogsError } = await supabase
      .from('sms_logs')
      .select('status')
      .gte('created_at', twentyFourHoursAgo.toISOString())
    
    if (smsLogsError) {
      console.error('Error fetching SMS logs:', smsLogsError)
    }

    const smsSent = smsLogs?.filter(l => l.status === 'sent').length || 0
    const smsFailed = smsLogs?.filter(l => l.status === 'failed').length || 0

    // Fetch claim requests for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recentClaims, error: claimsError } = await supabase
      .from('claim_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())
    
    if (claimsError) {
      console.error('Error counting claims:', claimsError)
    }

    // Database health (simple check - if we can query, DB is up)
    const dbHealthy = !!franchises

    // Determine overall system status
    const criticalServicesHealthy = emailConfigured === totalFranchises && dbHealthy
    const overallStatus = criticalServicesHealthy ? 'operational' : smsErrors > 0 ? 'degraded' : 'operational'

    // Build per-franchise health
    const franchiseHealth = franchises?.map(f => ({
      id: f.id,
      city: f.city,
      status: f.status,
      email_healthy: !!f.resend_api_key,
      sms_healthy: f.sms_enabled && f.sms_verified && !!f.twilio_messaging_service_sid,
      imports_healthy: !!f.google_places_api_key,
      sms_error: f.sms_last_error || null
    })) || []

    return NextResponse.json({
      overall: {
        status: overallStatus,
        timestamp: new Date().toISOString()
      },
      email: {
        configured: emailConfigured,
        total: totalFranchises,
        percentage: totalFranchises > 0 ? Math.round((emailConfigured / totalFranchises) * 100) : 0,
        status: emailConfigured === totalFranchises ? 'healthy' : 'warning'
      },
      sms: {
        configured: smsConfigured,
        total: totalFranchises,
        errors: smsErrors,
        sent_24h: smsSent,
        failed_24h: smsFailed,
        percentage: totalFranchises > 0 ? Math.round((smsConfigured / totalFranchises) * 100) : 0,
        status: smsErrors > 0 ? 'warning' : smsConfigured === totalFranchises ? 'healthy' : 'partial'
      },
      imports: {
        configured: importsConfigured,
        total: totalFranchises,
        percentage: totalFranchises > 0 ? Math.round((importsConfigured / totalFranchises) * 100) : 0,
        status: importsConfigured === totalFranchises ? 'healthy' : 'warning'
      },
      database: {
        status: dbHealthy ? 'healthy' : 'down',
        response_time_ms: 'N/A' // Can be enhanced with actual timing
      },
      activity: {
        claims_7d: recentClaims || 0
      },
      franchises: franchiseHealth
    })

  } catch (error) {
    console.error('System health API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
