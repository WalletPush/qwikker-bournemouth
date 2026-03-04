import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminById, isAdminForCity } from '@/lib/utils/admin-auth'

export async function DELETE(request: NextRequest) {
  try {
    // 🔒 SECURITY: Require admin authentication
    const cookieStore = await cookies()
    const adminSessionCookie = cookieStore.get('qwikker_admin_session')

    if (!adminSessionCookie?.value) {
      return NextResponse.json({
        success: false,
        error: 'Admin authentication required'
      }, { status: 401 })
    }

    let adminSession
    try {
      adminSession = JSON.parse(adminSessionCookie.value)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid admin session'
      }, { status: 401 })
    }

    const { businessId } = await request.json()

    if (!businessId) {
      return NextResponse.json({
        success: false,
        error: 'Business ID is required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 🔒 SECURITY: Get business to verify city access
    const { data: business, error: fetchError } = await supabase
      .from('business_profiles')
      .select('id, business_name, city, email, first_name')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 })
    }

    // 🔒 SECURITY: Verify admin has access to this city
    const admin = await getAdminById(adminSession.adminId)
    if (!admin || !(await isAdminForCity(adminSession.adminId, business.city))) {
      return NextResponse.json({
        success: false,
        error: `You don't have admin access to ${business.city}`
      }, { status: 403 })
    }

    console.log(`🗑️ Admin ${admin.email} deleting business: ${business.business_name} (${businessId})`)

    // 🗑️ DELETE CASCADE: Delete all related data
    // Note: Some deletions may be handled by database CASCADE constraints
    // But we'll explicitly delete to ensure cleanup

    // 1. Delete offers
    const { error: offersError } = await supabase
      .from('offers')
      .delete()
      .eq('business_id', businessId)

    if (offersError) {
      console.error('Error deleting offers:', offersError)
    }

    // 2. Delete menus
    const { error: menusError } = await supabase
      .from('menus')
      .delete()
      .eq('business_id', businessId)

    if (menusError) {
      console.error('Error deleting menus:', menusError)
    }

    // 3. Delete subscription records
    const { error: subsError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('business_id', businessId)

    if (subsError) {
      console.error('Error deleting subscriptions:', subsError)
    }

    // 4. Delete claim requests
    const { error: claimsError } = await supabase
      .from('claim_requests')
      .delete()
      .eq('business_id', businessId)

    if (claimsError) {
      console.error('Error deleting claim requests:', claimsError)
    }

    // 5. Delete user_offer_claims (if any)
    const { error: userClaimsError } = await supabase
      .from('user_offer_claims')
      .delete()
      .eq('offer_id', supabase
        .from('offers')
        .select('id')
        .eq('business_id', businessId)
      )

    if (userClaimsError) {
      console.error('Error deleting user offer claims:', userClaimsError)
    }

    // 6. Finally, delete the business profile
    const { error: deleteError } = await supabase
      .from('business_profiles')
      .delete()
      .eq('id', businessId)

    if (deleteError) {
      console.error('Error deleting business profile:', deleteError)
      return NextResponse.json({
        success: false,
        error: `Failed to delete business: ${deleteError.message}`
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted business: ${business.business_name}`)

    // Send notification email using the franchise's own Resend credentials
    if (business.email && business.city) {
      try {
        const { data: franchiseConfig } = await supabase
          .from('franchise_crm_configs')
          .select('resend_api_key, resend_from_email, resend_from_name, display_name')
          .eq('city', business.city)
          .single()

        if (franchiseConfig?.resend_api_key && franchiseConfig?.resend_from_email) {
          const { Resend } = await import('resend')
          const franchiseResend = new Resend(franchiseConfig.resend_api_key)

          const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
          const cityDisplayName = franchiseConfig.display_name || business.city.charAt(0).toUpperCase() + business.city.slice(1)
          const citySubdomain = business.city.toLowerCase()
          const signupUrl = `https://${citySubdomain}.qwikker.com/onboarding`
          const firstName = business.first_name || 'there'

          franchiseResend.emails.send({
            from: `${fromName} <${franchiseConfig.resend_from_email}>`,
            to: business.email,
            replyTo: franchiseConfig.resend_from_email,
            subject: `Your Qwikker listing for ${business.business_name} has been removed`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e293b;">Hi ${firstName},</h2>
                <p style="color: #475569; line-height: 1.6;">
                  We're writing to let you know that your business listing for <strong>${business.business_name}</strong> on Qwikker ${cityDisplayName} has been removed because the profile was not completed.
                </p>
                <p style="color: #475569; line-height: 1.6;">
                  If you'd like to get your business on Qwikker, you're welcome to sign up again and complete your profile:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signupUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00d083, #00b86f); color: #000; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">
                    Sign Up Again
                  </a>
                </div>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
                  If you have any questions, just reply to this email and our team will be happy to help.
                </p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="color: #94a3b8; font-size: 12px;">QWIKKER ${cityDisplayName} — Your city, curated.</p>
              </div>
            `
          }).catch(err => console.error('Failed to send deletion notification:', err))
        } else {
          console.warn(`⚠️ No Resend config for ${business.city} — skipping deletion email`)
        }
      } catch (emailErr) {
        console.error('Error preparing deletion notification:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Business "${business.business_name}" has been permanently deleted`
    })

  } catch (error: any) {
    console.error('Delete business error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete business'
    }, { status: 500 })
  }
}
