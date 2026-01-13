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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'hq', 'franchise', 'all'

    let hqAdmins = []
    let franchiseAdmins = []

    // Fetch HQ admins
    if (type === 'all' || type === 'hq') {
      const { data, error } = await supabase
        .from('hq_admins')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching HQ admins:', error)
      } else {
        hqAdmins = data || []
      }
    }

    // Fetch franchise admins
    if (type === 'all' || type === 'franchise') {
      const { data, error } = await supabase
        .from('city_admins')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching franchise admins:', error)
      } else {
        franchiseAdmins = data || []
      }
    }

    return NextResponse.json({
      hq_admins: hqAdmins,
      franchise_admins: franchiseAdmins
    })

  } catch (error) {
    console.error('Users API error:', error)
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
    const { type, email, role } = body

    if (!type || !email) {
      return NextResponse.json({ error: 'Type and email required' }, { status: 400 })
    }

    if (type !== 'hq' && type !== 'franchise') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Use service role for writes
    const adminClient = createServiceRoleClient()

    if (type === 'hq') {
      // Create HQ admin
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      // Insert into hq_admins
      const { data: hqAdmin, error: hqError } = await adminClient
        .from('hq_admins')
        .insert({
          user_id: authData.user.id,
          email,
          role: role || 'admin',
          is_active: true
        })
        .select()
        .single()
      
      if (hqError) {
        console.error('Error creating HQ admin:', hqError)
        return NextResponse.json({ error: 'Failed to create HQ admin' }, { status: 500 })
      }

      // Log audit event
      await adminClient.from('hq_audit_logs').insert({
        actor_user_id: auth.user.id,
        actor_email: auth.hqAdmin.email,
        actor_type: 'hq_admin',
        action: 'hq_admin_created',
        resource_type: 'hq_admin',
        resource_id: hqAdmin.id,
        city: null,
        metadata: { email, role: role || 'admin' }
      })

      return NextResponse.json({ hq_admin: hqAdmin })
    }

    // Franchise admin creation is handled by the franchise creation flow
    return NextResponse.json({ error: 'Franchise admin creation not supported via this endpoint' }, { status: 400 })

  } catch (error) {
    console.error('User creation API error:', error)
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
    const { type, id, is_active } = body

    if (!type || !id || typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'Type, ID, and is_active required' }, { status: 400 })
    }

    // Use service role for writes
    const adminClient = createServiceRoleClient()

    if (type === 'hq') {
      // Update HQ admin
      const { data, error } = await adminClient
        .from('hq_admins')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating HQ admin:', error)
        return NextResponse.json({ error: 'Failed to update HQ admin' }, { status: 500 })
      }

      // Log audit event
      await adminClient.from('hq_audit_logs').insert({
        actor_user_id: auth.user.id,
        actor_email: auth.hqAdmin.email,
        actor_type: 'hq_admin',
        action: 'hq_admin_updated',
        resource_type: 'hq_admin',
        resource_id: id,
        city: null,
        metadata: { is_active }
      })

      return NextResponse.json({ hq_admin: data })
    }

    return NextResponse.json({ error: 'Only HQ admin updates supported' }, { status: 400 })

  } catch (error) {
    console.error('User update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
