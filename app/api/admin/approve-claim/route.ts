import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'

export async function POST(request: NextRequest) {
  try {
    const { claimId, action } = await request.json()
    
    if (!claimId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get admin session from cookie
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: 'Invalid admin session' },
        { status: 401 }
      )
    }

    // Verify admin exists and get city from request
    const admin = await getAdminById(adminSession.adminId)
    const hostname = request.headers.get('host') || ''
    const requestCity = await getCityFromHostname(hostname)
    
    if (!admin || !await isAdminForCity(adminSession.adminId, requestCity)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const supabaseAdmin = createAdminClient()
    
    // Get the claim request with all edited data
    const { data: claim, error: claimError } = await supabaseAdmin
      .from('claim_requests')
      .select(`
        *,
        business:business_id (
          id,
          business_name,
          city,
          business_images
        )
      `)
      .eq('id', claimId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    // Verify business is in admin's city
    if (claim.business.city !== requestCity) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    if (action === 'approve') {
      // 🔒 CRITICAL GUARDRAIL: Cannot approve claim without at least 1 uploaded image
      if (!claim.logo_upload_url && !claim.hero_image_upload_url) {
        return NextResponse.json(
          { 
            error: 'Cannot approve claim: Business must upload at least one photo (logo or hero image) before approval.' 
          },
          { status: 400 }
        )
      }

      // 1. Update claim_requests status to 'approved'
      const { error: updateClaimError } = await supabaseAdmin
        .from('claim_requests')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', claimId)

      if (updateClaimError) {
        console.error('Error updating claim request:', updateClaimError)
        return NextResponse.json(
          { error: 'Failed to approve claim' },
          { status: 500 }
        )
      }

      // 2. Update business_profiles with edited data and set status to 'claimed_free'
      const businessUpdate: any = {
        status: 'claimed_free',
        user_id: claim.user_id, // CRITICAL: Set user_id so they can log in!
        owner_user_id: claim.user_id,
        claimed_at: new Date().toISOString(),
        visibility: 'discover_only', // Free tier only visible in discover
        updated_at: new Date().toISOString()
      }
      
      // Add edited data if claimer provided it
      if (claim.data_edited) {
        if (claim.edited_business_name) businessUpdate.business_name = claim.edited_business_name
        if (claim.edited_address) businessUpdate.business_address = claim.edited_address
        if (claim.edited_phone) businessUpdate.phone = claim.edited_phone
        if (claim.edited_website) businessUpdate.website = claim.edited_website
        if (claim.edited_category) businessUpdate.business_category = claim.edited_category
        if (claim.edited_type) businessUpdate.business_type = claim.edited_type
        if (claim.edited_description) businessUpdate.business_description = claim.edited_description
        if (claim.edited_hours) businessUpdate.business_hours = claim.edited_hours
        if (claim.logo_upload) businessUpdate.logo = claim.logo_upload
        if (claim.hero_image_upload) {
          // Add hero image to business_images array
          const existingImages = claim.business.business_images || []
          businessUpdate.business_images = [claim.hero_image_upload, ...existingImages]
        }
      }
      
      const { error: updateBusinessError } = await supabaseAdmin
        .from('business_profiles')
        .update(businessUpdate)
        .eq('id', claim.business_id)

      if (updateBusinessError) {
        console.error('Error updating business:', updateBusinessError)
        return NextResponse.json(
          { error: 'Failed to update business status' },
          { status: 500 }
        )
      }

      // 3. Get the "free" tier ID from subscription_tiers
      const { data: freeTier, error: tierError } = await supabaseAdmin
        .from('subscription_tiers')
        .select('id')
        .eq('tier_name', 'free')
        .single()

      if (tierError || !freeTier) {
        console.error('Free tier not found:', tierError)
        return NextResponse.json(
          { error: 'Free tier not configured. Please run add_free_tier_to_subscription_tiers.sql first.' },
          { status: 500 }
        )
      }

      // 4. Create a subscription entry for the free tier
      const { error: subscriptionError } = await supabaseAdmin
        .from('business_subscriptions')
        .insert({
          user_id: claim.user_id,
          business_id: claim.business_id,
          tier_id: freeTier.id,
          status: 'active',
          is_in_free_trial: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        // Non-critical - continue
      }

      // 5. Send approval email to business owner
      try {
        // Get franchise Resend config
        const { data: franchiseConfig } = await supabaseAdmin
          .from('franchise_crm_configs')
          .select('resend_api_key, resend_from_email, resend_from_name, display_name')
          .eq('city', claim.business.city)
          .single()

        if (franchiseConfig?.resend_api_key && franchiseConfig?.resend_from_email && claim.business_email) {
          const { Resend } = await import('resend')
          const resend = new Resend(franchiseConfig.resend_api_key)

          const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
          const cityDisplayName = franchiseConfig.display_name || claim.business.city
          const loginUrl = `https://${claim.business.city}.qwikker.com/auth/login`

          await resend.emails.send({
            from: `${fromName} <${franchiseConfig.resend_from_email}>`,
            to: claim.business_email,
            subject: `Welcome to QWIKKER ${cityDisplayName}! Your listing is approved`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Claim Approved!</h1>
                  </div>
                  
                  <!-- Body -->
                  <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <p style="font-size: 18px; margin-top: 0;">Hi ${claim.first_name || 'there'},</p>
                    
                    <p>Great news! Your claim for <strong>${claim.business.business_name}</strong> has been approved.</p>
                    
                    <h3 style="color: #1f2937; font-size: 18px; margin-top: 30px;">What's Next?</h3>
                    
                    <div style="background: #f1f5f9; padding: 20px; margin: 20px 0; border-radius: 6px;">
                      <p style="margin: 0 0 15px 0; font-weight: 600;">Your Free Listing Includes:</p>
                      <ul style="margin: 0; padding-left: 20px; color: #475569;">
                        <li>Visible in the ${cityDisplayName} Discover section</li>
                        <li>Basic business profile with contact details</li>
                        <li>Dashboard access to manage your listing</li>
                      </ul>
                    </div>

                    <a href="${loginUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
                      Log In to Your Dashboard
                    </a>

                    <h3 style="color: #1f2937; font-size: 18px; margin-top: 30px;">Want More Features?</h3>
                    <p>Upgrade to unlock:</p>
                    <ul style="color: #475569;">
                      <li><strong>AI Chat Visibility:</strong> Get discovered by users asking our AI assistant</li>
                      <li><strong>Exclusive Offers:</strong> Create and manage special deals</li>
                      <li><strong>Secret Menu:</strong> Add exclusive items for QWIKKER members</li>
                      <li><strong>Events:</strong> Promote your events to locals</li>
                      <li><strong>Analytics:</strong> Track views and engagement</li>
                    </ul>

                    <p style="margin-top: 30px;">You can upgrade anytime from your dashboard.</p>

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      Questions? Reply to this email or contact us at <a href="mailto:${franchiseConfig.resend_from_email}" style="color: #10b981; text-decoration: none;">${franchiseConfig.resend_from_email}</a>
                    </p>
                  </div>
                </body>
              </html>
            `
          })

          console.log(`Approval email sent to ${claim.business_email} for ${claim.business.business_name}`)
        }
      } catch (emailError) {
        console.error('Approval email failed (non-critical):', emailError)
      }

      // 6. Send Slack notification
      try {
        const { sendCitySlackNotification } = await import('@/lib/utils/dynamic-notifications')
        
        await sendCitySlackNotification({
          title: `Claim Approved: ${claim.business.business_name}`,
          message: `Business claim has been approved!\n\n**Business:** ${claim.business.business_name}\n**Status:** Claimed Free (Discover only)\n**Owner:** User ID ${claim.user_id}\n\nThe business is now live in the Discover section.`,
          city: claim.business.city,
          type: 'admin_action',
          data: { businessName: claim.business.business_name, action: 'claim_approved' }
        })
      } catch (slackError) {
        console.error('Slack notification failed (non-critical):', slackError)
      }

      console.log(`Claim approved: ${claim.business.business_name} by admin ${admin.username}`)

      return NextResponse.json({
        success: true,
        message: 'Claim approved and free tier subscription created'
      })
    } 
    
    else if (action === 'deny') {
      // Update claim_requests status to 'denied'
      const { error: updateClaimError } = await supabaseAdmin
        .from('claim_requests')
        .update({
          status: 'denied',
          updated_at: new Date().toISOString()
        })
        .eq('id', claimId)

      if (updateClaimError) {
        console.error('Error denying claim request:', updateClaimError)
        return NextResponse.json(
          { error: 'Failed to deny claim' },
          { status: 500 }
        )
      }

      // Reset business status back to unclaimed
      const { error: updateBusinessError } = await supabaseAdmin
        .from('business_profiles')
        .update({
          status: 'unclaimed',
          updated_at: new Date().toISOString()
        })
        .eq('id', claim.business_id)

      if (updateBusinessError) {
        console.error('Error resetting business:', updateBusinessError)
        // Non-critical - continue
      }

      console.log(`Claim denied: ${claim.business.business_name} by admin ${admin.username}`)

      return NextResponse.json({
        success: true,
        message: 'Claim denied'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

