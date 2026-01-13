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
    const { data: flags, error: flagsError } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_name')
    
    if (flagsError) {
      console.error('Error fetching feature flags:', flagsError)
      return NextResponse.json({ error: 'Failed to fetch feature flags', details: flagsError.message }, { status: 500 })
    }

    return NextResponse.json({ flags: flags || [] })

  } catch (error) {
    console.error('Feature flags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const { id, is_enabled } = body

    if (!id) {
      return NextResponse.json({ error: 'Flag ID required' }, { status: 400 })
    }

    if (typeof is_enabled !== 'boolean') {
      return NextResponse.json({ error: 'is_enabled must be a boolean' }, { status: 400 })
    }

    // Use service role for writes
    const adminClient = createServiceRoleClient()

    const { data: flag, error: updateError } = await adminClient
      .from('feature_flags')
      .update({ 
        is_enabled,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating feature flag:', updateError)
      return NextResponse.json({ error: 'Failed to update feature flag', details: updateError.message }, { status: 500 })
    }

    // Log audit event
    await adminClient.from('hq_audit_logs').insert({
      actor_user_id: auth.user.id,
      actor_email: auth.hqAdmin.email,
      actor_type: 'hq_admin',
      action: 'feature_flag_updated',
      resource_type: 'feature_flag',
      resource_id: id,
      city: flag.city || null,
      metadata: { flag_key: flag.flag_key, is_enabled }
    })

    return NextResponse.json({ flag })

  } catch (error) {
    console.error('Feature flag update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
