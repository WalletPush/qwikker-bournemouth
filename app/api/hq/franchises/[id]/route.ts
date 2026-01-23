import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    // Use service role for reads (HQ operates above RLS)
    const supabase = createServiceRoleClient()
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchise_crm_configs')
      .select('*')
      .eq('id', id)
      .single()
    
    if (franchiseError || !franchise) {
      return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
    }

    // Fetch franchise admins
    const { data: admins, error: adminsError } = await supabase
      .from('city_admins')
      .select('id, user_id, role, created_at, created_by')
      .eq('city', franchise.city)
    
    if (adminsError) {
      console.error('Error fetching admins:', adminsError)
    }

    // Fetch business count
    const { count: businessCount, error: businessError } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('city', franchise.city)
    
    if (businessError) {
      console.error('Error counting businesses:', businessError)
    }

    // Fetch claim stats
    const { count: pendingClaims, error: claimsError } = await supabase
      .from('claim_requests')
      .select('*', { count: 'exact', head: true })
      .eq('city', franchise.city)
      .eq('status', 'pending')
    
    if (claimsError) {
      console.error('Error counting claims:', claimsError)
    }

    const { count: approvedClaims, error: approvedError } = await supabase
      .from('claim_requests')
      .select('*', { count: 'exact', head: true })
      .eq('city', franchise.city)
      .eq('status', 'approved')
    
    if (approvedError) {
      console.error('Error counting approved claims:', approvedError)
    }

    // Fetch recent audit logs for this franchise
    const { data: auditLogs, error: auditError } = await supabase
      .from('hq_audit_logs')
      .select('*')
      .eq('city', franchise.city)
      .order('timestamp', { ascending: false })
      .limit(10)
    
    if (auditError) {
      console.error('Error fetching audit logs:', auditError)
    }

    // Mask sensitive data
    const sanitized = {
      ...franchise,
      resend_api_key: franchise.resend_api_key ? '••••••' : null,
      openai_api_key: franchise.openai_api_key ? '••••••' : null,
      stripe_secret_key: franchise.stripe_secret_key ? '••••••' : null,
      google_places_api_key: franchise.google_places_api_key ? '••••••' : null,
      twilio_account_sid: franchise.twilio_account_sid ? '••••••' : null,
      twilio_auth_token: franchise.twilio_auth_token ? '••••••' : null
    }

    return NextResponse.json({
      franchise: sanitized,
      admins: admins || [],
      stats: {
        businesses: businessCount || 0,
        pending_claims: pendingClaims || 0,
        approved_claims: approvedClaims || 0
      },
      audit_logs: auditLogs || []
    })

  } catch (error) {
    console.error('Franchise detail API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    const body = await request.json()
    const { status } = body

    if (!['active', 'suspended', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Use service role for writes
    const adminClient = createServiceRoleClient()

    // Update franchise status
    const { data: franchise, error: updateError } = await adminClient
      .from('franchise_crm_configs')
      .update({ status })
      .eq('id', id)
      .select('city')
      .single()
    
    if (updateError) {
      console.error('Error updating franchise:', updateError)
      return NextResponse.json({ error: 'Failed to update franchise' }, { status: 500 })
    }

    // Log audit event
    await adminClient.from('hq_audit_logs').insert({
      actor_user_id: auth.user.id,
      actor_email: auth.hqAdmin.email,
      actor_type: 'hq_admin',
      action: 'franchise_status_changed',
      resource_type: 'franchise',
      resource_id: id,
      city: franchise.city,
      metadata: { new_status: status }
    })

    return NextResponse.json({ success: true, status })

  } catch (error) {
    console.error('Franchise update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    const body = await request.json()
    
    // Use service role for writes
    const adminClient = createServiceRoleClient()

    // Update Atlas config
    const { data: franchise, error: updateError } = await adminClient
      .from('franchise_crm_configs')
      .update({
        atlas_enabled: body.atlas_enabled,
        mapbox_public_token: body.mapbox_public_token,
        mapbox_style_url: body.mapbox_style_url,
        atlas_min_rating: body.atlas_min_rating,
        atlas_max_results: body.atlas_max_results,
        atlas_default_zoom: body.atlas_default_zoom,
        atlas_pitch: body.atlas_pitch,
        atlas_bearing: body.atlas_bearing,
        lat: body.lat,
        lng: body.lng,
        onboarding_search_radius_m: body.onboarding_search_radius_m,
        import_search_radius_m: body.import_search_radius_m,
        import_max_radius_m: body.import_max_radius_m
      })
      .eq('id', id)
      .select('city')
      .single()
    
    if (updateError) {
      console.error('Error updating Atlas config:', updateError)
      return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }

    // Log audit event
    await adminClient.from('hq_audit_logs').insert({
      actor_user_id: auth.user.id,
      actor_email: auth.hqAdmin.email,
      actor_type: 'hq_admin',
      action: 'atlas_config_updated',
      resource_type: 'franchise',
      resource_id: id,
      city: franchise.city,
      metadata: { atlas_enabled: body.atlas_enabled }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Atlas config update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
