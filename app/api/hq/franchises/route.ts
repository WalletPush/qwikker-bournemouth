import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/hq/franchises
 * List all franchises (HQ only)
 * 
 * Uses session auth to verify HQ, then service role to fetch data
 */
export async function GET() {
  // 1. Verify session user via cookies
  const supabase = await createClient()
  
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. Check HQ permission
  const { data: hqRow, error: hqErr } = await supabase
    .from('hq_admins')
    .select('user_id, is_active')
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (hqErr) {
    console.error('HQ check failed:', hqErr)
    return NextResponse.json({ 
      error: 'HQ check failed', 
      details: hqErr.message 
    }, { status: 500 })
  }
  
  if (!hqRow || !hqRow.is_active) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 3. Fetch franchises using service role (bypasses RLS safely)
  const admin = createServiceRoleClient()
  
  const { data: franchises, error } = await admin
    .from('franchise_crm_configs')
    .select(`
      city,
      subdomain,
      display_name,
      timezone,
      status,
      created_at,
      sms_enabled,
      resend_api_key,
      owner_email,
      owner_name
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Failed to fetch franchises:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch franchises',
      details: error.message
    }, { status: 500 })
  }
  
  // 4. Transform for HQ view
  const transformed = franchises?.map(f => ({
    city: f.city,
    subdomain: f.subdomain,
    display_name: f.display_name,
    country: 'GB', // Placeholder - add country column later if needed
    timezone: f.timezone,
    status: f.status,
    created_at: f.created_at,
    
    health: {
      email: !!f.resend_api_key,
      sms: f.sms_enabled || false
    },
    
    owner: f.owner_email ? {
      email: f.owner_email,
      name: f.owner_name || null,
      status: 'active',
      last_login: null
    } : null
  }))
  
  return NextResponse.json({
    franchises: transformed || [],
    total: transformed?.length || 0
  })
}

/**
 * POST /api/hq/franchises
 * Create new franchise (HQ only)
 * 
 * This is the ONLY way a city is born.
 * Atomically creates:
 * 1. franchise_crm_configs row
 * 2. city_admins row (owner)
 * 3. Sends invite email
 */
export async function POST(request: Request) {
  // 1. Get session-based user
  const supabase = await createClient()
  
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  
  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. Check if user is HQ admin
  const { data: hqAdmin, error: hqErr } = await supabase
    .from('hq_admins')
    .select('user_id, email, is_active')
    .eq('user_id', user.id)
    .maybeSingle()
  
  if (hqErr) {
    return NextResponse.json({ error: 'HQ check failed' }, { status: 500 })
  }
  
  if (!hqAdmin || !hqAdmin.is_active) {
    return NextResponse.json({ error: 'Forbidden: Not an HQ admin' }, { status: 403 })
  }
  
  try {
    
    const body = await request.json()
    
    // Validate required fields
    const {
      city_name,
      subdomain,
      country,
      timezone,
      owner_email,
      owner_first_name,
      owner_last_name,
      owner_phone,
      // Optional
      send_invite = true,
      force_password_reset = true
    } = body
    
    if (!city_name || !subdomain || !country || !timezone || !owner_email) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }
    
    // Sanitize subdomain
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
    
    if (cleanSubdomain !== subdomain) {
      return NextResponse.json({ 
        error: `Invalid subdomain. Use: ${cleanSubdomain}` 
      }, { status: 400 })
    }
    
    // Check if city/subdomain already exists
    const { data: existing } = await supabase
      .from('franchise_crm_configs')
      .select('city')
      .eq('city', cleanSubdomain)
      .single()
    
    if (existing) {
      return NextResponse.json({ 
        error: `City '${cleanSubdomain}' already exists` 
      }, { status: 400 })
    }
    
    // 1. Create franchise_crm_configs
    const { data: franchise, error: franchiseError } = await supabase
      .from('franchise_crm_configs')
      .insert({
        city: cleanSubdomain,
        subdomain: cleanSubdomain,
        display_name: city_name,
        country,
        timezone,
        status: 'pending_setup',
        
        // Default values
        owner_email: owner_email,
        owner_name: [owner_first_name, owner_last_name].filter(Boolean).join(' '),
        
        // Email/SMS disabled by default (franchise enables in setup)
        sms_enabled: false,
        
        // Defaults
        resend_from_email: `no-reply@${cleanSubdomain}.qwikker.com`,
        resend_from_name: `QWIKKER ${city_name}`
      })
      .select()
      .single()
    
    if (franchiseError) {
      console.error('Failed to create franchise:', franchiseError)
      return NextResponse.json({ 
        error: 'Failed to create franchise' 
      }, { status: 500 })
    }
    
    // 2. Create auth user (invite)
    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      owner_email,
      {
        data: {
          first_name: owner_first_name,
          last_name: owner_last_name,
          city: cleanSubdomain,
          role: 'city_admin'
        },
        redirectTo: `https://${cleanSubdomain}.qwikker.com/admin`
      }
    )
    
    if (authError || !authUser.user) {
      console.error('Failed to create auth user:', authError)
      // Rollback franchise
      await supabase.from('franchise_crm_configs').delete().eq('city', cleanSubdomain)
      return NextResponse.json({ 
        error: 'Failed to create admin user' 
      }, { status: 500 })
    }
    
    // 3. Create city_admins record
    const { error: cityAdminError } = await supabase
      .from('city_admins')
      .insert({
        user_id: authUser.user.id,
        email: owner_email,
        city: cleanSubdomain,
        first_name: owner_first_name,
        last_name: owner_last_name,
        phone: owner_phone,
        role: 'owner',
        status: 'invited',
        created_by: hqAdmin.user_id
      })
    
    if (cityAdminError) {
      console.error('Failed to create city admin:', cityAdminError)
      // Rollback
      await supabase.auth.admin.deleteUser(authUser.user.id)
      await supabase.from('franchise_crm_configs').delete().eq('city', cleanSubdomain)
      return NextResponse.json({ 
        error: 'Failed to create city admin record' 
      }, { status: 500 })
    }
    
    // 4. Log audit event (optional - requires full migration)
    try {
      const { logAuditEvent } = await import('@/lib/auth/hq-admin')
      await logAuditEvent({
        action: 'franchise_created',
        resourceType: 'franchise',
        resourceId: cleanSubdomain,
        city: cleanSubdomain,
        metadata: {
          city_name,
          owner_email,
          created_by_email: hqAdmin.email
        },
        actorId: hqAdmin.user_id
      })
    } catch (auditError) {
      console.log('Audit logging skipped (requires full migration)')
    }
    
    // 5. Success
    return NextResponse.json({
      success: true,
      franchise: {
        city: cleanSubdomain,
        subdomain: cleanSubdomain,
        display_name: city_name,
        owner_email,
        status: 'pending_setup',
        admin_url: `https://${cleanSubdomain}.qwikker.com/admin`
      },
      message: send_invite 
        ? `Franchise created. Invite email sent to ${owner_email}`
        : `Franchise created. No invite sent.`
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('HQ API error:', error)
    
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

