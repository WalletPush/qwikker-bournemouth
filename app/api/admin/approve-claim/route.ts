import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCityFromHostname } from '@/lib/utils/city-detection'
import { getSystemCategoryFromDisplayLabel, isValidSystemCategory } from '@/lib/constants/system-categories'

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
          business_images,
          email,
          billing_email
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
      if (!claim.logo_upload && !claim.hero_image_upload) {
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
        admin_chat_fallback_approved: true, // Auto-enable AI visibility for claimed businesses
        updated_at: new Date().toISOString()
      }
      
      // ✅ EMAIL HANDLING: Set billing_email from claim, only set public email if currently null
      if (claim.business_email) {
        // Always set billing_email from claim for contact/billing purposes
        if (!claim.business.billing_email) {
          businessUpdate.billing_email = claim.business_email
        }
        
        // Only set public listing email if it's currently null (preserve existing public emails)
        if (!claim.business.email) {
          businessUpdate.email = claim.business_email
        }
      }
      
      // Always apply logo if uploaded (not dependent on data_edited flag)
      if (claim.logo_upload) {
        businessUpdate.logo = claim.logo_upload
      }
      
      // Add edited data if claimer provided it
      if (claim.data_edited) {
        if (claim.edited_business_name) businessUpdate.business_name = claim.edited_business_name
        if (claim.edited_address) businessUpdate.business_address = claim.edited_address
        if (claim.edited_phone) businessUpdate.phone = claim.edited_phone
        if (claim.edited_website) businessUpdate.website = claim.edited_website
        
        // ✅ CATEGORY: Write to system_category + display_category (NEVER business_category)
        if (claim.edited_category) {
          const displayLabel = claim.edited_category.trim()
          const systemCat = getSystemCategoryFromDisplayLabel(displayLabel)
          
          // Only update category if mapping is valid
          if (!systemCat || !isValidSystemCategory(systemCat)) {
            console.warn(`⚠️ Cannot map edited_category: "${displayLabel}" - leaving existing category unchanged`)
            // Do NOT update category fields - keep existing values intact
          } else {
            businessUpdate.display_category = displayLabel
            businessUpdate.system_category = systemCat
            // Sanity check before write
            if (!isValidSystemCategory(businessUpdate.system_category)) {
              throw new Error(`Invalid system_category: "${businessUpdate.system_category}" derived from "${displayLabel}"`)
            }
          }
          // NEVER write business_category (trigger will backfill during Phase 1)
        }
        
        if (claim.edited_type) businessUpdate.business_type = claim.edited_type
        if (claim.edited_description) businessUpdate.business_description = claim.edited_description
        if (claim.edited_tagline) businessUpdate.business_tagline = claim.edited_tagline
        if (claim.edited_hours) businessUpdate.business_hours = claim.edited_hours
      }
      
      // Always apply hero image if uploaded (not dependent on data_edited flag)
      if (claim.hero_image_upload) {
        // Add hero image to business_images array (deduplicate using Set)
        const existing = Array.isArray(claim.business.business_images) ? claim.business.business_images : []
        const nextImages = [claim.hero_image_upload, ...existing].filter(Boolean)
        const deduped = Array.from(new Set(nextImages))
        businessUpdate.business_images = deduped
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

      // 4. Create a subscription entry for the free tier (idempotent)
      // Check if subscription already exists to prevent duplicates
      const { data: existingSubscription } = await supabaseAdmin
        .from('business_subscriptions')
        .select('id')
        .eq('business_id', claim.business_id)
        .eq('tier_id', freeTier.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!existingSubscription) {
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
      } else {
        console.log('Subscription already exists for this business/tier combination - skipping')
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
          const { escapeHtml } = await import('@/lib/utils/escape-html')
          const resend = new Resend(franchiseConfig.resend_api_key)

          const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
          const cityDisplayName = franchiseConfig.display_name || claim.business.city
          
          // 🔒 SECURITY: Use city-specific subdomain (franchise isolation)
          const citySubdomain = claim.business.city.toLowerCase()
          const baseUrl = `https://${citySubdomain}.qwikker.com`
          const loginUrl = `${baseUrl}/auth/login`
          
          // Use Cloudinary URL for logo (publicly accessible in emails)
          const logoUrl = process.env.CLOUDINARY_LOGO_URL || 
                          `https://res.cloudinary.com/demo/image/upload/v1/qwikker-logo.svg` // Placeholder - replace with your actual Cloudinary URL

          await resend.emails.send({
            from: `${fromName} <${franchiseConfig.resend_from_email}>`,
            to: claim.business_email,
            subject: `Your QWIKKER listing is approved`,
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
                    
                    <!-- Success Badge -->
                    <div style="text-align: center; margin: 0 0 24px 0;">
                      <div style="display: inline-block; background: #f0fdf4; border: 1px solid #00d083; border-radius: 8px; padding: 12px 24px;">
                        <span style="color: #00d083; font-size: 14px; font-weight: 600;">Claim approved</span>
                      </div>
                    </div>
                    
                    <h2 style="color: #0a0a0a; margin: 0 0 8px 0; font-size: 24px; font-weight: 600; text-align: center;">
                      Welcome to QWIKKER
                    </h2>
                    
                    <p style="color: #525252; margin: 0 0 32px 0; font-size: 15px; text-align: center;">
                      Hi ${escapeHtml(claim.first_name || 'there')}, your claim for <strong style="color: #0a0a0a;">${escapeHtml(claim.business.business_name)}</strong> has been approved.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 0 0 32px 0;">
                      <a href="${loginUrl}" style="display: inline-block; background: #00d083; color: #0a0a0a; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                        Log in to your dashboard
                      </a>
                    </div>
                    
                    <!-- Free Tier Info -->
                    <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 0 0 32px 0;">
                      <p style="color: #525252; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                        ✓ Your free listing includes
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #525252; font-size: 14px;">
                        <li style="margin: 6px 0;">Visible in the ${escapeHtml(cityDisplayName)} Discover section</li>
                        <li style="margin: 6px 0;">Basic AI chat visibility (text mentions when relevant)</li>
                        <li style="margin: 6px 0;">Basic business profile with contact details and photos</li>
                        <li style="margin: 6px 0;">Up to 5 featured menu items (manually added)</li>
                        <li style="margin: 6px 0;">Create basic offers</li>
                        <li style="margin: 6px 0;">Dashboard access to manage your listing</li>
                      </ul>
                    </div>
                    
                    <!-- Upgrade Info -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
                      <p style="color: #525252; margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">
                        🚀 Upgrade to unlock premium features
                      </p>
                      <ul style="margin: 0; padding-left: 20px; color: #525252; font-size: 14px;">
                        <li style="margin: 6px 0;"><strong style="color: #0a0a0a;">Premium AI Chat Display:</strong> Rich carousel cards with photos (not just text mentions)</li>
                        <li style="margin: 6px 0;"><strong style="color: #0a0a0a;">Full Menu Indexing:</strong> Upload unlimited items via PDF + AI recommends your specific dishes</li>
                        <li style="margin: 6px 0;"><strong style="color: #0a0a0a;">Advanced Analytics:</strong> Track views, engagement, and customer insights</li>
                        <li style="margin: 6px 0;"><strong style="color: #0a0a0a;">Priority Support:</strong> Get faster help when you need it</li>
                      </ul>
                      <p style="color: #737373; margin: 12px 0 0 0; font-size: 13px;">
                        Upgrade anytime from your dashboard.
                      </p>
                    </div>
                    
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

