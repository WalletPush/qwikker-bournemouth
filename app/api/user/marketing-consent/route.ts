import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Update User Marketing Consent
 * 
 * POST /api/user/marketing-consent
 * 
 * Updates marketing_push_consent and marketing_email_consent for the authenticated user
 * 
 * Security: Binds to user_id = auth.uid() to prevent consent forgery
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. AUTHENTICATE USER
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. PARSE REQUEST
    const { marketing_push_consent, marketing_email_consent } = await request.json()

    // Validate boolean values
    if (typeof marketing_push_consent !== 'boolean' && marketing_push_consent !== undefined) {
      return NextResponse.json(
        { error: 'marketing_push_consent must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof marketing_email_consent !== 'boolean' && marketing_email_consent !== undefined) {
      return NextResponse.json(
        { error: 'marketing_email_consent must be a boolean' },
        { status: 400 }
      )
    }

    // Build update object (only update provided fields)
    const updates: any = {}
    if (marketing_push_consent !== undefined) {
      updates.marketing_push_consent = marketing_push_consent
    }
    if (marketing_email_consent !== undefined) {
      updates.marketing_email_consent = marketing_email_consent
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No consent fields provided' },
        { status: 400 }
      )
    }

    // 3. UPDATE USER CONSENT (bound to authenticated user)
    const { data, error } = await supabase
      .from('app_users')
      .update(updates)
      .eq('user_id', user.id) // SECURITY: Bind to auth user
      .select()
      .single()

    if (error) {
      console.error('Error updating consent:', error)
      return NextResponse.json(
        { error: 'Failed to update consent preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      marketing_push_consent: data.marketing_push_consent,
      marketing_email_consent: data.marketing_email_consent
    })

  } catch (error: any) {
    console.error('Consent update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get User Marketing Consent
 * 
 * GET /api/user/marketing-consent
 * 
 * Returns current consent status for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. AUTHENTICATE USER
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. GET USER CONSENT
    const { data, error } = await supabase
      .from('app_users')
      .select('marketing_push_consent, marketing_email_consent')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching consent:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consent preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      marketing_push_consent: data.marketing_push_consent || false,
      marketing_email_consent: data.marketing_email_consent || false
    })

  } catch (error: any) {
    console.error('Consent fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
