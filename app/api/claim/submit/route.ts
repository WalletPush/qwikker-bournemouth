import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Submit business claim with account creation
 * POST /api/claim/submit
 * Body: FormData with:
 *   email, password, firstName, lastName, businessId, verificationCode, website
 *   editedBusinessName, editedAddress, editedPhone, editedWebsite, editedCategory, editedType, editedDescription, editedHours
 *   logo (File), heroImage (File)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Extract required fields
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const businessId = formData.get('businessId') as string
    const verificationCode = formData.get('verificationCode') as string
    const website = formData.get('website') as string
    
    // Extract edited business data
    const editedBusinessName = formData.get('editedBusinessName') as string
    const editedAddress = formData.get('editedAddress') as string
    const editedPhone = formData.get('editedPhone') as string
    const editedWebsite = formData.get('editedWebsite') as string
    const editedCategory = formData.get('editedCategory') as string
    const editedType = formData.get('editedType') as string
    const editedDescription = formData.get('editedDescription') as string
    const editedHours = formData.get('editedHours') as string
    
    // Extract image files
    const logoFile = formData.get('logo') as File | null
    const heroImageFile = formData.get('heroImage') as File | null

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

    // 4. Upload images to Cloudinary using unsigned preset (same as existing onboarding flow)
    let logoUrl: string | null = null
    let heroImageUrl: string | null = null
    
    if (logoFile) {
      try {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        logoFormData.append('upload_preset', 'unsigned_qwikker')
        logoFormData.append('folder', `business_logos/${businessId}`)
        
        const uploadUrl = 'https://api.cloudinary.com/v1_1/dsh32kke7/image/upload'
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: logoFormData
        })
        
        if (response.ok) {
          const uploadData = await response.json()
          logoUrl = uploadData.secure_url
          console.log('✅ Logo uploaded to Cloudinary:', logoUrl)
        } else {
          console.error('Logo upload failed:', await response.text())
        }
      } catch (err) {
        console.error('Logo upload exception:', err)
      }
    }
    
    if (heroImageFile) {
      try {
        const heroFormData = new FormData()
        heroFormData.append('file', heroImageFile)
        heroFormData.append('upload_preset', 'unsigned_qwikker')
        heroFormData.append('folder', `business_heroes/${businessId}`)
        
        const uploadUrl = 'https://api.cloudinary.com/v1_1/dsh32kke7/image/upload'
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: heroFormData
        })
        
        if (response.ok) {
          const uploadData = await response.json()
          heroImageUrl = uploadData.secure_url
          console.log('✅ Hero image uploaded to Cloudinary:', heroImageUrl)
        } else {
          console.error('Hero image upload failed:', await response.text())
        }
      } catch (err) {
        console.error('Hero image upload exception:', err)
      }
    }

    // 5. Create claim_request record with edited data
    const { data: claimRequest, error: claimError} = await supabase
      .from('claim_requests')
      .insert({
        business_id: businessId,
        user_id: userId,
        city: business.city || 'bournemouth',
        status: 'pending',
        verification_method: 'email',
        verification_code: verificationCode,
        submitted_at: new Date().toISOString(),
        business_email: email.toLowerCase(),
        business_website: website || null,
        first_name: firstName,
        last_name: lastName,
        // Edited business data
        edited_business_name: editedBusinessName || null,
        edited_address: editedAddress || null,
        edited_phone: editedPhone || null,
        edited_website: editedWebsite || null,
        edited_category: editedCategory || null,
        edited_type: editedType || null,
        edited_description: editedDescription || null,
        edited_hours: editedHours || null,
        logo_upload: logoUrl,
        hero_image_upload: heroImageUrl,
        data_edited: !!(editedBusinessName || editedAddress || editedPhone || editedWebsite || editedCategory || editedType || editedDescription || editedHours)
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

    // 6. Update business status to pending_claim
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

    // 7. Delete used verification code
    await supabase
      .from('verification_codes')
      .delete()
      .eq('id', verification.id)

    // 8. Send confirmation email to claimer
    try {
      // Get franchise config for Resend settings
      const { data: franchiseConfig } = await supabase
        .from('franchise_crm_configs')
        .select('resend_api_key, resend_from_email, resend_from_name, display_name, founding_member_enabled, founding_member_trial_days, founding_member_discount_percent')
        .eq('city', business.city || 'bournemouth')
        .single()

      if (franchiseConfig?.resend_api_key && franchiseConfig?.resend_from_email) {
        const { Resend } = await import('resend')
        const resend = new Resend(franchiseConfig.resend_api_key)

        const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
        const cityDisplayName = franchiseConfig.display_name || business.city
        const foundingMemberOffer = franchiseConfig.founding_member_enabled

        await resend.emails.send({
          from: `${fromName} <${franchiseConfig.resend_from_email}>`,
          to: email,
          subject: `✅ Claim Submitted for ${business.business_name}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">✅ Claim Submitted!</h1>
                </div>
                
                <!-- Body -->
                <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <p style="font-size: 18px; margin-top: 0;">Hi ${firstName},</p>
                  
                  <p>Thank you for claiming <strong>${business.business_name}</strong> on QWIKKER ${cityDisplayName}!</p>
                  
                  <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 25px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #0369a1;"><strong>📧 Confirmation sent to:</strong> ${email}</p>
                  </div>

                  <h2 style="color: #1f2937; font-size: 20px; margin-top: 30px;">What Happens Next?</h2>
                  
                  <div style="margin: 20px 0;">
                    <div style="display: flex; align-items: start; margin: 15px 0;">
                      <span style="display: inline-block; width: 30px; height: 30px; background: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 15px; flex-shrink: 0;">1</span>
                      <div>
                        <strong>Review (24-48 hours)</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">Our ${cityDisplayName} team will verify your business ownership and details.</span>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: start; margin: 15px 0;">
                      <span style="display: inline-block; width: 30px; height: 30px; background: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 15px; flex-shrink: 0;">2</span>
                      <div>
                        <strong>Approval Notification</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">You'll receive an email when your claim is approved.</span>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: start; margin: 15px 0;">
                      <span style="display: inline-block; width: 30px; height: 30px; background: #667eea; color: white; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 15px; flex-shrink: 0;">3</span>
                      <div>
                        <strong>Dashboard Access</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">Log in to manage your listing, add photos, and update your profile.</span>
                      </div>
                    </div>
                  </div>

                  ${foundingMemberOffer ? `
                  <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h3 style="color: white; margin: 0 0 10px 0; font-size: 18px;">🎉 Founding Member Bonus</h3>
                    <p style="color: white; margin: 0; font-size: 14px;">
                      Once approved, you'll unlock:<br>
                      • <strong>${franchiseConfig.founding_member_trial_days || 90}-day FREE Featured tier trial</strong><br>
                      • <strong>${franchiseConfig.founding_member_discount_percent || 20}% OFF FOR LIFE</strong> on annual plans<br>
                      • Exclusive founding member badge
                    </p>
                  </div>
                  ` : ''}

                  <h2 style="color: #1f2937; font-size: 20px; margin-top: 30px;">Need Help?</h2>
                  <p style="color: #6b7280;">If you have any questions about your claim, contact us at <a href="mailto:${franchiseConfig.resend_from_email}" style="color: #667eea; text-decoration: none;">${franchiseConfig.resend_from_email}</a></p>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                    You're receiving this email because you claimed a business listing on QWIKKER ${cityDisplayName}.
                  </p>
                </div>
              </body>
            </html>
          `
        })

        console.log(`✅ Confirmation email sent to ${email} for ${business.business_name}`)
      }
    } catch (emailError) {
      console.error('Confirmation email failed (non-critical):', emailError)
      // Don't fail the claim if email fails
    }

    // 9. Send Slack notification to admin
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

