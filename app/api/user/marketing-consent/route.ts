import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Update User Marketing Consent
 * 
 * POST /api/user/marketing-consent
 * 
 * Updates marketing_push_consent and email_marketing_consent for the authenticated user
 * 
 * Security: Binds to user_id = auth.uid() to prevent consent forgery
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. PARSE REQUEST FIRST
    const body = await request.json()
    const { marketing_push_consent, email_marketing_consent, wallet_pass_id } = body
    
    // 2. IDENTIFY USER (either auth or wallet pass)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // User must be either authenticated OR provide wallet_pass_id
    if ((!user || authError) && !wallet_pass_id) {
      return NextResponse.json(
        { error: 'Unauthorized - no user session or wallet pass ID' },
        { status: 401 }
      )
    }

    // 3. VALIDATE REQUEST
    if (typeof marketing_push_consent !== 'boolean' && marketing_push_consent !== undefined) {
      return NextResponse.json(
        { error: 'marketing_push_consent must be a boolean' },
        { status: 400 }
      )
    }

    if (typeof email_marketing_consent !== 'boolean' && email_marketing_consent !== undefined) {
      return NextResponse.json(
        { error: 'email_marketing_consent must be a boolean' },
        { status: 400 }
      )
    }

    // Build update object (only update provided fields, with timestamps)
    const updates: any = {}
    if (marketing_push_consent !== undefined) {
      updates.marketing_push_consent = marketing_push_consent
      if (marketing_push_consent) {
        updates.marketing_push_consent_at = new Date().toISOString()
      }
    }
    if (email_marketing_consent !== undefined) {
      updates.email_marketing_consent = email_marketing_consent
      if (email_marketing_consent) {
        updates.email_marketing_consent_at = new Date().toISOString()
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No consent fields provided' },
        { status: 400 }
      )
    }

    // 4. UPDATE USER CONSENT
    // IMPORTANT: Prefer wallet_pass_id (primary key of app_users) over user_id
    // Most wallet pass holders don't have a user_id set
    let query = supabase
      .from('app_users')
      .update(updates)
    
    if (wallet_pass_id) {
      query = query.eq('wallet_pass_id', wallet_pass_id)
    } else if (user?.id) {
      query = query.eq('user_id', user.id)
    }
    
    const { data, error } = await query.select().maybeSingle()

    if (error) {
      console.error('Error updating consent:', error)
      return NextResponse.json(
        { error: 'Failed to update consent preferences' },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('No app_users row found for:', wallet_pass_id ? `wallet_pass_id=${wallet_pass_id}` : `user_id=${user?.id}`)
      return NextResponse.json(
        { error: 'User not found. Please ensure your wallet pass is active.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      marketing_push_consent: data.marketing_push_consent,
      email_marketing_consent: data.email_marketing_consent
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
    
    // 1. IDENTIFY USER (either auth or wallet pass from query param)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const { searchParams } = new URL(request.url)
    const wallet_pass_id = searchParams.get('wallet_pass_id')
    
    // User must be either authenticated OR provide wallet_pass_id
    if ((!user || authError) && !wallet_pass_id) {
      return NextResponse.json(
        { error: 'Unauthorized - no user session or wallet pass ID' },
        { status: 401 }
      )
    }

    // 2. GET USER CONSENT
    // Prefer wallet_pass_id (primary key) over user_id
    let query = supabase
      .from('app_users')
      .select('marketing_push_consent, email_marketing_consent')
    
    if (wallet_pass_id) {
      query = query.eq('wallet_pass_id', wallet_pass_id)
    } else if (user?.id) {
      query = query.eq('user_id', user.id)
    }
    
    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Error fetching consent:', error)
      return NextResponse.json(
        { error: 'Failed to fetch consent preferences' },
        { status: 500 }
      )
    }

    // Return defaults if no row found (user hasn't installed a pass yet)
    return NextResponse.json({
      marketing_push_consent: data?.marketing_push_consent ?? false,
      email_marketing_consent: data?.email_marketing_consent ?? false
    })

  } catch (error: any) {
    console.error('Consent fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
