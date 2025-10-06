import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to download your data' },
        { status: 401 }
      )
    }

    // Fetch all user data from business_profiles
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to fetch profile data' },
        { status: 500 }
      )
    }

    // Fetch business changes (pending/approved offers, etc.)
    const { data: businessChanges, error: changesError } = await supabase
      .from('business_changes')
      .select('*')
      .eq('business_id', profile?.id)

    // Fetch user business visits (if user is also a consumer)
    const { data: businessVisits, error: visitsError } = await supabase
      .from('user_business_visits')
      .select('*')
      .eq('visitor_wallet_pass_id', user.id)

    // Fetch offer claims (if user is also a consumer)
    const { data: offerClaims, error: claimsError } = await supabase
      .from('user_offer_claims')
      .select('*')
      .eq('user_id', user.id)

    // Prepare comprehensive data export
    const exportData = {
      export_info: {
        generated_at: new Date().toISOString(),
        user_id: user.id,
        export_type: 'complete_user_data',
        gdpr_compliance: true
      },
      
      // Auth user data
      auth_user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata
      },

      // Business profile data (if exists)
      business_profile: profile || null,

      // Business changes (offers, updates, etc.)
      business_changes: businessChanges || [],

      // Consumer activity (if applicable)
      consumer_activity: {
        business_visits: businessVisits || [],
        offer_claims: offerClaims || []
      },

      // Data processing information
      data_processing_info: {
        purposes: [
          'Account management and authentication',
          'Business profile creation and management',
          'Offer creation and management',
          'Consumer discovery and engagement',
          'Platform analytics and improvement',
          'Customer support and communication'
        ],
        legal_basis: [
          'Contract performance (service provision)',
          'Legitimate interest (platform operation)',
          'Consent (marketing communications)'
        ],
        retention_policy: 'Data is retained while account is active and for legitimate business purposes',
        your_rights: [
          'Right to access your data',
          'Right to rectify inaccurate data',
          'Right to erase your data',
          'Right to restrict processing',
          'Right to data portability',
          'Right to object to processing',
          'Right to withdraw consent'
        ]
      }
    }

    // Return the data as JSON with appropriate headers
    const response = NextResponse.json(exportData)
    
    // Set headers for file download
    response.headers.set('Content-Disposition', `attachment; filename="qwikker-data-export-${user.id}-${new Date().toISOString().split('T')[0]}.json"`)
    response.headers.set('Content-Type', 'application/json')
    
    return response

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate data export' },
      { status: 500 }
    )
  }
}
