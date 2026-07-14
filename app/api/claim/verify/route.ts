import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Verify email code for claim
 * POST /api/claim/verify
 * Body: { email: string, code: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email and code are required' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check verification code
    const { data: verification, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', 'business_claim')
      .eq('code', code)
      .single()

    if (error || !verification) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid verification code' 
      }, { status: 400 })
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(verification.expires_at)
    
    if (now > expiresAt) {
      // Delete expired code
      await supabase
        .from('verification_codes')
        .delete()
        .eq('id', verification.id)

      return NextResponse.json({ 
        success: false, 
        error: 'Verification code has expired. Please request a new one.' 
      }, { status: 400 })
    }

    // Ownership is now proven. Give a fresh completion window so a legitimate but
    // slow user (filling business details, account, uploads) isn't rejected at the
    // final submit step. Truly abandoned/never-verified codes still die at 15 min;
    // submit re-checks this (extended) expiry, so expired codes are still blocked.
    const completionWindow = new Date(Date.now() + 20 * 60 * 1000) // 20 minutes to finish
    await supabase
      .from('verification_codes')
      .update({ expires_at: completionWindow.toISOString() })
      .eq('id', verification.id)

    // Code is valid
    return NextResponse.json({
      success: true,
      message: 'Code verified successfully',
      businessId: verification.business_id
    })

  } catch (error: any) {
    console.error('Verify code error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

