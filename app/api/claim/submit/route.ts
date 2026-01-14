import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getCityFromHostname } from '@/lib/utils/city-detection'

/**
 * Submit business claim with account creation
 * POST /api/claim/submit
 * Body: FormData with:
 *   email, password, firstName, lastName, businessId, verificationCode, website
 *   editedBusinessName, editedAddress, editedPhone, editedWebsite, editedCategory, editedType, editedDescription, editedHours
 *   logo (File), heroImage (File)
 * 
 * SECURITY: City is derived from hostname (multi-tenant isolation)
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Derive city from hostname (never trust client)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)
    
    const formData = await request.formData()
    
    // Extract required fields
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string
    const firstName = (formData.get('firstName') as string)?.trim()
    const lastName = (formData.get('lastName') as string)?.trim()
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
    const editedTagline = formData.get('editedTagline') as string
    const editedHours = formData.get('editedHours') as string
    
    // Extract image files
    const logoFile = formData.get('logo') as File | null
    const heroImageFile = formData.get('heroImage') as File | null

    // 🔒 SECURITY: Validate image files server-side
    if (logoFile) {
      if (!logoFile.type.startsWith('image/')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Logo must be an image file' 
        }, { status: 400 })
      }
      if (logoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ 
          success: false, 
          error: 'Logo must be less than 5MB' 
        }, { status: 400 })
      }
    }

    if (heroImageFile) {
      if (!heroImageFile.type.startsWith('image/')) {
        return NextResponse.json({ 
          success: false, 
          error: 'Hero image must be an image file' 
        }, { status: 400 })
      }
      if (heroImageFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ 
          success: false, 
          error: 'Hero image must be less than 10MB' 
        }, { status: 400 })
      }
    }

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !businessId || !verificationCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'All fields are required' 
      }, { status: 400 })
    }

    // Validate input lengths
    if (email.length > 255 || firstName.length > 100 || lastName.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Input exceeds maximum length' 
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Verify the code one more time
    const { data: verification, error: verifyError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
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

    // 2. Verify business exists and load city
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

    // 🔒 SECURITY: Enforce city isolation - prevent cross-city claims
    // Normalize both cities (trim + lowercase) to avoid whitespace/case mismatches
    const bizCity = business.city?.trim().toLowerCase()
    const reqCity = requestCity?.trim().toLowerCase()
    
    if (!bizCity || !reqCity || bizCity !== reqCity) {
      console.error(`🚨 SECURITY: Cross-city claim attempt blocked. Business city: ${business.city}, Request city: ${requestCity}`)
      return NextResponse.json({ 
        success: false, 
        error: 'City isolation error' 
      }, { status: 403 })
    }

    // Already checked above, but keep for clarity
    if (business.status !== 'unclaimed') {
      return NextResponse.json({ 
        success: false, 
        error: 'This business is no longer available for claiming' 
      }, { status: 409 })
    }

    // 3. 🔒 SECURITY: Prevent race conditions - claim business atomically
    // CRITICAL: Lock the business BEFORE creating the auth user
    // This prevents creating orphaned users if the claim fails
    const { data: lockedRows, error: lockError } = await supabase
      .from('business_profiles')
      .update({ status: 'pending_claim', updated_at: new Date().toISOString() })
      .eq('id', businessId)
      .eq('status', 'unclaimed') // Conditional update - only if still unclaimed
      .select('id')

    if (lockError) {
      console.error('Business claim lock error:', lockError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to claim business. Please try again.' 
      }, { status: 500 })
    }

    if (!lockedRows || lockedRows.length !== 1) {
      console.error('Business claim race condition: business no longer available')
      return NextResponse.json({ 
        success: false, 
        error: 'This business is no longer available for claiming' 
      }, { status: 409 })
    }

    // 4. Create Supabase Auth user (only after successful lock)
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

    // 5. Upload images to Cloudinary
    // 🔒 SECURITY: Use server-derived folder paths only (never client input)
    let logoUrl: string | null = null
    let heroImageUrl: string | null = null
    
    const { getCloudinaryConfig, getBusinessAssetFolder } = await import('@/lib/cloudinary/config')
    const { uploadUrl, unsignedPreset } = getCloudinaryConfig()
    
    if (logoFile) {
      try {
        const logoFormData = new FormData()
        logoFormData.append('file', logoFile)
        logoFormData.append('upload_preset', unsignedPreset)
        logoFormData.append('folder', getBusinessAssetFolder(business.city, businessId, 'logo'))
        
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
          // Rollback: delete auth user and reset business status
          await supabase.auth.admin.deleteUser(userId)
          await supabase
            .from('business_profiles')
            .update({ status: 'unclaimed', updated_at: new Date().toISOString() })
            .eq('id', businessId)
            .eq('status', 'pending_claim')
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to upload logo. Please try again.' 
          }, { status: 500 })
        }
      } catch (err) {
        console.error('Logo upload exception:', err)
        // Rollback
        await supabase.auth.admin.deleteUser(userId)
        await supabase
          .from('business_profiles')
          .update({ status: 'unclaimed', updated_at: new Date().toISOString() })
          .eq('id', businessId)
          .eq('status', 'pending_claim')
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to upload logo. Please try again.' 
        }, { status: 500 })
      }
    }
    
    if (heroImageFile) {
      try {
        const heroFormData = new FormData()
        heroFormData.append('file', heroImageFile)
        heroFormData.append('upload_preset', unsignedPreset)
        heroFormData.append('folder', getBusinessAssetFolder(business.city, businessId, 'hero'))
        
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
          // Rollback
          await supabase.auth.admin.deleteUser(userId)
          await supabase
            .from('business_profiles')
            .update({ status: 'unclaimed', updated_at: new Date().toISOString() })
            .eq('id', businessId)
            .eq('status', 'pending_claim')
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to upload hero image. Please try again.' 
          }, { status: 500 })
        }
      } catch (err) {
        console.error('Hero image upload exception:', err)
        // Rollback
        await supabase.auth.admin.deleteUser(userId)
        await supabase
          .from('business_profiles')
          .update({ status: 'unclaimed', updated_at: new Date().toISOString() })
          .eq('id', businessId)
          .eq('status', 'pending_claim')
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to upload hero image. Please try again.' 
          }, { status: 500 })
      }
    }

    // 6. Create claim_request record with edited data
    const { data: claimRequest, error: claimError} = await supabase
      .from('claim_requests')
      .insert({
        business_id: businessId,
        user_id: userId,
        city: business.city,
        status: 'pending',
        verification_method: 'email',
        // 🔒 SECURITY/GDPR: Do not store verification_code (already verified)
        submitted_at: new Date().toISOString(),
        business_email: email,
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
        edited_tagline: editedTagline || null,
        edited_hours: editedHours || null,
        logo_upload: logoUrl,
        hero_image_upload: heroImageUrl,
        data_edited: !!(editedBusinessName || editedAddress || editedPhone || editedWebsite || editedCategory || editedType || editedDescription || editedTagline || editedHours)
      })
      .select()
      .single()

    if (claimError) {
      console.error('Error creating claim request:', claimError)
      
      // 🔒 SECURITY: Rollback on failure
      // Delete the auth user we just created
      await supabase.auth.admin.deleteUser(userId)
      
      // Reset business status back to unclaimed (only if still pending_claim)
      await supabase
        .from('business_profiles')
        .update({ status: 'unclaimed', updated_at: new Date().toISOString() })
        .eq('id', businessId)
        .eq('status', 'pending_claim')

      return NextResponse.json({ 
        success: false, 
        error: 'Failed to submit claim. Please try again.' 
      }, { status: 500 })
    }

    // Note: Business status already updated to 'pending_claim' in step 3 (atomic claim)

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
        .eq('city', business.city)
        .single()

      if (franchiseConfig?.resend_api_key && franchiseConfig?.resend_from_email) {
        const { Resend } = await import('resend')
        const { escapeHtml } = await import('@/lib/utils/escape-html')
        const resend = new Resend(franchiseConfig.resend_api_key)

        const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
        const cityDisplayName = franchiseConfig.display_name || business.city
        const foundingMemberOffer = franchiseConfig.founding_member_enabled
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${business.city}.qwikker.com`
        
        // Use Cloudinary URL for logo (publicly accessible in emails)
        const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                        `https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg` // Placeholder - replace with your actual Cloudinary URL

        await resend.emails.send({
          from: `${fromName} <${franchiseConfig.resend_from_email}>`,
          to: email,
          subject: `Claim submitted: ${business.business_name}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0a0a0a; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff;">
                
                <!-- Header with dark background for white logo -->
                <div style="padding: 40px 30px 30px; text-align: center; background-color: #0a0a0a; border-bottom: 1px solid #e5e7eb;">
                  <img 
                    src="${logoUrl}" 
                    alt="QWIKKER" 
                    width="160"
                    style="display: block; height: 32px; width: auto; margin: 0 auto; border: 0;"
                  />
                </div>
                
                <!-- Body -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #0a0a0a; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">
                    Claim submitted
                  </h2>
                  
                  <p style="color: #525252; margin: 0 0 24px 0; font-size: 15px;">
                    Hi ${escapeHtml(firstName)}, we've received your claim for <strong style="color: #0a0a0a;">${escapeHtml(business.business_name)}</strong>.
                  </p>
                  
                  <!-- Status Box -->
                  <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 32px 0;">
                    <p style="color: #525252; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                      What happens next
                    </p>
                    <div style="margin: 12px 0;">
                      <p style="color: #525252; margin: 0 0 8px 0; font-size: 14px;">
                        <strong style="color: #0a0a0a;">1. Review</strong><br>
                        <span style="color: #737373; font-size: 13px;">Our ${escapeHtml(cityDisplayName)} team will verify your ownership (24-48 hours).</span>
                      </p>
                    </div>
                    <div style="margin: 12px 0;">
                      <p style="color: #525252; margin: 0 0 8px 0; font-size: 14px;">
                        <strong style="color: #0a0a0a;">2. Notification</strong><br>
                        <span style="color: #737373; font-size: 13px;">You'll receive an email when approved.</span>
                      </p>
                    </div>
                    <div style="margin: 12px 0;">
                      <p style="color: #525252; margin: 0; font-size: 14px;">
                        <strong style="color: #0a0a0a;">3. Dashboard access</strong><br>
                        <span style="color: #737373; font-size: 13px;">Log in to manage your listing and explore upgrade options.</span>
                      </p>
                    </div>
                  </div>
                  
                  ${foundingMemberOffer ? `
                  <!-- Founding Member Offer -->
                  <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 0 0 32px 0;">
                    <p style="color: #0a0a0a; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                      Founding Member Bonus
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #525252; font-size: 14px;">
                      <li style="margin: 6px 0;"><strong>${franchiseConfig.founding_member_trial_days || 90}-day FREE Featured tier trial</strong></li>
                      <li style="margin: 6px 0;"><strong>${franchiseConfig.founding_member_discount_percent || 20}% OFF FOR LIFE</strong> on annual plans</li>
                      <li style="margin: 6px 0;">Exclusive founding member badge</li>
                    </ul>
                  </div>
                  ` : ''}
                  
                </div>
                
                <!-- Footer -->
                <div style="padding: 30px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #a3a3a3; font-size: 13px; margin: 0;">
                    Questions? Reply to this email or contact us at <a href="mailto:${escapeHtml(franchiseConfig.resend_from_email)}" style="color: #00d083; text-decoration: none;">${escapeHtml(franchiseConfig.resend_from_email)}</a>
                  </p>
                  <p style="color: #a3a3a3; font-size: 13px; margin: 8px 0 0 0;">
                    QWIKKER ${escapeHtml(cityDisplayName)}
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

