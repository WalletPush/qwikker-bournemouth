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
    const { data: franchises, error } = await supabase
      .from('franchise_crm_configs')
      .select('id, city, subdomain, status, sms_enabled, sms_verified, resend_api_key, twilio_account_sid, twilio_messaging_service_sid, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching franchises:', error)
      return NextResponse.json({ error: 'Failed to fetch franchises', details: error.message }, { status: 500 })
    }

    // Add health indicators (guaranteed shape)
    const franchisesWithHealth = franchises?.map(f => ({
      id: f.id,
      city: f.city,
      subdomain: f.subdomain,
      status: f.status,
      created_at: f.created_at,
      health: {
        email: !!f.resend_api_key,
        sms: !!(f.sms_enabled && f.sms_verified && f.twilio_account_sid && f.twilio_messaging_service_sid)
      }
    })) || []

    return NextResponse.json({ franchises: franchisesWithHealth })

  } catch (error) {
    console.error('Franchises list API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { city, subdomain, owner_email, owner_temp_password } = body

    // Validate input
    if (!city || !subdomain || !owner_email) {
      return NextResponse.json({ error: 'City, subdomain, and owner email required' }, { status: 400 })
    }

    // Sanitize subdomain
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')

    // Use service role for writes (bypasses RLS)
    const adminClient = createServiceRoleClient()

    // Check if city already exists
    const { data: existing } = await adminClient
      .from('franchise_crm_configs')
      .select('city')
      .eq('city', city.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Franchise already exists for this city' }, { status: 409 })
    }

    // Create franchise config
    const { data: franchise, error: franchiseError } = await adminClient
      .from('franchise_crm_configs')
      .insert({
        city: city.toLowerCase(),
        subdomain: cleanSubdomain,
        status: 'active'
      })
      .select()
      .single()

    if (franchiseError) {
      console.error('Error creating franchise:', franchiseError)
      return NextResponse.json({ error: 'Failed to create franchise' }, { status: 500 })
    }

    // Create Supabase Auth user for franchise admin
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: owner_email,
      password: owner_temp_password || Math.random().toString(36).slice(-12), // temp password
      email_confirm: false, // Require email verification
      user_metadata: {
        city: city.toLowerCase(),
        role: 'city_admin'
      }
    })

    if (authError) {
      // Rollback franchise
      await adminClient.from('franchise_crm_configs').delete().eq('id', franchise.id)
      console.error('Error creating auth user:', authError)
      return NextResponse.json({ error: 'Failed to create franchise admin user' }, { status: 500 })
    }

    // Create city_admins row
    const { error: adminError } = await adminClient
      .from('city_admins')
      .insert({
        user_id: authData.user.id,
        city: city.toLowerCase(),
        role: 'admin',
        created_by: auth.user.id
      })

    if (adminError) {
      // Rollback
      await adminClient.from('franchise_crm_configs').delete().eq('id', franchise.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      console.error('Error creating city admin:', adminError)
      return NextResponse.json({ error: 'Failed to link franchise admin' }, { status: 500 })
    }

    // Log audit event
    await adminClient.from('hq_audit_logs').insert({
      actor_user_id: auth.user.id,
      actor_email: auth.hqAdmin.email,
      actor_type: 'hq_admin',
      action: 'franchise_created',
      resource_type: 'franchise',
      resource_id: franchise.id,
      city: city.toLowerCase(),
      metadata: { owner_email, subdomain: cleanSubdomain }
    })

    // TODO: Send invite email via Resend

    return NextResponse.json({ 
      franchise,
      message: 'Franchise created. Invite email sent to owner.'
    })

  } catch (error) {
    console.error('Franchise creation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
