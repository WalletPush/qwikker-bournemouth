import { NextRequest, NextResponse } from 'next/server'
import { requireHQAdmin } from '@/lib/auth/hq'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { generateSecurePassword } from '@/lib/utils/password-generator'
import { getHQEmailConfigWithFallback } from '@/lib/email/hq-email-config'
import { FranchiseInvitationEmail, FranchiseInvitationEmailText } from '@/lib/email/franchise-invitation'
import { Resend } from 'resend'

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
    console.log('🚀 [HQ] Starting franchise creation...')
    
    // Verify HQ admin (session-based)
    const auth = await requireHQAdmin()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const {
      city_name,
      subdomain,
      country,
      timezone,
      owner_first_name,
      owner_last_name,
      owner_email,
      owner_phone,
      send_invite = true,
      force_password_reset = true,
      // Atlas optional fields
      atlas_enabled = false,
      mapbox_public_token,
      mapbox_style_url,
      atlas_min_rating,
      atlas_max_results,
      city_lat,
      city_lng
    } = body

    console.log('📝 [HQ] Form data received:', { city_name, subdomain, owner_email, country, timezone })

    // Validate required fields
    if (!city_name || !subdomain || !owner_email || !owner_first_name || !owner_last_name) {
      return NextResponse.json(
        { error: 'City name, subdomain, owner name, and owner email are required' },
        { status: 400 }
      )
    }

    // Sanitize and normalize
    const cleanCity = city_name.toLowerCase().trim()
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '')
    
    // Username = city name (as per user requirement)
    const username = cleanCity
    
    // Generate secure temporary password
    const temporaryPassword = generateSecurePassword()
    console.log('🔐 [HQ] Generated secure password (length:', temporaryPassword.length, ')')

    // Use service role for writes (bypasses RLS)
    const adminClient = createServiceRoleClient()

    // Check if city or subdomain already exists
    const { data: existingCity } = await adminClient
      .from('franchise_crm_configs')
      .select('city, subdomain')
      .or(`city.eq.${cleanCity},subdomain.eq.${cleanSubdomain}`)
      .maybeSingle()

    if (existingCity) {
      if (existingCity.city === cleanCity) {
        return NextResponse.json({ error: `Franchise already exists for ${city_name}` }, { status: 409 })
      }
      if (existingCity.subdomain === cleanSubdomain) {
        return NextResponse.json({ error: `Subdomain "${cleanSubdomain}" is already taken` }, { status: 409 })
      }
    }

    console.log('✅ [HQ] City and subdomain available')

    // Map country code to full name
    const countryNameMap: Record<string, string> = {
      'GB': 'United Kingdom',
      'US': 'United States',
      'CA': 'Canada',
      'AU': 'Australia',
      'NZ': 'New Zealand',
      'IE': 'Ireland',
      'FR': 'France',
      'DE': 'Germany',
      'ES': 'Spain',
      'IT': 'Italy',
      'PT': 'Portugal',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'HK': 'Hong Kong',
      'TW': 'Taiwan',
      'IN': 'India',
      'TH': 'Thailand',
      'MY': 'Malaysia',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'SG': 'Singapore',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'QA': 'Qatar',
      'IL': 'Israel',
      'TR': 'Turkey',
      'MX': 'Mexico',
      'BR': 'Brazil',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'EG': 'Egypt',
      'ZA': 'South Africa',
      'KE': 'Kenya',
      'NG': 'Nigeria'
    }
    
    const countryCode = country || 'GB'
    const countryName = countryNameMap[countryCode] || countryCode
    const franchiseDisplayName = city_name.charAt(0).toUpperCase() + city_name.slice(1)
    
    // 1️⃣ Create franchise_crm_configs row (CRITICAL - as per user requirement)
    const { data: franchise, error: franchiseError } = await adminClient
      .from('franchise_crm_configs')
      .insert({
        city: cleanCity,
        display_name: franchiseDisplayName,
        subdomain: cleanSubdomain,
        country_code: countryCode,
        country_name: countryName,
        timezone: timezone || 'Europe/London',
        status: 'pending_setup', // New franchises are pending until admin completes setup wizard
        // Owner details
        owner_name: `${owner_first_name} ${owner_last_name}`,
        owner_email: owner_email,
        owner_phone: owner_phone || null,
        // GHL webhook (placeholder for now, franchise admin will configure)
        ghl_webhook_url: `PLACEHOLDER_${cleanCity.toUpperCase()}_WEBHOOK_URL`,
        // Atlas configuration (optional)
        atlas_enabled: atlas_enabled || false,
        mapbox_public_token: mapbox_public_token || null,
        mapbox_style_url: mapbox_style_url || 'mapbox://styles/mapbox/dark-v11',
        atlas_min_rating: atlas_min_rating || 4.4,
        atlas_max_results: atlas_max_results || 12,
        lat: city_lat || null,
        lng: city_lng || null
      })
      .select()
      .single()

    if (franchiseError) {
      console.error('❌ [HQ] Error creating franchise_crm_configs:', franchiseError)
      return NextResponse.json(
        { error: 'Failed to create franchise configuration', details: franchiseError.message },
        { status: 500 }
      )
    }

    console.log('✅ [HQ] franchise_crm_configs row created:', franchise.id)

    // 2️⃣ Create Supabase Auth user for franchise admin
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: owner_email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email (they're invited by HQ)
      user_metadata: {
        city: cleanCity,
        role: 'city_admin',
        first_name: owner_first_name,
        last_name: owner_last_name,
        phone: owner_phone || null,
        force_password_reset: force_password_reset
      }
    })

    if (authError) {
      // Rollback franchise config
      console.error('❌ [HQ] Error creating auth user:', authError)
      await adminClient.from('franchise_crm_configs').delete().eq('id', franchise.id)
      
      // Provide specific error message for email conflict
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        return NextResponse.json(
          { error: `This email address (${owner_email}) is already registered. Please use a different email or contact the existing user.` },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create franchise admin user', details: authError.message },
        { status: 500 }
      )
    }

    console.log('✅ [HQ] Auth user created:', authData.user.id)

    // 3️⃣ Create city_admins row
    // Note: This table uses old auth system (username + password_hash)
    // We create Supabase Auth user separately (step 2) but can't link here (no user_id column)
    const fullName = `${owner_first_name} ${owner_last_name}`
    const { error: adminError } = await adminClient
      .from('city_admins')
      .insert({
        city: cleanCity,
        username: cleanCity, // Username = city name (per requirement)
        password_hash: 'SUPABASE_AUTH', // Placeholder - actual auth happens via Supabase Auth
        email: owner_email,
        full_name: fullName,
        is_active: true
      })

    if (adminError) {
      // Rollback franchise and auth user
      console.error('❌ [HQ] Error creating city_admins row:', adminError)
      await adminClient.from('franchise_crm_configs').delete().eq('id', franchise.id)
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to link franchise admin', details: adminError.message },
        { status: 500 }
      )
    }

    console.log('✅ [HQ] city_admins row created')

    // 4️⃣ Send invitation email (if enabled)
    let emailSent = false
    let emailError: string | null = null

    if (send_invite) {
      try {
        console.log('📧 [HQ] Preparing to send invitation email...')
        
        const emailConfig = await getHQEmailConfigWithFallback()
        
        if (!emailConfig.enabled || !emailConfig.resend_api_key) {
          console.warn('⚠️ [HQ] Email not configured, skipping invitation email')
          emailError = 'Email configuration not complete'
        } else {
          const resend = new Resend(emailConfig.resend_api_key)
          
          const ownerFullName = `${owner_first_name} ${owner_last_name}`
          const franchiseDisplayName = city_name.charAt(0).toUpperCase() + city_name.slice(1) // Capitalize
          const loginUrl = `https://${cleanSubdomain}.qwikker.com/admin/login`
          
          const emailHtml = FranchiseInvitationEmail({
            franchiseName: franchiseDisplayName,
            ownerName: ownerFullName,
            ownerEmail: owner_email,
            username: username, // City name as username (as per requirement)
            temporaryPassword: temporaryPassword,
            loginUrl: loginUrl,
            subdomain: cleanSubdomain
          })
          
          const emailText = FranchiseInvitationEmailText({
            franchiseName: franchiseDisplayName,
            ownerName: ownerFullName,
            ownerEmail: owner_email,
            username: username,
            temporaryPassword: temporaryPassword,
            loginUrl: loginUrl,
            subdomain: cleanSubdomain
          })
          
          const result = await resend.emails.send({
            from: `${emailConfig.from_name} <${emailConfig.from_email}>`,
            to: owner_email,
            subject: `🎉 Welcome to Qwikker - Your ${franchiseDisplayName} Franchise is Ready!`,
            html: emailHtml,
            text: emailText,
            reply_to: emailConfig.reply_to
          })
          
          if (result.data?.id) {
            console.log('✅ [HQ] Invitation email sent successfully:', result.data.id)
            emailSent = true
          } else {
            console.error('❌ [HQ] Email send returned no ID:', result)
            emailError = 'Email send failed (no ID returned)'
          }
        }
      } catch (err) {
        console.error('❌ [HQ] Error sending invitation email:', err)
        emailError = err instanceof Error ? err.message : 'Unknown email error'
        // Don't fail the whole operation if email fails
      }
    }

    // 5️⃣ Log audit event
    await adminClient.from('hq_audit_logs').insert({
      actor_user_id: auth.user.id,
      actor_email: auth.hqAdmin.email,
      actor_type: 'hq_admin',
      action: 'franchise_created',
      resource_type: 'franchise',
      resource_id: franchise.id,
      city: cleanCity,
      metadata: {
        owner_email,
        owner_name: `${owner_first_name} ${owner_last_name}`,
        subdomain: cleanSubdomain,
        country,
        timezone,
        email_sent: emailSent,
        email_error: emailError
      }
    })

    console.log('✅ [HQ] Audit log created')
    console.log('🎉 [HQ] Franchise creation complete!')

    // Return success response
    return NextResponse.json({
      success: true,
      franchise: {
        id: franchise.id,
        city: cleanCity,
        display_name: franchiseDisplayName,
        subdomain: cleanSubdomain,
        country_code: countryCode,
        country_name: countryName,
        timezone: timezone || 'Europe/London'
      },
      admin: {
        user_id: authData.user.id,
        email: owner_email,
        username: username,
        name: `${owner_first_name} ${owner_last_name}`
      },
      email: {
        sent: emailSent,
        error: emailError
      },
      message: emailSent
        ? 'Franchise created successfully! Invitation email sent to owner.'
        : 'Franchise created successfully! Email could not be sent (check HQ email configuration).'
    })

  } catch (error) {
    console.error('❌ [HQ] Franchise creation API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
