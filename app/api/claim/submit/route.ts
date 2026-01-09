import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Submit business claim with account creation
 * POST /api/claim/submit
 * Body: {
 *   email: string,
 *   password: string,
 *   firstName: string,
 *   lastName: string,
 *   businessId: string,
 *   verificationCode: string,
 *   website?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      businessId, 
      verificationCode,
      website 
    } = await request.json()

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !businessId || !verificationCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Verify the code one more time
    const { data: verification, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('type', 'business_claim')
      .eq('code', verificationCode)
      .eq('business_id', businessId)
      .single()

    if (verifyError || !verification) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired verification code' 
      }, { status: 400 })
    }

    // Check if code expired
    if (new Date() > new Date(verification.expires_at)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Verification code has expired' 
      }, { status: 400 })
    }

    // 2. Verify business is still unclaimed
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_name, status, city')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return NextResponse.json({ 
        success: false, 
        error: 'Business not found' 
      }, { status: 404 })
    }

    if (business.status !== 'unclaimed') {
      return NextResponse.json({ 
        success: false, 
        error: 'This business is no longer available for claiming' 
      }, { status: 400 })
    }

    // 3. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm since we verified via code
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: 'business_owner'
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      
      // Check if email already exists
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json({ 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create account. Please try again.' 
      }, { status: 500 })
    }

    const userId = authData.user.id

    // 4. Create claim_request record
    const { data: claimRequest, error: claimError } = await supabase
      .from('claim_requests')
      .insert({
        business_id: businessId,
        user_id: userId,
        status: 'pending',
        verification_method: 'email',
        verification_code: verificationCode,
        submitted_at: new Date().toISOString(),
        website_url: website || null
      })
      .select()
      .single()

    if (claimError) {
      console.error('Error creating claim request:', claimError)
      
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(userId)

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to submit claim. Please try again.' 
      }, { status: 500 })
    }

    // 5. Update business status to pending_claim
    const { error: updateError } = await supabase
      .from('business_profiles')
      .update({
        status: 'pending_claim',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating business status:', updateError)
      // Non-critical - claim is still recorded
    }

    // 6. Delete used verification code
    await supabase
      .from('verification_codes')
      .delete()
      .eq('id', verification.id)

    // 7. Send Slack notification to admin
    try {
      const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
      
      await sendCitySlackNotification({
        title: `✅ New Claim Request: ${business.business_name}`,
        message: `${firstName} ${lastName} has claimed ${business.business_name}!\n\n**Claimer Details:**\n• Name: ${firstName} ${lastName}\n• Email: ${email}\n• Website: ${website || 'Not provided'}\n• Verification: Email verified\n\n🔗 Review claim: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://app.qwikker.com'}/admin?tab=claims`,
        city: business.city || 'bournemouth',
        type: 'business_signup',
        data: { businessName: business.business_name, claimerName: `${firstName} ${lastName}` }
      })
    } catch (slackError) {
      console.error('Slack notification failed (non-critical):', slackError)
    }

    console.log(`✅ Claim submitted: ${business.business_name} by ${firstName} ${lastName}`)

    return NextResponse.json({
      success: true,
      message: 'Claim submitted successfully',
      claimId: claimRequest.id,
      userId: userId
    })

  } catch (error: any) {
    console.error('Submit claim error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

